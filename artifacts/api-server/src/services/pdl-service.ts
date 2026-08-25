import { db, integrationsTable, syncLogsTable, contactsTable, companiesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";

/**
 * People Data Labs (PDL) — paid all-in-one enrichment provider.
 *
 * Connection-gated exactly like Apollo: the key lives in the `integrations` row
 * (provider "pdl"). No key connected → this whole layer is a no-op (0 lookups,
 * 0 cost), and the enrich cascade falls back to Apollo + the free website scan.
 * The moment a key is pasted in Settings, PDL activates.
 *
 * PDL Person Enrichment (`GET /v5/person/enrich`, header `X-Api-Key`) returns, in
 * ONE lookup: verified work/personal email, mobile + other phones, the person's
 * LinkedIn/Twitter, and the employer's website + LinkedIn/Twitter/Facebook. It
 * does NOT carry Instagram/YouTube/TikTok — those still come from the website
 * scan. PDL charges ~1 credit only on a successful match (a 404 "not found" is
 * free), so the connection test below costs nothing.
 *
 * Docs verified against api.peopledatalabs.com v5 (2026). Never fabricate: a
 * field stays null unless PDL actually returns it.
 */

export const PDL_PROVIDER = "pdl";

const PDL_BASE = "https://api.peopledatalabs.com/v5";
const PDL_ENRICH = "/person/enrich";

const MIN_REQUEST_INTERVAL_MS = 350; // PDL allows higher throughput than Apollo.
const CREDIT_LOG_ENTITY = "pdl_credits";

export type PdlMode = "live" | "off";

export class PdlError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "PdlError";
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Credentials / connection state
// ---------------------------------------------------------------------------

export async function getPdlIntegration() {
  const [row] = await db.select().from(integrationsTable).where(eq(integrationsTable.provider, PDL_PROVIDER));
  return row ?? null;
}

export async function getPdlApiKey(): Promise<string | null> {
  const row = await getPdlIntegration();
  if (!row || !row.isActive || row.status !== "connected") return null;
  const creds = row.credentials as { apiKey?: string } | null;
  return creds?.apiKey?.trim() || null;
}

export async function getPdlMode(): Promise<PdlMode> {
  return (await getPdlApiKey()) ? "live" : "off";
}

// ---------------------------------------------------------------------------
// Request helper (throttle + error mapping)
// ---------------------------------------------------------------------------

let lastRequestAt = 0;
async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

function mapPdlError(status: number, body: string): PdlError {
  const snippet = body.slice(0, 300);
  switch (status) {
    case 401:
      return new PdlError("PDL rejected the API key (401). Verify the key in Settings → API Keys.", 401, "invalid_key");
    case 402:
      return new PdlError("PDL reports insufficient credits (402). Top up your PDL plan.", 402, "insufficient_credits");
    case 403:
      return new PdlError("PDL denied access (403). Your plan may not include this endpoint.", 403, "forbidden");
    case 429:
      return new PdlError("PDL rate limit exceeded (429). Try again shortly.", 429, "rate_limited");
    default:
      return new PdlError(`PDL request failed (${status}): ${snippet}`, status, "pdl_error");
  }
}

async function pdlGet<T>(path: string, params: Record<string, string>, apiKey: string): Promise<{ status: number; data: T | null }> {
  await throttle();
  const url = new URL(PDL_BASE + path);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  let res: Response;
  try {
    res = await fetch(url.toString(), { headers: { "X-Api-Key": apiKey, Accept: "application/json" } });
  } catch (err: any) {
    throw new PdlError(`Network error contacting PDL: ${err?.message ?? "unknown"}`, 0, "network_error");
  }
  // 404 = no match found (not an error, and not charged). Return null data.
  if (res.status === 404) return { status: 404, data: null };
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw mapPdlError(res.status, text);
  }
  return { status: res.status, data: (await res.json()) as T };
}

// ---------------------------------------------------------------------------
// Normalized person shape (stable regardless of PDL's raw schema)
// ---------------------------------------------------------------------------

export interface NormalizedPdlPerson {
  email: string | null;
  phone: string | null;
  personLinkedin: string | null;
  personTwitter: string | null;
  companyWebsite: string | null;
  companyLinkedin: string | null;
  companyTwitter: string | null;
  companyFacebook: string | null;
  /** PDL returned a boolean flag (data exists but the plan doesn't unlock it)
   *  for emails / phones. Signals a PLAN limit, not "no data" — surfaced so the
   *  user knows a PII/contact-data plan is required to actually get these. */
  emailLocked: boolean;
  phoneLocked: boolean;
}

