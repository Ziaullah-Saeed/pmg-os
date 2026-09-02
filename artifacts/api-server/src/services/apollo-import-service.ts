import { db, companiesTable, contactsTable, leadsTable, activitiesTable } from "@workspace/db";
import { eq, ilike, inArray } from "drizzle-orm";
import {
  apolloRequest,
  ApolloError,
  getApolloApiKey,
  getApolloMode,
  assertCreditBudget,
  recordCreditSpend,
  buildApolloWebhookUrl,
  recordPhonePending,
  resolvePhonePending,
  normalizeOrganization,
  humanizeToken,
  APOLLO_ENDPOINTS,
  type ApolloMode,
  type NormalizedPerson,
  type NormalizedOrg,
} from "./apollo-service";
import { getGlobalMode } from "./ai-mode-service";
import { checkDuplicatesOnCreate } from "./dedup-service";
import { enrichAndScoreLead } from "./lead-enrichment-service";
import { enrollContact } from "./sequence-engine";

/**
 * Apollo → CRM import + enrichment (Phase 3).
 *
 * Import creates company + contact + lead (FK model) from search results.
 *   - fixture mode → labeled SAMPLE emails (contactStatus "sample"), so the
 *     pipeline can be demoed end-to-end for $0. Sending stays log-only.
 *   - live mode → email left null (contactStatus "missing_contact"); a separate
 *     `enrichContacts()` call reveals real emails via Apollo `bulk_match`
 *     (the credit sink) and flips status to "enriched".
 * Imported leads reuse the same AI enrich+score job as manual "Add Lead".
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DECISION_MAKER_SENIORITIES = new Set(["owner", "founder", "c_suite", "partner", "vp", "head"]);

/** Apollo person id shape (24-char hex ObjectId). Apollo's free `api_search`
 *  preview omits `last_name` and the org `domain`, so name/org matching at enrich
 *  time is unreliable — but the exact person `id` (stored in `externalCrmId` at
 *  import) matches deterministically. Guarded so a non-Apollo externalCrmId from
 *  another CRM falls back to name/org matching instead of being sent as an id. */
const APOLLO_PERSON_ID_RE = /^[a-f0-9]{24}$/i;

/** Hard per-request enrich cap — bounds the credit blast radius of a single live
 *  call, on top of the soft monthly cap (which only blocks the *next* request).
 *  Env-overridable; default 100 (one full search page), so a normal one-page UI
 *  selection never trips it. Fixture mode is unaffected (no credits spent). */
const MAX_ENRICH_PER_REQUEST = (() => {
  const n = Number(process.env.APOLLO_MAX_ENRICH_PER_REQUEST);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 100;
})();

/** Merge new provenance tags onto an existing enrichment_sources map. */
function mergeSources(
  existing: Record<string, string> | null | undefined,
  fields: string[],
  provider = "apollo",
): Record<string, string> {
  const out = { ...(existing ?? {}) };
  for (const f of fields) out[f] = provider;
  return out;
}

function headcountToSize(n: number | null): string | null {
  if (n == null) return null;
  if (n <= 10) return "1-10";
  if (n <= 50) return "11-50";
  if (n <= 200) return "51-200";
  if (n <= 500) return "201-500";
  if (n <= 1000) return "501-1000";
  if (n <= 5000) return "1001-5000";
  if (n <= 10000) return "5001-10000";
  return "10001+";
}

function sampleDomain(domain: string | null, orgName: string | null): string {
  if (domain) return domain.toLowerCase();
  const base = (orgName ?? "company").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `${base || "company"}.com`;
}

