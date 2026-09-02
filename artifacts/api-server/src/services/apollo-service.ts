import { db, integrationsTable, syncLogsTable } from "@workspace/db";
import { eq, and, gte, sql } from "drizzle-orm";

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
// Credit-usage governance (soft monthly cap; durable in sync_logs)
// ---------------------------------------------------------------------------

/** Soft monthly Apollo credit cap. Env-overridable. Once month-to-date enrich
 *  spend hits this, live enrichment is blocked until next month (search stays
 *  free). Default 2,500 ≈ Apollo Basic's monthly allotment. */
export const APOLLO_MONTHLY_CREDIT_CAP = (() => {
  const n = Number(process.env.APOLLO_MONTHLY_CREDIT_CAP);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 2500;
})();

const CREDIT_LOG_ENTITY = "apollo_credits";

function monthStart(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export interface ApolloCreditUsage {
  used: number;
  cap: number;
  remaining: number;
  monthKey: string;
}

/** Month-to-date credit spend, summed from sync_logs (survives restarts). */
export async function getMonthlyCreditUsage(): Promise<ApolloCreditUsage> {
  const start = monthStart();
  const [row] = await db
    .select({ used: sql<number>`COALESCE(SUM((${syncLogsTable.payload} ->> 'creditsSpent')::int), 0)` })
    .from(syncLogsTable)
    .where(
      and(
        eq(syncLogsTable.integrationId, APOLLO_PROVIDER),
        eq(syncLogsTable.entityType, CREDIT_LOG_ENTITY),
        gte(syncLogsTable.createdAt, start),
      ),
    );
  const used = Number(row?.used ?? 0);
  const cap = APOLLO_MONTHLY_CREDIT_CAP;
  return {
    used,
    cap,
    remaining: Math.max(0, cap - used),
    monthKey: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
  };
}

/** Record credit spend to sync_logs (queryable audit trail). No-op for 0. */
export async function recordCreditSpend(
  creditsSpent: number,
  action: string,
  detail?: Record<string, unknown>,
): Promise<void> {
  if (!Number.isFinite(creditsSpent) || creditsSpent <= 0) return;
  await db.insert(syncLogsTable).values({
    integrationId: APOLLO_PROVIDER,
    direction: "outbound",
    entityType: CREDIT_LOG_ENTITY,
    status: "completed",
    payload: { creditsSpent, action, ...(detail ?? {}) },
  });
}

/** Soft-cap guard — throws ApolloError(402) when this month's spend has already
 *  reached the cap. Lets an in-flight batch finish, blocks the next attempt. */
export async function assertCreditBudget(): Promise<void> {
  const usage = await getMonthlyCreditUsage();
  if (usage.used >= usage.cap) {
    throw new ApolloError(
      `Apollo monthly credit cap reached (${usage.used}/${usage.cap} this month). Raise APOLLO_MONTHLY_CREDIT_CAP or wait until next month.`,
      402,
      "monthly_cap",
    );
  }
}

// ---------------------------------------------------------------------------
// Async phone reveal — webhook config + pending-request correlation map
// ---------------------------------------------------------------------------

export interface ApolloWebhookConfig {
  enabled: boolean;
  url: string | null;
  secret: string | null;
}

/** Apollo delivers freshly-revealed MOBILE numbers asynchronously to a webhook,
 *  not in the enrichment response. Set `APOLLO_WEBHOOK_URL` to a PUBLICLY
 *  reachable URL pointing at `POST /api/apollo/phone-webhook` (prod, or a tunnel
 *  like ngrok/cloudflared in dev — Apollo cannot reach localhost). Optional
 *  `APOLLO_WEBHOOK_SECRET` is appended as `?secret=` and verified on the way in. */
export function getApolloWebhookConfig(): ApolloWebhookConfig {
  const url = process.env.APOLLO_WEBHOOK_URL?.trim() || null;
  const secret = process.env.APOLLO_WEBHOOK_SECRET?.trim() || null;
  return { enabled: !!url, url, secret };
}

/** The exact URL handed to Apollo — appends the shared secret when configured. */
export function buildApolloWebhookUrl(): string | null {
  const { url, secret } = getApolloWebhookConfig();
  if (!url) return null;
  if (!secret) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("secret", secret);
    return u.toString();
  } catch {
    return url; // malformed URL — send as-is rather than dropping the reveal
  }
}

