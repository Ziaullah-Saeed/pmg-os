import { db, contactsTable, companiesTable, leadsTable, opportunitiesTable, activitiesTable } from "@workspace/db";
import { eq, and, ne, ilike, or, sql } from "drizzle-orm";
import { logAudit } from "./audit-service";
import { createNotification } from "./notification-service";

type DuplicateMatch = {
  id: number;
  matchScore: number;
  matchReasons: string[];
};

export async function findContactDuplicates(contactId?: number): Promise<Array<{ primary: any; duplicates: DuplicateMatch[] }>> {
  const contacts = contactId
    ? await db.select().from(contactsTable).where(eq(contactsTable.id, contactId))
    : await db.select().from(contactsTable).where(eq(contactsTable.status, "active"));

  const results: Array<{ primary: any; duplicates: DuplicateMatch[] }> = [];

  for (const contact of contacts) {
    const duplicates: DuplicateMatch[] = [];

    if (contact.email) {
      const emailMatches = await db.select().from(contactsTable)
        .where(and(
          eq(contactsTable.email, contact.email),
          ne(contactsTable.id, contact.id),
        ));
      for (const match of emailMatches) {
        const existing = duplicates.find(d => d.id === match.id);
        if (existing) {
          existing.matchScore += 50;
          existing.matchReasons.push("email_exact");
        } else {
          duplicates.push({ id: match.id, matchScore: 90, matchReasons: ["email_exact"] });
        }
      }
    }

    if (contact.firstName && contact.lastName) {
      const nameMatches = await db.select().from(contactsTable)
        .where(and(
          ilike(contactsTable.firstName, contact.firstName),
          ilike(contactsTable.lastName, contact.lastName),
          ne(contactsTable.id, contact.id),
        ));
      for (const match of nameMatches) {
        const existing = duplicates.find(d => d.id === match.id);
        if (existing) {
          existing.matchScore += 30;
          existing.matchReasons.push("name_exact");
        } else {
          duplicates.push({ id: match.id, matchScore: 60, matchReasons: ["name_exact"] });
        }
      }
    }

    if (contact.phone) {
      const phoneMatches = await db.select().from(contactsTable)
        .where(and(
          eq(contactsTable.phone, contact.phone),
          ne(contactsTable.id, contact.id),
        ));
      for (const match of phoneMatches) {
        const existing = duplicates.find(d => d.id === match.id);
        if (existing) {
          existing.matchScore += 40;
          existing.matchReasons.push("phone_exact");
        } else {
          duplicates.push({ id: match.id, matchScore: 70, matchReasons: ["phone_exact"] });
        }
      }
    }

    if (duplicates.length > 0) {
      results.push({ primary: contact, duplicates: [...duplicates].sort((a, b) => b.matchScore - a.matchScore) });
    }
  }

  return results;
}

export async function findCompanyDuplicates(companyId?: number): Promise<Array<{ primary: any; duplicates: DuplicateMatch[] }>> {
  const companies = companyId
    ? await db.select().from(companiesTable).where(eq(companiesTable.id, companyId))
    : await db.select().from(companiesTable);

  const results: Array<{ primary: any; duplicates: DuplicateMatch[] }> = [];

  for (const company of companies) {
    const duplicates: DuplicateMatch[] = [];

    const nameMatches = await db.select().from(companiesTable)
      .where(and(
        ilike(companiesTable.name, company.name),
        ne(companiesTable.id, company.id),
      ));
    for (const match of nameMatches) {
      duplicates.push({ id: match.id, matchScore: 85, matchReasons: ["name_exact"] });
    }

    if (company.website) {
      const websiteMatches = await db.select().from(companiesTable)
        .where(and(
          eq(companiesTable.website, company.website),
          ne(companiesTable.id, company.id),
        ));
      for (const match of websiteMatches) {
        const existing = duplicates.find(d => d.id === match.id);
        if (existing) {
          existing.matchScore += 40;
          existing.matchReasons.push("website_exact");
        } else {
          duplicates.push({ id: match.id, matchScore: 80, matchReasons: ["website_exact"] });
        }
      }
    }

    if (duplicates.length > 0) {
      results.push({ primary: company, duplicates: [...duplicates].sort((a, b) => b.matchScore - a.matchScore) });
    }
  }

  return results;
}