/** Deterministic, clearly-fictional sample address used only in fixture mode. */
function buildSampleEmail(
  firstName: string,
  lastName: string,
  domain: string | null,
  orgName: string | null,
): string {
  const f = (firstName || "contact").toLowerCase().replace(/[^a-z0-9]/g, "");
  const l = (lastName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const local = l ? `${f}.${l}` : f;
  return `${local}@${sampleDomain(domain, orgName)}`;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Reuse the same translation the leads route uses (ai_autonomous → ai_auto). */
async function currentModeLabel(): Promise<string> {
  const m = await getGlobalMode();
  return m === "ai_autonomous" ? "ai_auto" : m === "hybrid" ? "hybrid" : "human";
}

/** Company columns read for fill-empty checks. */
const companyRichCols = {
  id: companiesTable.id,
  website: companiesTable.website,
  phone: companiesTable.phone,
  linkedinUrl: companiesTable.linkedinUrl,
  twitterUrl: companiesTable.twitterUrl,
  facebookUrl: companiesTable.facebookUrl,
  revenue: companiesTable.revenue,
  funding: companiesTable.funding,
  technologies: companiesTable.technologies,
  keywords: companiesTable.keywords,
  employeeCount: companiesTable.employeeCount,
  size: companiesTable.size,
  enrichmentSources: companiesTable.enrichmentSources,
};

/** Map a NormalizedOrg (from `api_search` or `bulk_match`) to company columns,
 *  dropping nulls. Shared by import and enrich so both paths persist the same depth. */
function orgToCompanyValues(o: NormalizedOrg): Record<string, string | number> {
  const v: Record<string, string | number> = {};
  const put = (k: string, val: string | null | undefined) => {
    if (val != null && String(val).trim()) v[k] = String(val).trim();
  };
  put("website", o.domain);
  put("phone", o.phone);
  put("linkedinUrl", o.linkedinUrl);
  put("twitterUrl", o.twitterUrl);
  put("facebookUrl", o.facebookUrl);
  put("revenue", o.revenue);
  put("funding", o.funding);
  put("technologies", o.technologies);
  put("keywords", o.keywords);
  if (o.estimatedNumEmployees != null) {
    v.employeeCount = o.estimatedNumEmployees;
    const bucket = headcountToSize(o.estimatedNumEmployees);
    if (bucket) v.size = bucket;
  }
  return v;
}

/** A NormalizedPerson carries the org fields with an `organization*` prefix. */
function companyRichValues(p: NormalizedPerson): Record<string, string | number> {
  return orgToCompanyValues({
    name: p.organizationName,
    domain: p.organizationDomain,
    industry: p.industry,
    estimatedNumEmployees: p.estimatedNumEmployees,
    linkedinUrl: p.organizationLinkedinUrl,
    twitterUrl: p.organizationTwitterUrl,
    facebookUrl: p.organizationFacebookUrl,
    phone: p.organizationPhone,
    revenue: p.revenue,
    funding: p.funding,
    technologies: p.technologies,
    keywords: p.keywords,
  });
}

/** Fill-empty-only update of a company by id — never overwrites existing values.
 *  Returns the field names actually filled (for provenance/telemetry). */
async function fillEmptyCompanyById(companyId: number, rich: Record<string, string | number>): Promise<string[]> {
  if (!Number.isFinite(companyId) || Object.keys(rich).length === 0) return [];
  const [existing] = await db.select(companyRichCols).from(companiesTable).where(eq(companiesTable.id, companyId)).limit(1);
  if (!existing) return [];
  const update: Record<string, any> = {};
  const filled: string[] = [];
  for (const [k, val] of Object.entries(rich)) {
    const cur = (existing as Record<string, any>)[k];
    if ((cur == null || cur === "") && val != null && val !== "") {
      update[k] = val;
      filled.push(k);
    }
  }
  if (filled.length > 0) {
    update.enrichmentSources = mergeSources((existing as Record<string, any>).enrichmentSources, filled);
    update.lastSyncedAt = new Date();
    await db.update(companiesTable).set(update).where(eq(companiesTable.id, companyId));
  }
  return filled;
}

/** Upsert a company by domain (website) then case-insensitive name. On an existing
 *  row, fill-empty-only with any richer Apollo fields (never overwrites). */
async function upsertCompany(p: NormalizedPerson): Promise<{ id: number; created: boolean }> {
  const rich = companyRichValues(p);

  let existing: { id: number } | undefined;
  if (p.organizationDomain) {
    [existing] = await db.select({ id: companiesTable.id }).from(companiesTable).where(eq(companiesTable.website, p.organizationDomain)).limit(1);
  }
  if (!existing && p.organizationName) {
    [existing] = await db.select({ id: companiesTable.id }).from(companiesTable).where(ilike(companiesTable.name, p.organizationName)).limit(1);
  }

  if (existing) {
    await fillEmptyCompanyById(existing.id, rich);
    return { id: existing.id, created: false };
  }

  const filledKeys = Object.keys(rich);
  const [created] = await db
    .insert(companiesTable)
    .values({
      name: p.organizationName ?? "Unknown Company",
      industry: p.industry ?? "cybersecurity",
      location: p.location ?? null,
      status: "prospect",
      ...rich,
      enrichmentSources: filledKeys.length ? mergeSources(null, filledKeys) : undefined,
    })
    .returning();
  return { id: created.id, created: true };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export interface ApolloImportResult {
  mode: ApolloMode;
  imported: Array<{
    apolloId: string | null;
    contactId: number;
    leadId: number;
    companyId: number;
    email: string | null;
    contactStatus: string;
  }>;
  skipped: Array<{ apolloId: string | null; reason: string }>;
}

export async function importProspects(people: NormalizedPerson[]): Promise<ApolloImportResult> {
  const mode = await getApolloMode();
  const modeLabel = await currentModeLabel();
  const imported: ApolloImportResult["imported"] = [];
  const skipped: ApolloImportResult["skipped"] = [];

  for (const p of people) {
    if (!p.firstName && !p.organizationName) {
      skipped.push({ apolloId: p.apolloId, reason: "missing_name" });
      continue;
    }

    // Don't re-import the same Apollo person.
    if (p.apolloId) {
      const [existing] = await db
        .select({ id: contactsTable.id })
        .from(contactsTable)
        .where(eq(contactsTable.externalCrmId, p.apolloId))
        .limit(1);
      if (existing) {
        skipped.push({ apolloId: p.apolloId, reason: "already_imported" });
        continue;
      }
    }

    const { id: companyId, created: companyCreated } = await upsertCompany(p);

    const email = mode === "fixture" ? buildSampleEmail(p.firstName, p.lastName, p.organizationDomain, p.organizationName) : null;
    const contactStatus = mode === "fixture" ? "sample" : "missing_contact";

    const contactSourceFields = [
      p.linkedinUrl ? "linkedinUrl" : null,
      p.twitterUrl ? "twitterUrl" : null,
      p.department ? "department" : null,
      p.location ? "location" : null,
    ].filter(Boolean) as string[];

    const [contact] = await db
      .insert(contactsTable)
      .values({
        firstName: p.firstName || (p.organizationName ?? "Contact").split(" ")[0],
        lastName: p.lastName || "",
        email,
        title: p.title,
        companyId,
        isDecisionMaker: p.seniority ? DECISION_MAKER_SENIORITIES.has(p.seniority) : false,
        authorityLevel: p.seniority,
        department: p.department,
        location: p.location,
        linkedinUrl: p.linkedinUrl,
        twitterUrl: p.twitterUrl,
        status: "active",
        contactStatus,
        externalCrmId: p.apolloId,
        lastSyncedAt: new Date(),
        enrichmentSources: contactSourceFields.length ? mergeSources(null, contactSourceFields) : undefined,
      })
      .returning();

    const [lead] = await db
      .insert(leadsTable)
      .values({
        companyId,
        contactId: contact.id,
        source: "apollo",
        status: "new",
        channelSource: "apollo_search",
        externalCrmId: p.apolloId,
        createdByMode: modeLabel,
        lastSyncedAt: new Date(),
      })
      .returning();

    await db.insert(activitiesTable).values({
      action: "lead_created",
      description: `Lead imported from Apollo${mode === "fixture" ? " (sample)" : ""}: ${p.firstName} ${p.lastName} @ ${p.organizationName ?? "—"}`,
      entityType: "lead",
      entityId: lead.id,
      performedBy: "apollo_import",
    });

    // Surface near-duplicates for review (mode-gated inside executeOrQueue).
    await checkDuplicatesOnCreate("contact", contact.id);
    if (companyCreated) await checkDuplicatesOnCreate("company", companyId);

    // Same AI enrich+score pipeline as manual "Add Lead" (fire-and-forget).
    void enrichAndScoreLead(lead.id, {
      name: p.organizationName ?? `${p.firstName} ${p.lastName}`.trim(),
      company: p.organizationName,
      source: "apollo",
    });

    imported.push({ apolloId: p.apolloId, contactId: contact.id, leadId: lead.id, companyId, email, contactStatus });
  }

  return { mode, imported, skipped };
}

// ---------------------------------------------------------------------------
// Enrichment (credit sink) — reveal emails for already-imported contacts
// ---------------------------------------------------------------------------

export interface ApolloEnrichOptions {
  /** Also capture a phone number from the enrichment response. Apollo delivers
   *  *freshly-revealed* mobile numbers asynchronously (webhook-only), so sync
   *  capture returns already-known numbers — no extra credit, may be empty. */
  revealPhone?: boolean;
}

export interface ApolloEnrichResult {
  mode: ApolloMode;
  enriched: Array<{ contactId: number; email: string | null; phone: string | null; contactStatus: string }>;
  creditsSpent: number;
  /** Batch counters so callers can show "revealed X of N" / "0 available". */
  emailsRevealed: number;
  phonesRevealed: number;
  /** True when a live async mobile reveal was dispatched to Apollo's webhook.
   *  Those numbers arrive minutes later via `handleApolloPhoneWebhook`, not here. */
  phoneRevealAsync: boolean;
  /** How many contacts a webhook mobile-reveal was requested for. */
  phoneRevealsRequested: number;
}

interface ApolloPhone {
  raw_number?: string | null;
  sanitized_number?: string | null;
  type_cd?: string | null;
}

interface ApolloMatch {
  id?: string | null;
  email?: string | null;
  email_status?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  title?: string | null;
  seniority?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  departments?: string[] | null;
  subdepartments?: string[] | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  sanitized_phone?: string | null;
  phone_numbers?: Array<ApolloPhone | null> | null;
  // Full organization object — same shape `api_search` returns; fed to
  // `normalizeOrganization` to fill company columns on reveal.
  organization?: Record<string, any> | null;
}

/** Apollo's `bulk_match` echoes the FULL person (first_name/last_name/name) that
 *  the free `api_search` preview redacts. Derive clean name parts so we can
 *  backfill contacts that were imported with an empty last name. */
function nameFromMatch(m: ApolloMatch | null | undefined): { firstName: string | null; lastName: string | null } {
  if (!m) return { firstName: null, lastName: null };
  const full = (m.name ?? "").trim();
  const first = (m.first_name ?? "").trim() || (full ? full.split(/\s+/)[0] : "");
  const last = (m.last_name ?? "").trim() || (full ? full.split(/\s+/).slice(1).join(" ") : "");
  return { firstName: first || null, lastName: last || null };
}

/** Apollo returns the sentinel `email_not_unlocked@domain.com` (or null) when it
 *  can't/ won't reveal an address. Treat those as "no email" so we never persist
 *  a fake address (email-fabrication anti-pattern). */
function normalizeRevealedEmail(raw: string | null | undefined): string | null {
  const email = raw?.trim();
  if (!email || /email_not_unlocked/i.test(email)) return null;
  return email;
}

/** Best phone from a `phone_numbers` array — prefers a mobile line, then any
 *  line; within a line prefers E.164 `sanitized_number` over `raw_number`. */
function phoneFromArray(nums: Array<ApolloPhone | null> | null | undefined): string | null {
  const arr = (nums ?? []).filter((p): p is ApolloPhone => !!p && !!(p.sanitized_number || p.raw_number));
  if (arr.length === 0) return null;
  const chosen = arr.find((p) => p.type_cd === "mobile") ?? arr[0];
  return (chosen.sanitized_number || chosen.raw_number || "").trim() || null;
}

/** Best phone from a match's sync response — the `phone_numbers` array, then a
 *  top-level `sanitized_phone`. (Freshly-revealed mobiles are webhook-only.) */
function pickPhone(m: ApolloMatch | null | undefined): string | null {
  if (!m) return null;
  return phoneFromArray(m.phone_numbers) ?? (m.sanitized_phone?.trim() || null);
}

/** A non-mobile (work/HQ-direct) line from a match — captured as `workPhone`. */
function pickWorkPhone(m: ApolloMatch | null | undefined): string | null {
  const arr = (m?.phone_numbers ?? []).filter((p): p is ApolloPhone => !!p && !!(p.sanitized_number || p.raw_number));
  const work = arr.find((p) => p.type_cd && p.type_cd !== "mobile");
  return work ? (work.sanitized_number || work.raw_number || "").trim() || null : null;
}

/** City/state/country from a match, joined for the contact's `location`. */
function locationFromMatch(m: ApolloMatch | null | undefined): string | null {
  const parts = [m?.city, m?.state, m?.country].map((s) => (s ?? "").trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

/** Deterministic, clearly-fictional sample phone (555 = reserved test exchange).
 *  Only used in fixture mode so the pipeline can be demoed for $0. */
function buildSamplePhone(seed: number): string {
  const n = Math.abs(Math.trunc(seed));
  const mid = String(100 + (n % 900));
  const last = String(1000 + (n * 37) % 9000);
  return `+1-555-${mid}-${last}`;
}

export async function enrichContacts(
  contactIds: number[],
  opts: ApolloEnrichOptions = {},
): Promise<ApolloEnrichResult> {
  const revealPhone = opts.revealPhone === true;
  const ids = [...new Set(contactIds)].filter((n) => Number.isFinite(n));
  if (ids.length === 0) {
    return { mode: await getApolloMode(), enriched: [], creditsSpent: 0, emailsRevealed: 0, phonesRevealed: 0, phoneRevealAsync: false, phoneRevealsRequested: 0 };
  }

  const apiKey = await getApolloApiKey();
  const rows = await db
    .select({
      id: contactsTable.id,
      companyId: contactsTable.companyId,
      externalCrmId: contactsTable.externalCrmId,
      firstName: contactsTable.firstName,
      lastName: contactsTable.lastName,
      email: contactsTable.email,
      emailStatus: contactsTable.emailStatus,
      phone: contactsTable.phone,
      workPhone: contactsTable.workPhone,
      authorityLevel: contactsTable.authorityLevel,
      department: contactsTable.department,
      location: contactsTable.location,
      linkedinUrl: contactsTable.linkedinUrl,
      twitterUrl: contactsTable.twitterUrl,
      enrichmentSources: contactsTable.enrichmentSources,
      companyName: companiesTable.name,
      website: companiesTable.website,
    })
    .from(contactsTable)
    .leftJoin(companiesTable, eq(contactsTable.companyId, companiesTable.id))
    .where(inArray(contactsTable.id, ids));

  // Tag Apollo-supplied fields for provenance (merged onto any existing map).
  const apolloSources = (existing: Record<string, string> | null | undefined, fields: string[]) => {
    const out = { ...(existing ?? {}) };
    for (const f of fields) out[f] = "apollo";
    return out;
  };

  const enriched: ApolloEnrichResult["enriched"] = [];

  // Fixture / no-key: fill clearly-labeled sample emails, never live addresses.
  if (!apiKey) {
    for (const c of rows) {
      const email = c.email ?? buildSampleEmail(c.firstName, c.lastName, c.website ?? null, c.companyName ?? null);
      const phone = revealPhone ? c.phone ?? buildSamplePhone(c.id) : c.phone ?? null;
      const filled = [!c.email && email ? "email" : null, revealPhone && !c.phone && phone ? "phone" : null].filter(Boolean) as string[];
      await db
        .update(contactsTable)
        .set({ email, phone, contactStatus: "sample", lastSyncedAt: new Date(), enrichmentSources: apolloSources(c.enrichmentSources, filled) })
        .where(eq(contactsTable.id, c.id));
      enriched.push({ contactId: c.id, email, phone, contactStatus: "sample" });
    }
    return {
      mode: "fixture",
      enriched,
      creditsSpent: 0,
      emailsRevealed: enriched.filter((e) => e.email).length,
      phonesRevealed: enriched.filter((e) => e.phone).length,
      phoneRevealAsync: false,
      phoneRevealsRequested: 0,
    };
  }

  // Never re-reveal (and re-pay for) data we already have. A contact needs a live
  // Apollo call only when its email is missing, or a phone was requested and is
  // missing. Contacts that already have everything requested are returned with
  // their stored data and cost 0 credits.
  const hasStoredEmail = (c: (typeof rows)[number]) => !!normalizeRevealedEmail(c.email);
  const hasStoredPhone = (c: (typeof rows)[number]) => !!(c.phone && c.phone.trim());
  const needsEnrich = rows.filter((c) => !hasStoredEmail(c) || (revealPhone && !hasStoredPhone(c)));
  const needsIds = new Set(needsEnrich.map((c) => c.id));
  for (const c of rows) {
    if (needsIds.has(c.id)) continue;
    enriched.push({ contactId: c.id, email: c.email ?? null, phone: c.phone ?? null, contactStatus: "enriched" });
  }

  // Nothing left to fetch — everything requested is already on file (0 credits).
  if (needsEnrich.length === 0) {
    return {
      mode: "live",
      enriched,
      creditsSpent: 0,
      emailsRevealed: enriched.filter((e) => e.email).length,
      phonesRevealed: enriched.filter((e) => e.phone).length,
      phoneRevealAsync: false,
      phoneRevealsRequested: 0,
    };
  }

  // Hard per-request guard (live path only) — bound one call's credit spend.
  if (needsEnrich.length > MAX_ENRICH_PER_REQUEST) {
    throw new ApolloError(
      `Too many contacts in one enrichment request (${needsEnrich.length} > ${MAX_ENRICH_PER_REQUEST}). Enrich in smaller batches to control credit spend.`,
      422,
      "batch_too_large",
    );
  }

  // Soft monthly cap — blocks once this month's spend has hit the cap.
  await assertCreditBudget();

  // Async mobile reveal: only when phone requested AND a public webhook is
  // configured (Apollo delivers freshly-revealed mobiles there, ~8 credits each,
  // minutes later). Without a webhook we fall back to sync-capture of any number
  // already present in the response.
  const webhookUrl = revealPhone ? buildApolloWebhookUrl() : null;
  const asyncPhone = revealPhone && !!webhookUrl;

  // Apollo requires the reveal flags as QUERY params — in the body they are
  // silently ignored and every match comes back with no contact data.
  const query: Record<string, string> = { reveal_personal_emails: "true" };
  if (asyncPhone && webhookUrl) {
    query.reveal_phone_number = "true";
    query.webhook_url = webhookUrl;
  }

  // Live: Apollo bulk_match, ≤10 per call, reveal personal emails (~1 credit each).
  let creditsSpent = 0;
  let phoneRevealsRequested = 0;
  for (const group of chunk(needsEnrich, 10)) {
    const details = group.map((c) =>
      // Prefer the exact Apollo person id (stored at import). Apollo's search
      // preview redacts last_name + domain, so name/org matching often fails to
      // identify the person → null match → no email. The id matches exactly.
      c.externalCrmId && APOLLO_PERSON_ID_RE.test(c.externalCrmId)
        ? { id: c.externalCrmId }
        : {
            first_name: c.firstName,
            last_name: c.lastName || undefined,
            organization_name: c.companyName ?? undefined,
            domain: c.website ?? undefined,
          },
    );
    const data = await apolloRequest<{ matches?: Array<ApolloMatch | null> }>({
      endpoint: APOLLO_ENDPOINTS.bulkMatch,
      apiKey,
      method: "POST",
      query,
      body: { details },
    });
    const matches = data.matches ?? [];
    for (let i = 0; i < group.length; i++) {
      const c = group[i];
      const m = matches[i];
      const revealedEmail = normalizeRevealedEmail(m?.email);
      const existingEmail = normalizeRevealedEmail(c.email);
      // Never wipe an email we already have with a null reveal; only bill for a
      // genuinely new address.
      const email = revealedEmail ?? existingEmail ?? null;
      if (revealedEmail && !existingEmail) creditsSpent++;
      // Capture any phone already present in the sync response; never overwrite
      // an existing number with null.
      const phone = revealPhone ? pickPhone(m) : null;
      const contactStatus = email ? "enriched" : "missing_contact";
      const update: Record<string, any> = {
        contactStatus,
        lastSyncedAt: new Date(),
      };
      const filledFields: string[] = [];
      if (revealedEmail) { update.email = revealedEmail; filledFields.push("email"); }
      if (phone && !c.phone) { update.phone = phone; filledFields.push("phone"); }
      else if (phone) { update.phone = phone; }
      // The reveal echoes the full person — fill any still-empty contact columns
      // (never overwrite what we already have) and tag the provider.
      if (m?.email_status && !c.emailStatus) { update.emailStatus = m.email_status.trim(); filledFields.push("emailStatus"); }
      if (m?.seniority?.trim() && !c.authorityLevel) { update.authorityLevel = m.seniority.trim(); filledFields.push("authorityLevel"); }
      const workPhone = pickWorkPhone(m);
      if (workPhone && !c.workPhone) { update.workPhone = workPhone; filledFields.push("workPhone"); }
      const dept = humanizeToken(m?.departments?.[0]) || humanizeToken(m?.subdepartments?.[0]);
      if (dept && !c.department) { update.department = dept; filledFields.push("department"); }
      const loc = locationFromMatch(m);
      if (loc && !c.location) { update.location = loc; filledFields.push("location"); }
      if (m?.linkedin_url?.trim() && !c.linkedinUrl) { update.linkedinUrl = m.linkedin_url.trim(); filledFields.push("linkedinUrl"); }
      if (m?.twitter_url?.trim() && !c.twitterUrl) { update.twitterUrl = m.twitter_url.trim(); filledFields.push("twitterUrl"); }
      if (filledFields.length > 0) update.enrichmentSources = apolloSources(c.enrichmentSources, filledFields);
      // Backfill the name the search preview redacted — only when ours is empty,
      // so a manually-entered name is never clobbered. Runs even with no email.
      const revealedName = nameFromMatch(m);
      if (revealedName.firstName && !(c.firstName && c.firstName.trim())) update.firstName = revealedName.firstName;
      if (revealedName.lastName && !(c.lastName && c.lastName.trim())) update.lastName = revealedName.lastName;
      await db.update(contactsTable).set(update).where(eq(contactsTable.id, c.id));

      // Fill the company from the reveal's organization object (fill-empty). This
      // is where technologies / revenue / funding / keywords / org socials land.
      if (c.companyId) {
        const orgVals = orgToCompanyValues(normalizeOrganization(m?.organization as any));
        if (Object.keys(orgVals).length > 0) await fillEmptyCompanyById(c.companyId, orgVals);
      }

      enriched.push({ contactId: c.id, email, phone: phone ?? c.phone ?? null, contactStatus });

      // Register the async mobile reveal so the webhook can map it back later.
      if (asyncPhone && m?.id) {
        await recordPhonePending(m.id, c.id);
        phoneRevealsRequested++;
      }
    }
  }

  if (creditsSpent > 0) await recordCreditSpend(creditsSpent, "enrich", { contacts: needsEnrich.length });

  return {
    mode: "live",
    enriched,
    creditsSpent,
    emailsRevealed: enriched.filter((e) => e.email).length,
    phonesRevealed: enriched.filter((e) => e.phone).length,
    phoneRevealAsync: asyncPhone,
    phoneRevealsRequested,
  };
}

// ---------------------------------------------------------------------------
// Async mobile-reveal webhook — Apollo POSTs revealed numbers here minutes later
// ---------------------------------------------------------------------------

interface ApolloWebhookPerson {
  id?: string | null;
  status?: string | null;
  phone_numbers?: Array<ApolloPhone | null> | null;
}

export interface ApolloPhoneWebhookResult {
  updated: number;
  /** Person entries with no matching pending request (e.g. already resolved). */
  unmatched: number;
  /** Resolved to a contact but Apollo returned no usable number. */
  noNumber: number;
  creditsConsumed: number;
}

/** Handle Apollo's async phone-reveal callback. Payload shape:
 *  `{ credits_consumed, people: [{ id, status, phone_numbers: [...] }] }`.
 *  Correlates each person `id` (echoed from the bulk_match sync response) to the
 *  pending contact recorded at request time, then writes the mobile number. */
export async function handleApolloPhoneWebhook(payload: unknown): Promise<ApolloPhoneWebhookResult> {
  const body = (payload ?? {}) as { credits_consumed?: unknown; people?: unknown };
  const people: ApolloWebhookPerson[] = Array.isArray(body.people) ? (body.people as ApolloWebhookPerson[]) : [];
  let updated = 0;
  let unmatched = 0;
  let noNumber = 0;

  for (const person of people) {
    const apolloPersonId = person?.id ? String(person.id) : null;
    if (!apolloPersonId) {
      unmatched++;
      continue;
    }
    // Resolve (and mark completed) first, so a delivery with no number doesn't
    // leave the request stuck pending forever.
    const contactId = await resolvePhonePending(apolloPersonId);
    if (contactId == null) {
      unmatched++;
      continue;
    }
    const phone = phoneFromArray(person.phone_numbers);
    if (!phone) {
      noNumber++;
      continue;
    }
    await db
      .update(contactsTable)
      .set({ phone, lastSyncedAt: new Date() })
      .where(eq(contactsTable.id, contactId));
    updated++;
  }

  const creditsConsumed = Number(body.credits_consumed);
  if (Number.isFinite(creditsConsumed) && creditsConsumed > 0) {
    await recordCreditSpend(creditsConsumed, "phone_reveal", { people: people.length, updated });
  }

  return { updated, unmatched, noNumber, creditsConsumed: Number.isFinite(creditsConsumed) ? creditsConsumed : 0 };
}

// ---------------------------------------------------------------------------
// Enroll imported leads into an outreach sequence (Phase 4)
// ---------------------------------------------------------------------------

export interface ApolloEnrollResult {
  sequenceId: number;
  enrolled: Array<{ leadId: number; enrollmentId: number; email: string }>;
  skipped: Array<{ leadId: number; reason: string }>;
}

/** Enroll imported leads into a sequence by resolving each lead's contact email.
 *  Reuses the existing `enrollContact` (opt-out / collision / dup-enrollment
 *  checks; tri-mode gating happens later when the sequence engine sends). */
export async function enrollLeads(
  leadIds: number[],
  sequenceId: number,
  enrolledBy?: string,
): Promise<ApolloEnrollResult> {
  const ids = [...new Set(leadIds)].filter((n) => Number.isFinite(n));
  const enrolled: ApolloEnrollResult["enrolled"] = [];
  const skipped: ApolloEnrollResult["skipped"] = [];

  for (const leadId of ids) {
    const [row] = await db
      .select({
        leadId: leadsTable.id,
        email: contactsTable.email,
        firstName: contactsTable.firstName,
        lastName: contactsTable.lastName,
      })
      .from(leadsTable)
      .leftJoin(contactsTable, eq(leadsTable.contactId, contactsTable.id))
      .where(eq(leadsTable.id, leadId));

    if (!row) {
      skipped.push({ leadId, reason: "lead_not_found" });
      continue;
    }
    if (!row.email) {
      // Live-mode imports have no email until "Reveal email" runs enrichment.
      skipped.push({ leadId, reason: "missing_email" });
      continue;
    }

    const contactName = `${row.firstName ?? ""} ${row.lastName ?? ""}`.trim() || undefined;
    const result = await enrollContact({ sequenceId, contactEmail: row.email, contactName, leadId, enrolledBy });
    if (result.success && result.enrollmentId != null) {
      enrolled.push({ leadId, enrollmentId: result.enrollmentId, email: row.email });
    } else {
      skipped.push({ leadId, reason: result.error ?? "enroll_failed" });
    }
  }

  return { sequenceId, enrolled, skipped };
}
