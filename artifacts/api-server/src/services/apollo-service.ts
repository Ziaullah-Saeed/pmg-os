import { db, integrationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Apollo.io data-layer client (lead generation: search + enrichment).
 *
 * Phase 1 scope: credential loading, a hardened request helper (throttle +
 * backoff + error mapping), connection-state detection, and a connection test.
 * People search + enrichment land in Phases 2-3 and reuse `apolloRequest`.
 *
 * Auto-fixture contract: this is NOT the banned hardcoded `dummyMode`. The mode
 * is derived from *connection state* — if no Apollo key is connected in the
 * `integrations` table, callers run on clearly-labeled sample data. The moment a
 * key is connected, calls go live. Nothing to flip, nothing to remember.
 *
 * Apollo API notes (verified against docs.apollo.io, 2026):
 *  - Auth header: `X-Api-Key`.
 *  - Health/auth check: GET https://api.apollo.io/v1/auth/health -> { healthy, is_logged_in }.
 *  - People search endpoint is `/api/v1/mixed_people/api_search` (the API variant;
 *    `mixed_people/search` 403s on lower plans). Search returns NO emails/phones.
 *  - Email/phone reveal happens only via enrichment (`/api/v1/people/bulk_match`)
 *    with reveal_personal_emails / reveal_phone_number — that is the credit sink.
 */

export const APOLLO_PROVIDER = "apollo";

const APOLLO_BASE = "https://api.apollo.io";

// Apollo mixes `/v1` and `/api/v1` prefixes across endpoints — keep full paths.
export const APOLLO_ENDPOINTS = {
  health: "/v1/auth/health",
  peopleSearch: "/api/v1/mixed_people/api_search",
  bulkMatch: "/api/v1/people/bulk_match",
} as const;

export type ApolloMode = "live" | "fixture";

/** Conservative client-side pacing. Apollo's per-plan limits are undocumented;
 *  ~1 req/sec is the community-safe default and avoids tripping 429s. */
const MIN_REQUEST_INTERVAL_MS = 1100;
const MAX_RETRIES = 3;

export class ApolloError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApolloError";
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// Credentials / connection state
// ---------------------------------------------------------------------------

export async function getApolloIntegration() {
  const [row] = await db
    .select()
    .from(integrationsTable)
    .where(eq(integrationsTable.provider, APOLLO_PROVIDER));
  return row ?? null;
}

/** Returns the stored API key only when the integration is actively connected. */
export async function getApolloApiKey(): Promise<string | null> {
  const row = await getApolloIntegration();
  if (!row || !row.isActive || row.status !== "connected") return null;
  const creds = row.credentials as { apiKey?: string } | null;
  return creds?.apiKey?.trim() || null;
}

/** Connection-gated: `live` when a key is connected, otherwise `fixture`. */
export async function getApolloMode(): Promise<ApolloMode> {
  return (await getApolloApiKey()) ? "live" : "fixture";
}

// ---------------------------------------------------------------------------
// Low-level request helper (throttle + retry/backoff + error mapping)
// ---------------------------------------------------------------------------

let lastRequestAt = 0;

async function throttle(): Promise<void> {
  const wait = lastRequestAt + MIN_REQUEST_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

function backoffMs(attempt: number): number {
  // 1s, 2s, 4s (+/- jitter)
  return Math.round(1000 * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5));
}

function mapApolloError(status: number, body: string): ApolloError {
  const snippet = body.slice(0, 300);
  switch (status) {
    case 401:
      return new ApolloError(
        "Apollo rejected the API key (401). Verify the key in Settings → API Keys.",
        401,
        "invalid_key",
      );
    case 402:
      return new ApolloError(
        "Apollo reports a payment/credit issue (402). Top up Apollo credits or reduce enrichment volume.",
        402,
        "insufficient_credits",
      );
    case 403:
      return new ApolloError(
        "Apollo denied access (403). Your plan may not include API access for this endpoint, or a plan limit was hit.",
        403,
        "forbidden",
      );
    case 422:
      return new ApolloError(`Apollo rejected the request (422): ${snippet}`, 422, "invalid_request");
    default:
      return new ApolloError(`Apollo request failed (${status}): ${snippet}`, status, "apollo_error");
  }
}

export async function apolloRequest<T>(params: {
  endpoint: string;
  apiKey: string;
  method?: "GET" | "POST";
  body?: unknown;
  query?: Record<string, string>;
}): Promise<T> {
  const { endpoint, apiKey, method = "POST", body, query } = params;
  const url = new URL(APOLLO_BASE + endpoint);
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await throttle();

    let res: Response;
    try {
      res = await fetch(url.toString(), {
        method,
        headers: {
          "X-Api-Key": apiKey,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      });
    } catch (err: any) {
      if (attempt < MAX_RETRIES) {
        attempt++;
        await new Promise((r) => setTimeout(r, backoffMs(attempt)));
        continue;
      }
      throw new ApolloError(`Network error contacting Apollo: ${err?.message ?? "unknown"}`, 0, "network_error");
    }

    if (res.status === 429) {
      if (attempt < MAX_RETRIES) {
        attempt++;
        const retryAfter = Number(res.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoffMs(attempt);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      throw new ApolloError("Apollo rate limit exceeded. Try again shortly.", 429, "rate_limited");
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw mapApolloError(res.status, text);
    }

    return (await res.json()) as T;
  }
}

// ---------------------------------------------------------------------------
// Status + connection test
// ---------------------------------------------------------------------------

export interface ApolloStatus {
  provider: string;
  mode: ApolloMode;
  connected: boolean;
  integrationId: number | null;
  lastVerifiedAt: Date | null;
  lastStatus: string | null;
  lastError: string | null;
  fixtureNotice: string | null;
}

/** Lightweight status — DB only, no external Apollo call. */
export async function getApolloStatus(): Promise<ApolloStatus> {
  const row = await getApolloIntegration();
  const mode = await getApolloMode();
  return {
    provider: APOLLO_PROVIDER,
    mode,
    connected: mode === "live",
    integrationId: row?.id ?? null,
    lastVerifiedAt: row?.lastSyncAt ?? null,
    lastStatus: row?.lastSyncStatus ?? null,
    lastError: row?.lastSyncError ?? null,
    fixtureNotice:
      mode === "fixture"
        ? "Apollo is not connected — Prospect Finder shows labeled sample data. Connect your API key to pull real prospects."
        : null,
  };
}

export interface ApolloTestResult {
  mode: ApolloMode;
  connected: boolean;
  healthy?: boolean;
  isLoggedIn?: boolean;
  message: string;
  code?: string;
}

// ---------------------------------------------------------------------------
// People search (Phase 2) — free preview, NO credits, NO emails/phones.
// ---------------------------------------------------------------------------

/** Apollo's valid `organization_num_employees_ranges` buckets (lower,upper). */
export const APOLLO_HEADCOUNT_RANGES = [
  "1,10",
  "11,50",
  "51,200",
  "201,500",
  "501,1000",
  "1001,5000",
  "5001,10000",
  "10001,1000000",
] as const;

const MAX_PER_PAGE = 100;
const DEFAULT_PER_PAGE = 25;

/** Manual-filter input (mirrors the Prospect Finder form 1:1). */
export interface PeopleSearchFilters {
  titles?: string[];
  seniorities?: string[];
  /** Industry / keyword tags → Apollo `q_organization_keyword_tags`. */
  organizationKeywords?: string[];
  locations?: string[];
  /** Headcount buckets from APOLLO_HEADCOUNT_RANGES. */
  employeeRanges?: string[];
  /** Free-text keyword → Apollo `q_keywords`. */
  keywords?: string;
  page?: number;
  perPage?: number;
}

/** Stable shape returned to the UI regardless of live vs fixture. Search never
 *  exposes emails/phones — `hasEmail` is always false here; reveal is enrichment. */
export interface NormalizedPerson {
  apolloId: string | null;
  firstName: string;
  lastName: string;
  title: string | null;
  seniority: string | null;
  organizationName: string | null;
  organizationDomain: string | null;
  industry: string | null;
  estimatedNumEmployees: number | null;
  location: string | null;
  linkedinUrl: string | null;
  hasEmail: false;
}

export interface PeopleSearchResult {
  mode: ApolloMode;
  people: NormalizedPerson[];
  pagination: { page: number; perPage: number; totalEntries: number; totalPages: number };
  fixtureNotice: string | null;
}

function clampPage(page?: number): number {
  return Number.isFinite(page) && (page as number) >= 1 ? Math.floor(page as number) : 1;
}

function clampPerPage(perPage?: number): number {
  if (!Number.isFinite(perPage)) return DEFAULT_PER_PAGE;
  return Math.min(MAX_PER_PAGE, Math.max(1, Math.floor(perPage as number)));
}

/** Drop empties + trim from a string-array filter so we never send junk to Apollo. */
function cleanList(arr?: string[]): string[] | undefined {
  if (!Array.isArray(arr)) return undefined;
  const out = arr.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
  return out.length ? out : undefined;
}

/** Build the Apollo `mixed_people/api_search` request body from manual filters. */
function buildSearchBody(filters: PeopleSearchFilters, page: number, perPage: number): Record<string, unknown> {
  const body: Record<string, unknown> = { page, per_page: perPage };
  const titles = cleanList(filters.titles);
  const seniorities = cleanList(filters.seniorities);
  const keywordTags = cleanList(filters.organizationKeywords);
  const locations = cleanList(filters.locations);
  const ranges = cleanList(filters.employeeRanges)?.filter((r) =>
    (APOLLO_HEADCOUNT_RANGES as readonly string[]).includes(r),
  );
  if (titles) body.person_titles = titles;
  if (seniorities) body.person_seniorities = seniorities;
  if (keywordTags) body.q_organization_keyword_tags = keywordTags;
  if (locations) body.person_locations = locations;
  if (ranges?.length) body.organization_num_employees_ranges = ranges;
  if (filters.keywords && filters.keywords.trim()) body.q_keywords = filters.keywords.trim();
  return body;
}

interface ApolloRawPerson {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  seniority?: string;
  linkedin_url?: string;
  city?: string;
  state?: string;
  country?: string;
  organization?: {
    name?: string;
    primary_domain?: string;
    website_url?: string;
    industry?: string;
    estimated_num_employees?: number;
  } | null;
}

function joinLocation(parts: Array<string | undefined | null>): string | null {
  const out = parts.map((p) => (p ?? "").trim()).filter(Boolean);
  return out.length ? out.join(", ") : null;
}

function normalizePerson(p: ApolloRawPerson): NormalizedPerson {
  const org = p.organization ?? null;
  const fullName = (p.name ?? "").trim();
  const firstName = p.first_name?.trim() || fullName.split(" ")[0] || "";
  const lastName =
    p.last_name?.trim() || (fullName ? fullName.split(" ").slice(1).join(" ") : "");
  return {
    apolloId: p.id ?? null,
    firstName,
    lastName,
    title: p.title?.trim() || null,
    seniority: p.seniority?.trim() || null,
    organizationName: org?.name?.trim() || null,
    organizationDomain:
      org?.primary_domain?.trim() ||
      (org?.website_url ? org.website_url.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : null) ||
      null,
    industry: org?.industry?.trim() || null,
    estimatedNumEmployees:
      typeof org?.estimated_num_employees === "number" ? org.estimated_num_employees : null,
    location: joinLocation([p.city, p.state, p.country]),
    linkedinUrl: p.linkedin_url?.trim() || null,
    hasEmail: false,
  };
}

const FIXTURE_NOTICE =
  "Apollo is not connected — these are labeled sample prospects, not live data. Connect your API key in Settings → API Keys to run real searches.";

/** Deterministic cyber/IT sample people for $0 fixture mode. Mirrors a real
 *  search payload: realistic firm/role data but NO emails (reveal is enrichment). */
const FIXTURE_PEOPLE: NormalizedPerson[] = [
  ["Marcus", "Reyes", "VP of Marketing", "vp", "SentinelEdge Security", "sentineledge.io", "Computer & Network Security", 180, "Austin, Texas, United States"],
  ["Priya", "Nair", "Chief Marketing Officer", "c_suite", "Quorum Threat Labs", "quorumthreat.com", "Computer & Network Security", 95, "Boston, Massachusetts, United States"],
  ["David", "Okonkwo", "Director of Demand Generation", "director", "NimbusGuard", "nimbusguard.io", "Cyber Security", 320, "Denver, Colorado, United States"],
  ["Hannah", "Liebowitz", "Head of Growth", "head", "Aperture Defense", "aperturedefense.com", "Information Technology & Services", 60, "Seattle, Washington, United States"],
  ["Tomás", "Beltran", "VP Demand Generation", "vp", "Citadel MSSP", "citadelmssp.com", "Computer & Network Security", 240, "Miami, Florida, United States"],
  ["Aisha", "Rahman", "Marketing Director", "director", "BastionWorks", "bastionworks.io", "Cyber Security", 130, "Chicago, Illinois, United States"],
  ["Liam", "Gallagher", "Chief Growth Officer", "c_suite", "RedCell Analytics", "redcell.ai", "Computer & Network Security", 75, "San Francisco, California, United States"],
  ["Sofia", "Marchetti", "Senior Marketing Manager", "senior", "Helix IR", "helixir.com", "Information Technology & Services", 410, "New York, New York, United States"],
  ["Jamal", "Carter", "Director of Brand", "director", "PhalanxSec", "phalanxsec.io", "Cyber Security", 200, "Atlanta, Georgia, United States"],
  ["Nora", "Eklund", "VP of Revenue Marketing", "vp", "Verityware", "verityware.com", "Computer & Network Security", 150, "Raleigh, North Carolina, United States"],
].map(([firstName, lastName, title, seniority, organizationName, organizationDomain, industry, est, location], i) => ({
  apolloId: `fixture-${i + 1}`,
  firstName: firstName as string,
  lastName: lastName as string,
  title: title as string,
  seniority: seniority as string,
  organizationName: organizationName as string,
  organizationDomain: organizationDomain as string,
  industry: industry as string,
  estimatedNumEmployees: est as number,
  location: location as string,
  linkedinUrl: `https://www.linkedin.com/in/${(firstName as string).toLowerCase()}-${(lastName as string).toLowerCase()}`,
  hasEmail: false as const,
}));

/** Lightweight, predictable filtering of fixtures so the form feels responsive
 *  without an Apollo key. Matches on title/keyword substrings + headcount range. */
function filterFixtures(filters: PeopleSearchFilters): NormalizedPerson[] {
  const titles = cleanList(filters.titles)?.map((t) => t.toLowerCase());
  const keyword = filters.keywords?.trim().toLowerCase();
  const orgKeywords = cleanList(filters.organizationKeywords)?.map((k) => k.toLowerCase());
  const ranges = cleanList(filters.employeeRanges);
  return FIXTURE_PEOPLE.filter((p) => {
    if (titles && !titles.some((t) => (p.title ?? "").toLowerCase().includes(t))) return false;
    if (orgKeywords && !orgKeywords.some((k) => (p.industry ?? "").toLowerCase().includes(k))) return false;
    if (keyword) {
      const hay = `${p.title} ${p.organizationName} ${p.industry}`.toLowerCase();
      if (!hay.includes(keyword)) return false;
    }
    if (ranges?.length && p.estimatedNumEmployees != null) {
      const inRange = ranges.some((r) => {
        const [lo, hi] = r.split(",").map(Number);
        return p.estimatedNumEmployees! >= lo && p.estimatedNumEmployees! <= hi;
      });
      if (!inRange) return false;
    }
    return true;
  });
}

/** People search. Connection-gated: live Apollo call when a key is connected,
 *  otherwise labeled fixtures. Never returns emails/phones (those are enrichment). */
export async function searchPeople(filters: PeopleSearchFilters): Promise<PeopleSearchResult> {
  const page = clampPage(filters.page);
  const perPage = clampPerPage(filters.perPage);
  const apiKey = await getApolloApiKey();

  if (!apiKey) {
    const matches = filterFixtures(filters);
    const start = (page - 1) * perPage;
    const slice = matches.slice(start, start + perPage);
    return {
      mode: "fixture",
      people: slice,
      pagination: {
        page,
        perPage,
        totalEntries: matches.length,
        totalPages: Math.max(1, Math.ceil(matches.length / perPage)),
      },
      fixtureNotice: FIXTURE_NOTICE,
    };
  }

  const body = buildSearchBody(filters, page, perPage);
  const data = await apolloRequest<{
    people?: ApolloRawPerson[];
    pagination?: { page?: number; per_page?: number; total_entries?: number; total_pages?: number };
  }>({ endpoint: APOLLO_ENDPOINTS.peopleSearch, apiKey, method: "POST", body });

  const people = (data.people ?? []).map(normalizePerson);
  const pg = data.pagination ?? {};
  return {
    mode: "live",
    people,
    pagination: {
      page: pg.page ?? page,
      perPage: pg.per_page ?? perPage,
      totalEntries: pg.total_entries ?? people.length,
      totalPages: pg.total_pages ?? 1,
    },
    fixtureNotice: null,
  };
}

/** Actively calls Apollo's health endpoint to validate the connected key.
 *  Returns a structured result (does not throw) and records the outcome on the
 *  integration row so the UI can show last-verified state. */
export async function testApolloConnection(): Promise<ApolloTestResult> {
  const apiKey = await getApolloApiKey();
  if (!apiKey) {
    return {
      mode: "fixture",
      connected: false,
      message:
        "No Apollo API key connected. Prospect Finder is running on labeled sample data — add your key to go live.",
      code: "not_connected",
    };
  }

  try {
    const data = await apolloRequest<{ healthy?: boolean; is_logged_in?: boolean }>({
      endpoint: APOLLO_ENDPOINTS.health,
      apiKey,
      method: "GET",
    });
    const healthy = data.healthy === true;
    const isLoggedIn = data.is_logged_in === true;
    const ok = healthy && isLoggedIn;

    await db
      .update(integrationsTable)
      .set({
        lastSyncAt: new Date(),
        lastSyncStatus: ok ? "verified" : "auth_failed",
        lastSyncError: ok ? null : "Apollo health check did not confirm an active session",
      })
      .where(eq(integrationsTable.provider, APOLLO_PROVIDER));

    return {
      mode: "live",
      connected: ok,
      healthy,
      isLoggedIn,
      message: ok
        ? "Apollo connection verified."
        : "Apollo key is present but the health check did not confirm an active session.",
    };
  } catch (err) {
    const apolloErr = err instanceof ApolloError ? err : new ApolloError(String(err), 0, "apollo_error");
    await db
      .update(integrationsTable)
      .set({
        lastSyncAt: new Date(),
        lastSyncStatus: "verification_failed",
        lastSyncError: apolloErr.message,
      })
      .where(eq(integrationsTable.provider, APOLLO_PROVIDER));

    return {
      mode: "live",
      connected: false,
      message: apolloErr.message,
      code: apolloErr.code,
    };
  }
}
