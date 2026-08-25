import { db, companiesTable, contactsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

/**
 * Free website-scan enrichment.
 *
 * No API key, no per-record cost: given a company's domain we fetch its homepage
 * (and, if needed, a /contact page) and harvest the social links + office phone
 * the company publishes on its own site. This is the "email -> website ->
 * socials & phone" leg of the enrichment cascade and is the ONLY reliable source
 * for Instagram / YouTube / TikTok, which the B2B data providers (Apollo, PDL)
 * do not carry.
 *
 * Guardrails:
 *  - Best-effort by design: a network error, block, or missing tag yields nulls,
 *    never an exception that aborts the surrounding enrich flow.
 *  - We NEVER fabricate: a field stays null unless the site actually links it.
 *  - We NEVER overwrite a value a paid provider already wrote — the caller only
 *    fills columns that are currently empty.
 */

export interface CompanyWebPresence {
  website: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  youtubeUrl: string | null;
  tiktokUrl: string | null;
}

const EMPTY_PRESENCE: CompanyWebPresence = {
  website: null,
  phone: null,
  linkedinUrl: null,
  twitterUrl: null,
  facebookUrl: null,
  instagramUrl: null,
  youtubeUrl: null,
  tiktokUrl: null,
};

const FETCH_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 1_500_000; // ~1.5 MB is plenty for a homepage; bound memory.

/** Turn a bare domain or partial URL into a normalized https origin URL. */
function toUrl(domainOrUrl: string, path = ""): string | null {
  const raw = (domainOrUrl || "").trim();
  if (!raw) return null;
  let candidate = raw;
  if (!/^https?:\/\//i.test(candidate)) candidate = `https://${candidate}`;
  try {
    const u = new URL(candidate);
    // Reject obvious non-hosts (e.g. "company" with no dot).
    if (!u.hostname.includes(".")) return null;
    u.pathname = path || u.pathname;
    u.search = "";
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

/** Fetch a page as text with a hard timeout + size cap. Never throws. */
async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        // A real UA reduces naive bot-blocks; we still respect failures silently.
        "User-Agent":
          "Mozilla/5.0 (compatible; PMG-OS-Enrichment/1.0; +https://pmggroup-llc.com/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(ct)) return null;
    const buf = await res.arrayBuffer();
    const bytes = buf.byteLength > MAX_HTML_BYTES ? buf.slice(0, MAX_HTML_BYTES) : buf;
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch {
    return null; // timeout, DNS failure, cert error, abort — all best-effort.
  } finally {
    clearTimeout(timer);
  }
}

/** All candidate links in a page: href/src attribute values + bare URLs in text. */
function extractCandidateUrls(html: string): string[] {
  const out: string[] = [];
  const attr = /(?:href|src|content)\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = attr.exec(html)) !== null) out.push(m[1]);
  const bare = /https?:\/\/[^\s"'<>)]+/gi;
  while ((m = bare.exec(html)) !== null) out.push(m[0]);
  return out;
}

/** Reject share/intent/plugin widgets that aren't the company's own profile. */
const SHARE_URL_RE =
  /\/(sharer|share|intent|dialog|plugins|shareArticle|share-offsite|widgets?|embed|oembed|login|signup|help|about\/|policies|tos|privacy)/i;

interface SocialMatcher {
  key: keyof Pick<
    CompanyWebPresence,
    "linkedinUrl" | "twitterUrl" | "facebookUrl" | "instagramUrl" | "youtubeUrl" | "tiktokUrl"
  >;
  hostRe: RegExp;
  /** Path must look like a real profile (not a bare platform link / share). */
  valid: (u: URL) => boolean;
}

const NON_PROFILE_SEGMENTS = new Set([
  "",
  "home",
  "share",
  "sharer",
  "intent",
  "hashtag",
  "explore",
  "search",
  "watch",
  "results",
  "feed",
  "login",
  "signup",
  "tv",
  "embed",
]);

const SOCIAL_MATCHERS: SocialMatcher[] = [
  {
    key: "linkedinUrl",
    hostRe: /(^|\.)linkedin\.com$/i,
    valid: (u) => /\/(company|in|school|showcase)\/[^/]+/i.test(u.pathname),
  },
  {
    key: "twitterUrl",
    hostRe: /(^|\.)(twitter|x)\.com$/i,
    valid: (u) => {
      const seg = u.pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
      return seg.length > 0 && !NON_PROFILE_SEGMENTS.has(seg) && !/^i$/.test(seg);
    },
  },
  {
    key: "facebookUrl",
    hostRe: /(^|\.)facebook\.com$/i,
    valid: (u) => {
      const seg = u.pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
      if (seg === "pages") return /\/pages\/[^/]+\/\d+/i.test(u.pathname);
      return seg.length > 0 && !NON_PROFILE_SEGMENTS.has(seg);
    },
  },
  {
    key: "instagramUrl",
    hostRe: /(^|\.)instagram\.com$/i,
    valid: (u) => {
      const seg = u.pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
      return seg.length > 0 && !NON_PROFILE_SEGMENTS.has(seg) && seg !== "p" && seg !== "reel";
    },
  },
  {
    key: "youtubeUrl",
    hostRe: /(^|\.)(youtube\.com|youtu\.be)$/i,
    valid: (u) => {
      if (/youtu\.be$/i.test(u.hostname)) return false; // that's a video, not a channel
      return /\/(channel|c|user)\/[^/]+/i.test(u.pathname) || u.pathname.startsWith("/@");
    },
  },
  {
    key: "tiktokUrl",
    hostRe: /(^|\.)tiktok\.com$/i,
    valid: (u) => /\/@[^/]+/i.test(u.pathname),
  },
];

/** Canonical profile URL: scheme+host+path, no query/hash/trailing slash. */
function canonical(u: URL): string {
  const path = u.pathname.replace(/\/+$/, "") || "";
  return `https://${u.hostname.replace(/^www\./i, "")}${path}`;
}

/** First tel: link on the page → a phone number (high precision, no guessing). */
function extractPhone(urls: string[]): string | null {
  for (const raw of urls) {
    const m = /^tel:(.+)$/i.exec(raw.trim());
    if (!m) continue;
    const cleaned = decodeURIComponent(m[1]).replace(/[^\d+]/g, "");
    const digits = cleaned.replace(/\D/g, "");
    if (digits.length >= 7 && digits.length <= 15) return cleaned;
  }
  return null;
}

/** Classify all candidate links into the social/phone buckets. */
function classify(urls: string[]): Omit<CompanyWebPresence, "website"> {
  const found: Omit<CompanyWebPresence, "website"> = {
    phone: extractPhone(urls),
    linkedinUrl: null,
    twitterUrl: null,
    facebookUrl: null,
    instagramUrl: null,
    youtubeUrl: null,
    tiktokUrl: null,
  };
  for (const raw of urls) {
    const s = raw.trim();
    if (!/^https?:\/\//i.test(s)) continue;
    if (SHARE_URL_RE.test(s)) continue;
    let u: URL;
    try {
      u = new URL(s);
    } catch {
      continue;
    }
    for (const matcher of SOCIAL_MATCHERS) {
      if (found[matcher.key]) continue; // keep the first valid hit
      if (!matcher.hostRe.test(u.hostname)) continue;
      if (!matcher.valid(u)) continue;
      found[matcher.key] = canonical(u);
    }
  }
  return found;
}

/**
 * Scan a company's website for its public social links + office phone.
 * Fetches the homepage, and falls back to /contact only if the homepage yields
 * neither a phone nor any social link. Always resolves (never throws).
 */
export async function scrapeCompanyWebPresence(domainOrUrl: string): Promise<CompanyWebPresence> {
  const home = toUrl(domainOrUrl);
  if (!home) return { ...EMPTY_PRESENCE };

  const website = canonicalWebsite(home);
  let html = await fetchHtml(home);
  let result: Omit<CompanyWebPresence, "website"> = html
    ? classify(extractCandidateUrls(html))
    : {
        phone: null,
        linkedinUrl: null,
        twitterUrl: null,
        facebookUrl: null,
        instagramUrl: null,
        youtubeUrl: null,
        tiktokUrl: null,
      };

  const nothingFound = (r: Omit<CompanyWebPresence, "website">) =>
    !r.phone && !r.linkedinUrl && !r.twitterUrl && !r.facebookUrl && !r.instagramUrl && !r.youtubeUrl && !r.tiktokUrl;

  if (nothingFound(result)) {
    const contact = toUrl(domainOrUrl, "/contact");
    if (contact && contact !== home) {
      html = await fetchHtml(contact);
      if (html) result = classify(extractCandidateUrls(html));
    }
  }

  return { website, ...result };
}

/** Website URL as we store it: bare host (matches how companies.website is set). */
function canonicalWebsite(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// DB integration — enrich company rows in place (fill-empty-only)
// ---------------------------------------------------------------------------

export interface CompanyWebEnrichResult {
  companyId: number;
  scanned: boolean;
  /** Column names newly filled by this scan (were null/empty before). */
  filled: string[];
}

const SOCIAL_COLUMNS = [
  "phone",
  "linkedinUrl",
  "twitterUrl",
  "facebookUrl",
  "instagramUrl",
  "youtubeUrl",
  "tiktokUrl",
] as const;

/**
 * Scan one company and persist any newly-found channels. Only fills columns that
 * are currently empty, so a verified value from a paid provider is never clobbered
 * by a best-effort scrape.
 */
export async function enrichCompanyFromWebsite(companyId: number): Promise<CompanyWebEnrichResult> {
  const [company] = await db
    .select({
      id: companiesTable.id,
      website: companiesTable.website,
      phone: companiesTable.phone,
      linkedinUrl: companiesTable.linkedinUrl,
      twitterUrl: companiesTable.twitterUrl,
      facebookUrl: companiesTable.facebookUrl,
      instagramUrl: companiesTable.instagramUrl,
      youtubeUrl: companiesTable.youtubeUrl,
      tiktokUrl: companiesTable.tiktokUrl,
      enrichmentSources: companiesTable.enrichmentSources,
    })
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId));

  if (!company || !company.website) {
    return { companyId, scanned: false, filled: [] };
  }

  // Skip the network fetch entirely when every target column is already filled —
  // re-enriching an already-complete company costs nothing and hits no site.
  const anyMissing = SOCIAL_COLUMNS.some((col) => !(company as Record<string, unknown>)[col]);
  if (!anyMissing) {
    return { companyId, scanned: false, filled: [] };
  }

  const presence = await scrapeCompanyWebPresence(company.website);
  const update: Record<string, string> = {};
  const filled: string[] = [];
  for (const col of SOCIAL_COLUMNS) {
    const existing = (company as Record<string, unknown>)[col];
    const scanned = presence[col];
    if (!existing && scanned) {
      update[col] = scanned;
      filled.push(col);
    }
  }

  if (filled.length > 0) {
    // Tag each newly-filled field with the "website" source for provenance.
    const sources = { ...(company.enrichmentSources ?? {}) };
    for (const col of filled) sources[col] = "website";
    await db
      .update(companiesTable)
      .set({ ...update, lastSyncedAt: new Date(), enrichmentSources: sources })
      .where(eq(companiesTable.id, companyId));
  }

  return { companyId, scanned: true, filled };
}

/** Resolve the distinct companies behind a set of contacts and web-enrich each. */
export async function enrichCompaniesForContacts(contactIds: number[]): Promise<CompanyWebEnrichResult[]> {
  const ids = [...new Set(contactIds)].filter((n) => Number.isFinite(n));
  if (ids.length === 0) return [];

  const rows = await db
    .select({ companyId: contactsTable.companyId })
    .from(contactsTable)
    .where(inArray(contactsTable.id, ids));

  const companyIds = [...new Set(rows.map((r) => r.companyId).filter((n): n is number => Number.isFinite(n as number)))];
  const results: CompanyWebEnrichResult[] = [];
  for (const companyId of companyIds) {
    results.push(await enrichCompanyFromWebsite(companyId));
  }
  return results;
}