const PHONE_PENDING_ENTITY = "apollo_phone_pending";

/** Persist a pending async phone reveal so the webhook can map Apollo's person
 *  `id` (echoed from the bulk_match sync response) back to our contact. Durable
 *  in sync_logs so it survives restarts during Apollo's multi-minute delay. */
export async function recordPhonePending(apolloPersonId: string, contactId: number): Promise<void> {
  if (!apolloPersonId || !Number.isFinite(contactId)) return;
  await db.insert(syncLogsTable).values({
    integrationId: APOLLO_PROVIDER,
    direction: "outbound",
    entityType: PHONE_PENDING_ENTITY,
    status: "pending",
    payload: { apolloPersonId, contactId },
  });
}

/** Resolve a webhook's person `id` to the pending contact and mark it completed.
 *  Returns the contactId (null if no pending request matches). */
export async function resolvePhonePending(apolloPersonId: string): Promise<number | null> {
  const [row] = await db
    .select({
      id: syncLogsTable.id,
      contactId: sql<number>`(${syncLogsTable.payload} ->> 'contactId')::int`,
    })
    .from(syncLogsTable)
    .where(
      and(
        eq(syncLogsTable.integrationId, APOLLO_PROVIDER),
        eq(syncLogsTable.entityType, PHONE_PENDING_ENTITY),
        eq(syncLogsTable.status, "pending"),
        sql`${syncLogsTable.payload} ->> 'apolloPersonId' = ${apolloPersonId}`,
      ),
    )
    .orderBy(sql`${syncLogsTable.createdAt} DESC`)
    .limit(1);
  if (!row) return null;
  await db.update(syncLogsTable).set({ status: "completed" }).where(eq(syncLogsTable.id, row.id));
  return Number.isFinite(row.contactId) ? row.contactId : null;
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
  creditsThisMonth: number;
  monthlyCap: number;
  creditsRemaining: number;
  /** True when APOLLO_WEBHOOK_URL is set → async mobile reveal is available. */
  phoneRevealEnabled: boolean;
}