export async function mergeContacts(primaryId: number, duplicateId: number): Promise<{ success: boolean; error?: string }> {
  const [primary] = await db.select().from(contactsTable).where(eq(contactsTable.id, primaryId));
  const [duplicate] = await db.select().from(contactsTable).where(eq(contactsTable.id, duplicateId));
  if (!primary || !duplicate) return { success: false, error: "One or both contacts not found" };

  const mergedData: Record<string, unknown> = {};
  if (!primary.email && duplicate.email) mergedData.email = duplicate.email;
  if (!primary.phone && duplicate.phone) mergedData.phone = duplicate.phone;
  if (!primary.title && duplicate.title) mergedData.title = duplicate.title;
  if (!primary.linkedinUrl && duplicate.linkedinUrl) mergedData.linkedinUrl = duplicate.linkedinUrl;
  if (!primary.notes && duplicate.notes) mergedData.notes = duplicate.notes;
  else if (primary.notes && duplicate.notes) mergedData.notes = `${primary.notes}\n---Merged---\n${duplicate.notes}`;

  if (Object.keys(mergedData).length > 0) {
    await db.update(contactsTable).set(mergedData).where(eq(contactsTable.id, primaryId));
  }

  await db.update(leadsTable).set({ contactId: primaryId }).where(eq(leadsTable.contactId, duplicateId));
  await db.update(opportunitiesTable).set({ contactId: primaryId }).where(eq(opportunitiesTable.contactId, duplicateId));
  await db.update(activitiesTable).set({ entityId: primaryId })
    .where(and(eq(activitiesTable.entityType, "contact"), eq(activitiesTable.entityId, duplicateId)));

  await db.update(contactsTable).set({ status: "merged", notes: `Merged into contact #${primaryId}` })
    .where(eq(contactsTable.id, duplicateId));

  await logAudit({
    eventType: "contact_merged",
    domain: "crm",
    action: "merge_contacts",
    description: `Contact #${duplicateId} merged into #${primaryId}`,
    entityType: "contact",
    entityId: primaryId,
    actor: "dedup_service",
    actorType: "system",
    metadata: { primaryId, duplicateId, mergedFields: Object.keys(mergedData) },
  });

  await createNotification({
    type: "contact_merged",
    severity: "info",
    title: "Contacts Merged",
    message: `Contact "${duplicate.firstName} ${duplicate.lastName}" merged into "${primary.firstName} ${primary.lastName}"`,
    domain: "crm",
    entityType: "contact",
    entityId: primaryId,
    actor: "dedup_service",
  });

  return { success: true };
}

export async function mergeCompanies(primaryId: number, duplicateId: number): Promise<{ success: boolean; error?: string }> {
  const [primary] = await db.select().from(companiesTable).where(eq(companiesTable.id, primaryId));
  const [duplicate] = await db.select().from(companiesTable).where(eq(companiesTable.id, duplicateId));
  if (!primary || !duplicate) return { success: false, error: "One or both companies not found" };

  const mergedData: Record<string, unknown> = {};
  if (!primary.website && duplicate.website) mergedData.website = duplicate.website;
  if (!primary.revenue && duplicate.revenue) mergedData.revenue = duplicate.revenue;
  if (!primary.size && duplicate.size) mergedData.size = duplicate.size;
  if (!primary.painPoints && duplicate.painPoints) mergedData.painPoints = duplicate.painPoints;
  if (!primary.notes && duplicate.notes) mergedData.notes = duplicate.notes;
  else if (primary.notes && duplicate.notes) mergedData.notes = `${primary.notes}\n---Merged---\n${duplicate.notes}`;

  if (primary.fitScore === null && duplicate.fitScore !== null) mergedData.fitScore = duplicate.fitScore;
  else if (primary.fitScore !== null && duplicate.fitScore !== null) {
    mergedData.fitScore = Math.max(primary.fitScore, duplicate.fitScore);
  }

  if (Object.keys(mergedData).length > 0) {
    await db.update(companiesTable).set(mergedData).where(eq(companiesTable.id, primaryId));
  }

  await db.update(contactsTable).set({ companyId: primaryId }).where(eq(contactsTable.companyId, duplicateId));
  await db.update(leadsTable).set({ companyId: primaryId }).where(eq(leadsTable.companyId, duplicateId));
  await db.update(opportunitiesTable).set({ companyId: primaryId }).where(eq(opportunitiesTable.companyId, duplicateId));
  await db.update(activitiesTable).set({ entityId: primaryId })
    .where(and(eq(activitiesTable.entityType, "company"), eq(activitiesTable.entityId, duplicateId)));

  await db.update(companiesTable).set({ status: "merged", notes: `Merged into company #${primaryId}` })
    .where(eq(companiesTable.id, duplicateId));

  await logAudit({
    eventType: "company_merged",
    domain: "crm",
    action: "merge_companies",
    description: `Company #${duplicateId} merged into #${primaryId}`,
    entityType: "company",
    entityId: primaryId,
    actor: "dedup_service",
    actorType: "system",
    metadata: { primaryId, duplicateId, mergedFields: Object.keys(mergedData) },
  });

  await createNotification({
    type: "company_merged",
    severity: "info",
    title: "Companies Merged",
    message: `"${duplicate.name}" merged into "${primary.name}"`,
    domain: "crm",
    entityType: "company",
    entityId: primaryId,
    actor: "dedup_service",
  });

  return { success: true };
}

export async function checkDuplicatesOnCreate(entityType: "contact" | "company", entityId: number): Promise<void> {
  try {
    if (entityType === "contact") {
      const dupes = await findContactDuplicates(entityId);
      if (dupes.length > 0 && dupes[0].duplicates.length > 0) {
        const topMatch = dupes[0].duplicates[0];
        await createNotification({
          type: "duplicate_detected",
          severity: "warning",
          title: "Potential Duplicate Contact",
          message: `Contact #${entityId} may be a duplicate of #${topMatch.id} (${topMatch.matchScore}% match: ${topMatch.matchReasons.join(", ")})`,
          domain: "crm",
          entityType: "contact",
          entityId,
          actor: "dedup_service",
        });
      }
    } else {
      const dupes = await findCompanyDuplicates(entityId);
      if (dupes.length > 0 && dupes[0].duplicates.length > 0) {
        const topMatch = dupes[0].duplicates[0];
        await createNotification({
          type: "duplicate_detected",
          severity: "warning",
          title: "Potential Duplicate Company",
          message: `Company #${entityId} may be a duplicate of #${topMatch.id} (${topMatch.matchScore}% match: ${topMatch.matchReasons.join(", ")})`,
          domain: "crm",
          entityType: "company",
          entityId,
          actor: "dedup_service",
        });
      }
    }
  } catch (err) {
    console.error("[DedupService] Check failed:", err);
  }
}
