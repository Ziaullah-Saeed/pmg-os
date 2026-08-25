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
  APOLLO_ENDPOINTS,
  type ApolloMode,
  type NormalizedPerson,
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

/** Upsert a company by domain (website) then case-insensitive name. */
async function upsertCompany(p: NormalizedPerson): Promise<{ id: number; created: boolean }> {
  if (p.organizationDomain) {
    const [byWeb] = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(eq(companiesTable.website, p.organizationDomain))
      .limit(1);
    if (byWeb) return { id: byWeb.id, created: false };
  }
  if (p.organizationName) {
    const [byName] = await db
      .select({ id: companiesTable.id })
      .from(companiesTable)
      .where(ilike(companiesTable.name, p.organizationName))
      .limit(1);
    if (byName) return { id: byName.id, created: false };
  }
  const [created] = await db
    .insert(companiesTable)
    .values({
      name: p.organizationName ?? "Unknown Company",
      industry: p.industry ?? "cybersecurity",
      website: p.organizationDomain ?? null,
      size: headcountToSize(p.estimatedNumEmployees),
      location: p.location ?? null,
      status: "prospect",
      enrichmentSources: p.organizationDomain ? { website: "apollo" } : undefined,
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
        linkedinUrl: p.linkedinUrl,
        status: "active",
        contactStatus,
        externalCrmId: p.apolloId,
        lastSyncedAt: new Date(),
        enrichmentSources: p.linkedinUrl ? { linkedinUrl: "apollo" } : undefined,
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
  first_name?: string | null;
  last_name?: string | null;
  name?: string | null;
  title?: string | null;
  sanitized_phone?: string | null;
  phone_numbers?: Array<ApolloPhone | null> | null;
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
      externalCrmId: contactsTable.externalCrmId,
      firstName: contactsTable.firstName,
      lastName: contactsTable.lastName,
      email: contactsTable.email,
      phone: contactsTable.phone,
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
      const update: { contactStatus: string; lastSyncedAt: Date; email?: string; phone?: string; firstName?: string; lastName?: string; enrichmentSources?: Record<string, string> } = {
        contactStatus,
        lastSyncedAt: new Date(),
      };
      const filledFields: string[] = [];
      if (revealedEmail) { update.email = revealedEmail; filledFields.push("email"); }
      if (phone && !c.phone) { update.phone = phone; filledFields.push("phone"); }
      else if (phone) { update.phone = phone; }
      if (filledFields.length > 0) update.enrichmentSources = apolloSources(c.enrichmentSources, filledFields);
      // Backfill the name the search preview redacted — only when ours is empty,
      // so a manually-entered name is never clobbered. Runs even with no email.
      const revealedName = nameFromMatch(m);
      if (revealedName.firstName && !(c.firstName && c.firstName.trim())) update.firstName = revealedName.firstName;
      if (revealedName.lastName && !(c.lastName && c.lastName.trim())) update.lastName = revealedName.lastName;
      await db.update(contactsTable).set(update).where(eq(contactsTable.id, c.id));
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