/** Lightweight status — DB only, no external Apollo call. */
export async function getApolloStatus(): Promise<ApolloStatus> {
  const row = await getApolloIntegration();
  const mode = await getApolloMode();
  const usage = await getMonthlyCreditUsage();
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
    creditsThisMonth: usage.used,
    monthlyCap: usage.cap,
    creditsRemaining: usage.remaining,
    phoneRevealEnabled: getApolloWebhookConfig().enabled,
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
 *  exposes emails/phones — `hasEmail` is always false here; reveal is enrichment.
 *  Everything else Apollo returns in the search payload IS captured, so a prospect
 *  looks complete before any credit is spent (org socials, phone, revenue,
 *  technologies, keywords, department). */
export interface NormalizedPerson {
  apolloId: string | null;
  firstName: string;
  lastName: string;
  title: string | null;
  seniority: string | null;
  department: string | null;
  linkedinUrl: string | null;
  /** Person-level X/Twitter, when Apollo exposes it. */
  twitterUrl: string | null;
  organizationName: string | null;
  organizationDomain: string | null;
  industry: string | null;
  estimatedNumEmployees: number | null;
  location: string | null;
  /** Company channels from the org object (business socials + office line). */
  organizationLinkedinUrl: string | null;
  organizationTwitterUrl: string | null;
  organizationFacebookUrl: string | null;
  organizationPhone: string | null;
  /** Human-readable annual revenue, e.g. "$54M". */
  revenue: string | null;
  /** Funding summary, e.g. "Series D · $31.5M". */
  funding: string | null;
  /** Comma-joined technology stack. */
  technologies: string | null;
  /** Comma-joined industry/intent keywords. */
  keywords: string | null;
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

interface ApolloRawOrganization {
  name?: string;
  primary_domain?: string;
  website_url?: string;
  industry?: string;
  estimated_num_employees?: number;
  linkedin_url?: string;
  twitter_url?: string;
  facebook_url?: string;
  phone?: string;
  sanitized_phone?: string;
  primary_phone?: { number?: string; sanitized_number?: string } | null;
  annual_revenue?: number;
  annual_revenue_printed?: string;
  total_funding?: number;
  total_funding_printed?: string;
  latest_funding_stage?: string;
  latest_funding_round_date?: string;
  technology_names?: string[];
  keywords?: string[];
}

interface ApolloRawPerson {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  seniority?: string;
  linkedin_url?: string;
  twitter_url?: string;
  departments?: string[];
  subdepartments?: string[];
  city?: string;
  state?: string;
  country?: string;
  organization?: ApolloRawOrganization | null;
}

function joinLocation(parts: Array<string | undefined | null>): string | null {
  const out = parts.map((p) => (p ?? "").trim()).filter(Boolean);
  return out.length ? out.join(", ") : null;
}

/** Comma-join a string array (trims + drops empties). Optional cap keeps huge
 *  Apollo technology/keyword lists from bloating a row. */
export function joinList(arr: unknown, cap?: number): string | null {
  if (!Array.isArray(arr)) return null;
  const out = arr.map((s) => (typeof s === "string" ? s.trim() : "")).filter(Boolean);
  const capped = typeof cap === "number" && cap > 0 ? out.slice(0, cap) : out;
  return capped.length ? capped.join(", ") : null;
}

/** Turn a "c_suite"-style token into a readable "C Suite". */
export function humanizeToken(s: string | null | undefined): string | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  return t.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Best org phone from the several shapes Apollo uses. */
function orgPhone(org: ApolloRawOrganization | null): string | null {
  return (
    org?.sanitized_phone?.trim() ||
    org?.phone?.trim() ||
    org?.primary_phone?.sanitized_number?.trim() ||
    org?.primary_phone?.number?.trim() ||
    null
  );
}

/** Prefer Apollo's pre-formatted "$54M"; else compact a raw number. */
export function formatRevenue(printed?: string | null, raw?: number | null): string | null {
  if (printed && printed.trim()) return printed.trim();
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return null;
  if (raw >= 1e9) return `$${(raw / 1e9).toFixed(raw >= 1e10 ? 0 : 1)}B`;
  if (raw >= 1e6) return `$${(raw / 1e6).toFixed(raw >= 1e7 ? 0 : 1)}M`;
  if (raw >= 1e3) return `$${Math.round(raw / 1e3)}K`;
  return `$${raw}`;
}

/** Build "Series D · $31.5M" from Apollo funding fields. */
function formatFunding(org: ApolloRawOrganization | null): string | null {
  if (!org) return null;
  const stage = humanizeToken(org.latest_funding_stage);
  const amount = formatRevenue(org.total_funding_printed, org.total_funding);
  const parts = [stage, amount].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** Normalized organization fields, shared by search (`api_search`) and enrichment
 *  (`bulk_match` echoes the same `organization` object). Used to fill company
 *  columns from whichever call produced the data. */
export interface NormalizedOrg {
  name: string | null;
  domain: string | null;
  industry: string | null;
  estimatedNumEmployees: number | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  facebookUrl: string | null;
  phone: string | null;
  revenue: string | null;
  funding: string | null;
  technologies: string | null;
  keywords: string | null;
}

export function normalizeOrganization(org: ApolloRawOrganization | null | undefined): NormalizedOrg {
  const o = org ?? null;
  return {
    name: o?.name?.trim() || null,
    domain:
      o?.primary_domain?.trim() ||
      (o?.website_url ? o.website_url.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : null) ||
      null,
    industry: o?.industry?.trim() || null,
    estimatedNumEmployees: typeof o?.estimated_num_employees === "number" ? o.estimated_num_employees : null,
    linkedinUrl: o?.linkedin_url?.trim() || null,
    twitterUrl: o?.twitter_url?.trim() || null,
    facebookUrl: o?.facebook_url?.trim() || null,
    phone: orgPhone(o),
    revenue: formatRevenue(o?.annual_revenue_printed, o?.annual_revenue),
    funding: formatFunding(o),
    technologies: joinList(o?.technology_names, 40),
    keywords: joinList(o?.keywords, 30),
  };
}

function normalizePerson(p: ApolloRawPerson): NormalizedPerson {
  const org = normalizeOrganization(p.organization);
  const fullName = (p.name ?? "").trim();
  const firstName = p.first_name?.trim() || fullName.split(" ")[0] || "";
  const lastName =
    p.last_name?.trim() || (fullName ? fullName.split(" ").slice(1).join(" ") : "");
  return {
    apolloId: p.id ?? null,
    firstName,
    lastName,
    title: p.title?.trim() || null,
    // Keep the raw Apollo token ("c_suite", "vp") — importProspects matches it
    // against DECISION_MAKER_SENIORITIES; the UI humanizes it for display.
    seniority: p.seniority?.trim() || null,
    department: humanizeToken(p.departments?.[0]) || humanizeToken(p.subdepartments?.[0]),
    linkedinUrl: p.linkedin_url?.trim() || null,
    twitterUrl: p.twitter_url?.trim() || null,
    organizationName: org.name,
    organizationDomain: org.domain,
    industry: org.industry,
    estimatedNumEmployees: org.estimatedNumEmployees,
    location: joinLocation([p.city, p.state, p.country]),
    organizationLinkedinUrl: org.linkedinUrl,
    organizationTwitterUrl: org.twitterUrl,
    organizationFacebookUrl: org.facebookUrl,
    organizationPhone: org.phone,
    revenue: org.revenue,
    funding: org.funding,
    technologies: org.technologies,
    keywords: org.keywords,
    hasEmail: false,
  };
}

const FIXTURE_NOTICE =
  "Apollo is not connected — these are labeled sample prospects, not live data. Connect your API key in Settings → API Keys to run real searches.";

/** Deterministic cyber/IT sample people for $0 fixture mode. Mirrors a real
 *  search payload at full depth (org socials, phone, revenue, funding, tech,
 *  keywords, department) so the disconnected "Sample" state renders the same
 *  complete card a live search would — but with NO emails (reveal is enrichment). */
interface FixtureSeed {
  firstName: string;
  lastName: string;
  title: string;
  seniority: string;
  department: string;
  organizationName: string;
  organizationDomain: string;
  industry: string;
  est: number;
  location: string;
  revenue: string;
  funding: string | null;
  technologies: string;
  keywords: string;
}

const FIXTURE_SEEDS: FixtureSeed[] = [
  { firstName: "Marcus", lastName: "Reyes", title: "VP of Marketing", seniority: "vp", department: "Marketing", organizationName: "SentinelEdge Security", organizationDomain: "sentineledge.io", industry: "Computer & Network Security", est: 180, location: "Austin, Texas, United States", revenue: "$28M", funding: "Series B · $22M", technologies: "AWS, Cloudflare, HubSpot, Salesforce, Snowflake, Okta", keywords: "MDR, threat detection, EDR, SOC, cybersecurity" },
  { firstName: "Priya", lastName: "Nair", title: "Chief Marketing Officer", seniority: "c_suite", department: "C-Suite", organizationName: "Quorum Threat Labs", organizationDomain: "quorumthreat.com", industry: "Computer & Network Security", est: 95, location: "Boston, Massachusetts, United States", revenue: "$14M", funding: "Series A · $9M", technologies: "GCP, Marketo, Drift, Segment, Datadog", keywords: "threat intelligence, SIEM, incident response, cyber" },
  { firstName: "David", lastName: "Okonkwo", title: "Director of Demand Generation", seniority: "director", department: "Marketing", organizationName: "NimbusGuard", organizationDomain: "nimbusguard.io", industry: "Cyber Security", est: 320, location: "Denver, Colorado, United States", revenue: "$47M", funding: "Series C · $60M", technologies: "Azure, Microsoft 365, 6sense, Outreach, Gong", keywords: "CSPM, cloud security, DevSecOps, compliance" },
  { firstName: "Hannah", lastName: "Liebowitz", title: "Head of Growth", seniority: "head", department: "Marketing", organizationName: "Aperture Defense", organizationDomain: "aperturedefense.com", industry: "Information Technology & Services", est: 60, location: "Seattle, Washington, United States", revenue: "$8M", funding: "Seed · $3M", technologies: "Webflow, HubSpot, Vercel, Stripe, Intercom", keywords: "managed IT, MSP, endpoint security, backup" },
  { firstName: "Tomás", lastName: "Beltran", title: "VP Demand Generation", seniority: "vp", department: "Marketing", organizationName: "Citadel MSSP", organizationDomain: "citadelmssp.com", industry: "Computer & Network Security", est: 240, location: "Miami, Florida, United States", revenue: "$36M", funding: null, technologies: "AWS, Salesforce, Pardot, Zoom, ServiceNow", keywords: "MSSP, managed security, firewall, SOC as a service" },
  { firstName: "Aisha", lastName: "Rahman", title: "Marketing Director", seniority: "director", department: "Marketing", organizationName: "BastionWorks", organizationDomain: "bastionworks.io", industry: "Cyber Security", est: 130, location: "Chicago, Illinois, United States", revenue: "$19M", funding: "Series A · $12M", technologies: "GCP, HubSpot, Clearbit, Slack, Notion", keywords: "zero trust, IAM, access control, cyber" },
  { firstName: "Liam", lastName: "Gallagher", title: "Chief Growth Officer", seniority: "c_suite", department: "C-Suite", organizationName: "RedCell Analytics", organizationDomain: "redcell.ai", industry: "Computer & Network Security", est: 75, location: "San Francisco, California, United States", revenue: "$11M", funding: "Series A · $15M", technologies: "AWS, OpenAI, Snowflake, dbt, Segment", keywords: "AI security, anomaly detection, analytics, cyber" },
  { firstName: "Sofia", lastName: "Marchetti", title: "Senior Marketing Manager", seniority: "senior", department: "Marketing", organizationName: "Helix IR", organizationDomain: "helixir.com", industry: "Information Technology & Services", est: 410, location: "New York, New York, United States", revenue: "$62M", funding: "Series C · $48M", technologies: "Azure, Marketo, Salesforce, Tableau, Okta", keywords: "incident response, forensics, DFIR, managed detection" },
  { firstName: "Jamal", lastName: "Carter", title: "Director of Brand", seniority: "director", department: "Marketing", organizationName: "PhalanxSec", organizationDomain: "phalanxsec.io", industry: "Cyber Security", est: 200, location: "Atlanta, Georgia, United States", revenue: "$33M", funding: "Series B · $30M", technologies: "AWS, HubSpot, Webflow, Amplitude, PagerDuty", keywords: "penetration testing, red team, vulnerability, cyber" },
  { firstName: "Nora", lastName: "Eklund", title: "VP of Revenue Marketing", seniority: "vp", department: "Marketing", organizationName: "Verityware", organizationDomain: "verityware.com", industry: "Computer & Network Security", est: 150, location: "Raleigh, North Carolina, United States", revenue: "$24M", funding: "Series B · $18M", technologies: "GCP, Salesforce, 6sense, Outreach, Looker", keywords: "GRC, compliance automation, audit, cyber" },
];

const FIXTURE_PEOPLE: NormalizedPerson[] = FIXTURE_SEEDS.map((s, i) => ({
  apolloId: `fixture-${i + 1}`,
  firstName: s.firstName,
  lastName: s.lastName,
  title: s.title,
  seniority: s.seniority,
  department: s.department,
  linkedinUrl: `https://www.linkedin.com/in/${s.firstName.toLowerCase()}-${s.lastName.toLowerCase()}`,
  twitterUrl: null,
  organizationName: s.organizationName,
  organizationDomain: s.organizationDomain,
  industry: s.industry,
  estimatedNumEmployees: s.est,
  location: s.location,
  organizationLinkedinUrl: `https://www.linkedin.com/company/${s.organizationDomain.split(".")[0]}`,
  organizationTwitterUrl: `https://twitter.com/${s.organizationDomain.split(".")[0]}`,
  organizationFacebookUrl: null,
  organizationPhone: null,
  revenue: s.revenue,
  funding: s.funding,
  technologies: s.technologies,
  keywords: s.keywords,
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