// PDL returns fields your plan can't access as BOOLEAN flags (true = "we have
// it, upgrade to unlock"; false = "we don't have it") instead of the real value.
// So every field must be coerced defensively — treating a boolean as a string or
// array is what crashed the enrich after PDL had already billed the credit.
type Raw = Record<string, unknown>;

function asStr(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}
function asArr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
/** True when PDL sent the "exists but plan-locked" boolean flag for a field. */
function isLocked(v: unknown): boolean {
  return v === true;
}

function withScheme(url: unknown): string | null {
  const s = asStr(url);
  if (!s) return null;
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

function firstEmail(d: Raw): string | null {
  const work = asStr(d.work_email);
  if (work && work.includes("@")) return work;
  for (const e of asArr(d.emails)) {
    const addr = typeof e === "string" ? asStr(e) : asStr((e as Raw | null)?.address);
    if (addr && addr.includes("@")) return addr;
  }
  for (const e of asArr(d.personal_emails)) {
    const s = asStr(e);
    if (s && s.includes("@")) return s;
  }
  return null;
}

function firstPhone(d: Raw): string | null {
  const mobile = asStr(d.mobile_phone);
  if (mobile) return mobile;
  for (const p of asArr(d.phone_numbers)) {
    const s = asStr(p);
    if (s) return s;
  }
  return null;
}

function normalizePdl(d: Raw): NormalizedPdlPerson {
  const site = asStr(d.job_company_website);
  return {
    email: firstEmail(d),
    phone: firstPhone(d),
    personLinkedin: withScheme(d.linkedin_url),
    personTwitter: withScheme(d.twitter_url),
    companyWebsite: site ? site.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : null,
    companyLinkedin: withScheme(d.job_company_linkedin_url),
    companyTwitter: withScheme(d.job_company_twitter_url),
    companyFacebook: withScheme(d.job_company_facebook_url),
    emailLocked: isLocked(d.work_email) || isLocked(d.emails) || isLocked(d.personal_emails),
    phoneLocked: isLocked(d.mobile_phone) || isLocked(d.phone_numbers),
  };
}

export interface PdlEnrichInput {
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  /** Company domain — sharpens the match. */
  website?: string | null;
  /** Person LinkedIn URL — PDL's strongest single matching signal. */
  linkedinUrl?: string | null;
  email?: string | null;
}

/** Build PDL match params. Returns null when we lack the minimum signal PDL
 *  needs (a profile/email, or a name + company) — so we never burn a request
 *  that can't match. */
function buildParams(input: PdlEnrichInput): Record<string, string> | null {
  const params: Record<string, string> = { min_likelihood: "6", titlecase: "true" };
  const name = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  const hasProfile = !!(input.linkedinUrl || input.email);
  const hasNameCompany = !!(name && (input.companyName || input.website));
  if (!hasProfile && !hasNameCompany) return null;
  if (input.linkedinUrl) params.profile = input.linkedinUrl;
  if (input.email) params.email = input.email;
  if (name) params.name = name;
  if (input.companyName) params.company = input.companyName;
  if (input.website) params.company = params.company || input.website; // domain works too
  return params;
}

/** Enrich one person. Returns null when PDL has no confident match (free) or
 *  when we lack minimum inputs. Throws PdlError only on real API failures. */
export async function enrichPersonPDL(input: PdlEnrichInput): Promise<NormalizedPdlPerson | null> {
  const apiKey = await getPdlApiKey();
  if (!apiKey) return null;
  const params = buildParams(input);
  if (!params) return null;
  const { data } = await pdlGet<{ status?: number; likelihood?: number; data?: Raw }>(PDL_ENRICH, params, apiKey);
  if (!data || !data.data) return null;
  return normalizePdl(data.data);
}

// ---------------------------------------------------------------------------
// Credit accounting (durable in sync_logs, mirrors Apollo)
// ---------------------------------------------------------------------------

async function recordPdlCredits(creditsSpent: number, detail?: Record<string, unknown>): Promise<void> {
  if (!Number.isFinite(creditsSpent) || creditsSpent <= 0) return;
  await db.insert(syncLogsTable).values({
    integrationId: PDL_PROVIDER,
    direction: "outbound",
    entityType: CREDIT_LOG_ENTITY,
    status: "completed",
    payload: { creditsSpent, action: "enrich", ...(detail ?? {}) },
  });
}

// ---------------------------------------------------------------------------
// Contact enrichment — fill missing person + company fields (fill-empty-only)
// ---------------------------------------------------------------------------

export interface PdlEnrichResult {
  mode: PdlMode;
  matched: number;
  creditsSpent: number;
  /** Total contact+company fields newly filled. */
  fieldsFilled: number;
  /** PDL matched people but your PLAN returned emails only as locked flags. */
  emailLocked: boolean;
  /** Same for phone numbers — data exists at PDL but the plan doesn't unlock it. */
  phoneLocked: boolean;
  /** Per-contact errors (never thrown — collected so failures are visible). */
  errors: string[];
}

const SOURCE = "pdl";

/** Merge new field→source entries onto an existing provenance map. */
function withSources(existing: Record<string, string> | null | undefined, fields: string[]): Record<string, string> {
  const out = { ...(existing ?? {}) };
  for (const f of fields) out[f] = SOURCE;
  return out;
}

/**
 * Enrich a set of contacts via PDL. For each contact still missing an email,
 * phone, or social, we run one PDL lookup and fill only the empty columns on
 * both the contact (person email/phone/linkedin/twitter) and its company
 * (website/linkedin/twitter/facebook), tagging each newly-filled field with the
 * "pdl" source. No-op when PDL isn't connected. Never throws — a per-contact
 * failure is caught and reported so a billed credit is never silently lost.
 */
export async function enrichContactsWithPDL(contactIds: number[]): Promise<PdlEnrichResult> {
  const mode = await getPdlMode();
  const base: PdlEnrichResult = { mode, matched: 0, creditsSpent: 0, fieldsFilled: 0, emailLocked: false, phoneLocked: false, errors: [] };
  if (mode === "off") return base;

  const ids = [...new Set(contactIds)].filter((n) => Number.isFinite(n));
  if (ids.length === 0) return base;

  const rows = await db
    .select({
      id: contactsTable.id,
      firstName: contactsTable.firstName,
      lastName: contactsTable.lastName,
      email: contactsTable.email,
      phone: contactsTable.phone,
      linkedinUrl: contactsTable.linkedinUrl,
      twitterUrl: contactsTable.twitterUrl,
      sources: contactsTable.enrichmentSources,
      companyId: contactsTable.companyId,
      companyName: companiesTable.name,
      website: companiesTable.website,
      coLinkedin: companiesTable.linkedinUrl,
      coTwitter: companiesTable.twitterUrl,
      coFacebook: companiesTable.facebookUrl,
      coSources: companiesTable.enrichmentSources,
    })
    .from(contactsTable)
    .leftJoin(companiesTable, eq(contactsTable.companyId, companiesTable.id))
    .where(inArray(contactsTable.id, ids));

  let matched = 0;
  let creditsSpent = 0;
  let fieldsFilled = 0;
  let emailLocked = false;
  let phoneLocked = false;
  const errors: string[] = [];

  for (const c of rows) {
    // Skip when nothing is missing that PDL could add for this person/company.
    const contactComplete = !!c.email && !!c.phone && !!c.linkedinUrl && !!c.twitterUrl;
    const companyComplete = !!c.website && !!c.coLinkedin && !!c.coTwitter && !!c.coFacebook;
    if (contactComplete && companyComplete) continue;

    try {
      const person = await enrichPersonPDL({
        firstName: c.firstName,
        lastName: c.lastName,
        companyName: c.companyName,
        website: c.website,
        linkedinUrl: c.linkedinUrl,
        email: c.email,
      });
      if (!person) continue;
      matched++;
      creditsSpent++; // PDL charges ~1 credit per successful match.
      if (person.emailLocked) emailLocked = true;
      if (person.phoneLocked) phoneLocked = true;

      // Contact (person) — fill only empty columns, tagging each with "pdl".
      const contactUpdate: Record<string, string> = {};
      const contactFilled: string[] = [];
      if (!c.email && person.email) { contactUpdate.email = person.email; contactFilled.push("email"); }
      if (!c.phone && person.phone) { contactUpdate.phone = person.phone; contactFilled.push("phone"); }
      if (!c.linkedinUrl && person.personLinkedin) { contactUpdate.linkedinUrl = person.personLinkedin; contactFilled.push("linkedinUrl"); }
      if (!c.twitterUrl && person.personTwitter) { contactUpdate.twitterUrl = person.personTwitter; contactFilled.push("twitterUrl"); }
      if (contactFilled.length > 0) {
        const set: Record<string, unknown> = { ...contactUpdate, lastSyncedAt: new Date(), enrichmentSources: withSources(c.sources, contactFilled) };
        if (contactUpdate.email) set.contactStatus = "enriched";
        await db.update(contactsTable).set(set).where(eq(contactsTable.id, c.id));
        fieldsFilled += contactFilled.length;
      }

      // Company — fill only empty columns, tagging each with "pdl".
      if (c.companyId) {
        const companyUpdate: Record<string, string> = {};
        const companyFilled: string[] = [];
        if (!c.website && person.companyWebsite) { companyUpdate.website = person.companyWebsite; companyFilled.push("website"); }
        if (!c.coLinkedin && person.companyLinkedin) { companyUpdate.linkedinUrl = person.companyLinkedin; companyFilled.push("linkedinUrl"); }
        if (!c.coTwitter && person.companyTwitter) { companyUpdate.twitterUrl = person.companyTwitter; companyFilled.push("twitterUrl"); }
        if (!c.coFacebook && person.companyFacebook) { companyUpdate.facebookUrl = person.companyFacebook; companyFilled.push("facebookUrl"); }
        if (companyFilled.length > 0) {
          await db
            .update(companiesTable)
            .set({ ...companyUpdate, lastSyncedAt: new Date(), enrichmentSources: withSources(c.coSources, companyFilled) })
            .where(eq(companiesTable.id, c.companyId));
          fieldsFilled += companyFilled.length;
        }
      }
    } catch (err: any) {
      // Never swallow silently — a billed credit with a failed persist must be visible.
      const msg = `PDL enrich failed for contact ${c.id}: ${err?.message ?? String(err)}`;
      console.error("[pdl]", msg);
      errors.push(msg);
    }
  }

  if (creditsSpent > 0) await recordPdlCredits(creditsSpent, { contacts: rows.length });
  return { mode, matched, creditsSpent, fieldsFilled, emailLocked, phoneLocked, errors };
}

// ---------------------------------------------------------------------------
// Status + connection test
// ---------------------------------------------------------------------------

export interface PdlStatus {
  provider: string;
  mode: PdlMode;
  connected: boolean;
  integrationId: number | null;
  lastVerifiedAt: Date | null;
  lastStatus: string | null;
  lastError: string | null;
  notice: string | null;
}

export async function getPdlStatus(): Promise<PdlStatus> {
  const row = await getPdlIntegration();
  const mode = await getPdlMode();
  return {
    provider: PDL_PROVIDER,
    mode,
    connected: mode === "live",
    integrationId: row?.id ?? null,
    lastVerifiedAt: row?.lastSyncAt ?? null,
    lastStatus: row?.lastSyncStatus ?? null,
    lastError: row?.lastSyncError ?? null,
    notice:
      mode === "off"
        ? "People Data Labs is not connected. Enrichment uses Apollo + the free website scan. Add your PDL key to fill more emails, phones and socials."
        : null,
  };
}

export interface PdlTestResult {
  mode: PdlMode;
  connected: boolean;
  message: string;
  code?: string;
}

/** Validate the connected key WITHOUT spending a credit.
 *
 *  PDL only bills a successful match (HTTP 200). An enrich request with NO
 *  identifying parameters is rejected as 400 ("missing required params") before
 *  any match — free — while a bad key returns 401 first. So checking the status
 *  code of a param-less request validates the key at zero cost. (The old probe
 *  sent a real `profile`, which PDL matched and BILLED — that was the credit
 *  drain behind "2 credits used" with no enrich ever run.)
 */
export async function testPdlConnection(): Promise<PdlTestResult> {
  const apiKey = await getPdlApiKey();
  if (!apiKey) {
    return { mode: "off", connected: false, message: "No PDL API key connected.", code: "not_connected" };
  }
  const record = (ok: boolean, err?: string) =>
    db
      .update(integrationsTable)
      .set({ lastSyncAt: new Date(), lastSyncStatus: ok ? "verified" : "verification_failed", lastSyncError: ok ? null : err ?? null })
      .where(eq(integrationsTable.provider, PDL_PROVIDER));

  try {
    await throttle();
    const res = await fetch(`${PDL_BASE}${PDL_ENRICH}?min_likelihood=10`, {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
    });
    if (res.status === 401) {
      await record(false, "PDL rejected the API key (401).");
      return { mode: "live", connected: false, message: "PDL rejected the API key (401). Check the key in Settings → API Keys.", code: "invalid_key" };
    }
    if (res.status === 403) {
      await record(false, "PDL denied access (403) — plan/endpoint restriction.");
      return { mode: "live", connected: false, message: "PDL denied access (403). Your plan may not include this endpoint.", code: "forbidden" };
    }
    // 400 (missing params — expected & free), 402 (no credits), or 200 all mean
    // the KEY itself is accepted.
    await record(true);
    const note = res.status === 402 ? " (key valid, but the account is out of credits)" : "";
    return { mode: "live", connected: true, message: `People Data Labs connection verified${note}. Test used no credits.` };
  } catch (err: any) {
    const msg = err?.message ?? "Network error contacting PDL";
    await record(false, msg);
    return { mode: "live", connected: false, message: msg, code: "network_error" };
  }
}
