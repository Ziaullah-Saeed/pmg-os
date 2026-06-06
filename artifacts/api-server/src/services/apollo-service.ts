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
