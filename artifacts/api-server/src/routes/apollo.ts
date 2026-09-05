import { Router, type IRouter } from "express";
import {
  getApolloStatus,
  testApolloConnection,
  searchPeople,
  getApolloMode,
  ApolloError,
  type PeopleSearchFilters,
  type NormalizedPerson,
} from "../services/apollo-service";
import { importProspects, enrichContacts, enrollLeads, partitionEnriched } from "../services/apollo-import-service";
import { enrichCompaniesForContacts } from "../services/website-enrichment-service";
import { enrichContactsWithPDL } from "../services/pdl-service";
import { getSessionUser } from "../middleware/auth";

const router: IRouter = Router();

function apolloErrorStatus(err: any): number {
  return err instanceof ApolloError && err.status >= 400 && err.status < 600 ? err.status : 502;
}

// Connection state (DB only, no external call). live | fixture.
router.get("/apollo/status", async (_req, res): Promise<void> => {
  res.json(await getApolloStatus());
});

// People search — free preview. NO credits, NO emails/phones. Fixtures when
// no key is connected; live Apollo `api_search` when connected.
router.post("/apollo/search", async (req, res): Promise<void> => {
  try {
    const result = await searchPeople((req.body ?? {}) as PeopleSearchFilters);
    res.json(result);
  } catch (err: any) {
    res.status(apolloErrorStatus(err)).json({ error: err?.message ?? "Apollo search failed", code: err?.code ?? "apollo_error" });
  }
});

// Actively validate the connected key against Apollo's health endpoint.
router.post("/apollo/test", async (_req, res): Promise<void> => {
  try {
    const result = await testApolloConnection();
    res.json(result);
  } catch (err: any) {
    const status = typeof err?.status === "number" && err.status >= 400 ? err.status : 502;
    res.status(status).json({ error: err?.message ?? "Apollo test failed", code: err?.code ?? "apollo_error" });
  }
});

// Import selected search results → company + contact + lead (FK model). No
// credits: fixture writes labeled sample emails, live leaves email null until
// /apollo/enrich. Reuses the manual-lead AI enrich+score pipeline.
router.post("/apollo/import", async (req, res): Promise<void> => {
  const people = Array.isArray(req.body?.people) ? (req.body.people as NormalizedPerson[]) : null;
  if (!people || people.length === 0) {
    res.status(400).json({ error: "Provide a non-empty `people` array to import.", code: "invalid_request" });
    return;
  }
  try {
    res.json(await importProspects(people));
  } catch (err: any) {
    res.status(apolloErrorStatus(err)).json({ error: err?.message ?? "Apollo import failed", code: err?.code ?? "apollo_error" });
  }
});

