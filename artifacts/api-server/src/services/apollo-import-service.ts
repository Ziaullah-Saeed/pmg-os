import { db, companiesTable, contactsTable, leadsTable, activitiesTable } from "@workspace/db";
import { eq, ilike, inArray } from "drizzle-orm";
import {
  apolloRequest,
  getApolloApiKey,
  getApolloMode,
  assertCreditBudget,
  recordCreditSpend,
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

export interface ApolloEnrichResult {
  mode: ApolloMode;
  enriched: Array<{ contactId: number; email: string | null; contactStatus: string }>;
  creditsSpent: number;
}

interface ApolloMatch {
  email?: string | null;
}

export async function enrichContacts(contactIds: number[]): Promise<ApolloEnrichResult> {
  const ids = [...new Set(contactIds)].filter((n) => Number.isFinite(n));
  if (ids.length === 0) return { mode: await getApolloMode(), enriched: [], creditsSpent: 0 };

  const apiKey = await getApolloApiKey();
  const rows = await db
    .select({
      id: contactsTable.id,
      firstName: contactsTable.firstName,
      lastName: contactsTable.lastName,
      email: contactsTable.email,
      companyName: companiesTable.name,
      website: companiesTable.website,
    })
    .from(contactsTable)
    .leftJoin(companiesTable, eq(contactsTable.companyId, companiesTable.id))
    .where(inArray(contactsTable.id, ids));

  const enriched: ApolloEnrichResult["enriched"] = [];

  // Fixture / no-key: fill clearly-labeled sample emails, never live addresses.
  if (!apiKey) {
    for (const c of rows) {
      const email = c.email ?? buildSampleEmail(c.firstName, c.lastName, c.website ?? null, c.companyName ?? null);
      await db
        .update(contactsTable)
        .set({ email, contactStatus: "sample", lastSyncedAt: new Date() })
        .where(eq(contactsTable.id, c.id));
      enriched.push({ contactId: c.id, email, contactStatus: "sample" });
    }
    return { mode: "fixture", enriched, creditsSpent: 0 };
  }

  // Soft monthly cap — blocks once this month's spend has hit the cap.
  await assertCreditBudget();

  // Live: Apollo bulk_match, ≤10 per call, reveal personal emails (~1 credit each).
  let creditsSpent = 0;
  for (const group of chunk(rows, 10)) {
    const details = group.map((c) => ({
      first_name: c.firstName,
      last_name: c.lastName,
      organization_name: c.companyName ?? undefined,
      domain: c.website ?? undefined,
    }));
    const data = await apolloRequest<{ matches?: Array<ApolloMatch | null> }>({
      endpoint: APOLLO_ENDPOINTS.bulkMatch,
      apiKey,
      method: "POST",
      body: { details, reveal_personal_emails: true },
    });
    const matches = data.matches ?? [];
    for (let i = 0; i < group.length; i++) {
      const email = matches[i]?.email ?? null;
      const contactStatus = email ? "enriched" : "missing_contact";
      if (email) creditsSpent++;
      await db
        .update(contactsTable)
        .set({ email, contactStatus, lastSyncedAt: new Date() })
        .where(eq(contactsTable.id, group[i].id));
      enriched.push({ contactId: group[i].id, email, contactStatus });
    }
  }

  if (creditsSpent > 0) await recordCreditSpend(creditsSpent, "enrich", { contacts: rows.length });

  return { mode: "live", enriched, creditsSpent };
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