// Reveal contact data for already-imported contacts. Live = Apollo bulk_match
// (spends credits ~1/email); fixture = labeled sample data (no credits). Pass
// `revealPhone: true` to also capture any phone Apollo returns synchronously
// (freshly-revealed mobiles are webhook-only and not consumed here).
router.post("/apollo/enrich", async (req, res): Promise<void> => {
  const contactIds = Array.isArray(req.body?.contactIds)
    ? (req.body.contactIds as unknown[]).map(Number).filter((n) => Number.isFinite(n))
    : null;
  if (!contactIds || contactIds.length === 0) {
    res.status(400).json({ error: "Provide a non-empty `contactIds` array to enrich.", code: "invalid_request" });
    return;
  }
  const revealPhone = req.body?.revealPhone === true;
  try {
    // Enrich once: never re-process a contact that already has a revealed email.
    // Everything below runs only on the still-unenriched subset.
    const { toEnrich, alreadyEnriched } = await partitionEnriched(contactIds);
    if (toEnrich.length === 0) {
      res.json({
        mode: await getApolloMode(),
        enriched: [],
        creditsSpent: 0,
        emailsRevealed: 0,
        phonesRevealed: 0,
        phoneRevealAsync: false,
        phoneRevealsRequested: 0,
        companiesScanned: 0,
        socialsFilled: 0,
        pdlMatched: 0,
        pdlEmailLocked: false,
        pdlPhoneLocked: false,
        pdlErrors: [],
        alreadyEnriched: alreadyEnriched.length,
      });
      return;
    }
    // Enrichment cascade — CHEAPEST first, each step only fills columns still
    // empty, so nothing verified is ever overwritten and paid lookups are skipped
    // when free data already completed the record:
    // Free, idempotent website scan → website + Instagram/YouTube/TikTok + office
    // phone (channels no B2B provider carries). Runs once BEFORE paid steps (so a
    // site that already lists everything can skip them) and once AFTER (Apollo's
    // search redacts the company domain, so PDL often supplies the website the
    // first pass had no URL to read). Idempotent: already-complete companies are
    // skipped and hit no network. Best-effort, never fatal.
    let companiesScanned = 0;
    let websiteFilled = 0;
    const runWebsiteScan = async (label: string) => {
      try {
        const web = await enrichCompaniesForContacts(toEnrich);
        companiesScanned += web.filter((r) => r.scanned).length;
        websiteFilled += web.reduce((n, r) => n + r.filled.length, 0);
      } catch (e: any) {
        console.error(`[enrich] website scan (${label}) failed:`, e?.message ?? e);
      }
    };
    await runWebsiteScan("pre");
    // Apollo bulk_match → verified email (+ any sync phone). Credit sink.
    const result = await enrichContacts(toEnrich, { revealPhone });
    // 3) People Data Labs (paid, only when connected) → fills any still-missing
    //    email / mobile / person + company socials. Errors are surfaced, NOT
    //    swallowed, so a billed credit is never silently lost.
    let pdlMatched = 0;
    let pdlFieldsFilled = 0;
    let pdlEmailLocked = false;
    let pdlPhoneLocked = false;
    const pdlErrors: string[] = [];
    try {
      const pdl = await enrichContactsWithPDL(toEnrich);
      pdlMatched = pdl.matched;
      pdlFieldsFilled = pdl.fieldsFilled;
      pdlEmailLocked = pdl.emailLocked;
      pdlPhoneLocked = pdl.phoneLocked;
      pdlErrors.push(...pdl.errors);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error("[enrich] PDL failed:", msg);
      pdlErrors.push(msg);
    }
    // Second scan — now that Apollo/PDL may have filled a company website.
    await runWebsiteScan("post");
    res.json({
      ...result,
      companiesScanned,
      socialsFilled: websiteFilled + pdlFieldsFilled,
      pdlMatched,
      pdlEmailLocked,
      pdlPhoneLocked,
      pdlErrors,
      alreadyEnriched: alreadyEnriched.length,
    });
  } catch (err: any) {
    res.status(apolloErrorStatus(err)).json({ error: err?.message ?? "Apollo enrich failed", code: err?.code ?? "apollo_error" });
  }
});

// Enroll imported leads into an outreach sequence (one-click from the results
// list). Resolves each lead's contact email; leads without an email are skipped
// (reveal email first). Sends are tri-mode gated by the sequence engine.
router.post("/apollo/enroll", async (req, res): Promise<void> => {
  const leadIds = Array.isArray(req.body?.leadIds)
    ? (req.body.leadIds as unknown[]).map(Number).filter((n) => Number.isFinite(n))
    : null;
  const sequenceId = Number(req.body?.sequenceId);
  if (!leadIds || leadIds.length === 0 || !Number.isFinite(sequenceId)) {
    res.status(400).json({ error: "Provide a non-empty `leadIds` array and a `sequenceId`.", code: "invalid_request" });
    return;
  }
  try {
    const enrolledBy = getSessionUser(req)?.name ?? "system";
    res.json(await enrollLeads(leadIds, sequenceId, enrolledBy));
  } catch (err: any) {
    res.status(apolloErrorStatus(err)).json({ error: err?.message ?? "Apollo enroll failed", code: err?.code ?? "apollo_error" });
  }
});

export default router;
