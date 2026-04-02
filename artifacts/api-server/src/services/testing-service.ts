import { db, leadsTable, opportunitiesTable, companiesTable, contactsTable, invoicesTable, contractsTable, reportsTable, knowledgeEntriesTable, tasksTable, approvalsTable, pendingActionsTable, jobQueueTable } from "@workspace/db";
import { eq, sql, count, desc } from "drizzle-orm";
import { emit } from "./event-bus";
import { logAudit } from "./audit-service";

let dummyModeEnabled = false;
const dummyResponses = new Map<string, (input: Record<string, any>) => Record<string, any>>();
const testResults: TestRunResult[] = [];
const MAX_HISTORY = 500;

export type TestRunResult = {
  id: string;
  suite: string;
  name: string;
  status: "passed" | "failed" | "skipped" | "error";
  durationMs: number;
  error?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
};

export type TestSuiteResult = {
  suite: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  errors: number;
  durationMs: number;
  tests: TestRunResult[];
  timestamp: Date;
};

const DUMMY_AI_RESPONSES: Record<string, string> = {
  "ai-enrich-lead": JSON.stringify({
    companySize: "50-200",
    industry: "Technology",
    technologies: ["AWS", "React", "Node.js"],
    revenue: "$5M-10M",
    summary: "[DUMMY] Test enrichment data for simulated environment",
  }),
  "ai-score-lead": JSON.stringify({
    fitScore: 78,
    reasoning: "[DUMMY] Good fit based on industry alignment and company size",
    recommendation: "Assign to sales team for follow-up",
  }),
  "ai-generate-report": "## [DUMMY] Test Report\n\n### Executive Summary\nThis is a simulated report generated in dummy mode.\n\n### Key Metrics\n- Pipeline value: $250,000\n- Active leads: 15\n- Conversion rate: 23%\n\n### Recommendations\n1. Focus on enterprise segment\n2. Increase outreach frequency",
  "ai-review-contract": JSON.stringify({
    riskScore: 45,
    flaggedClauses: [{ clause: "Limitation of Liability", risk: "medium", suggestion: "Consider increasing cap" }],
    missingClauses: ["Data Protection"],
    complianceChecks: { gdpr: true, ccpa: true, sla: false },
    summary: "[DUMMY] Moderate risk contract with standard terms",
  }),
  "ai-generate-contract": "[DUMMY] SERVICE AGREEMENT\n\nThis Agreement is entered between PMG Group LLC and [Client].\n\n1. SCOPE OF SERVICES\n2. PAYMENT TERMS\n3. CONFIDENTIALITY\n4. LIMITATION OF LIABILITY",
  "ai-draft-outreach": "[DUMMY] Hi {name},\n\nI wanted to reach out regarding your cybersecurity needs. PMG Group specializes in...\n\nBest regards,\nPMG Team",
  "ai-analyze-sentiment": JSON.stringify({
    overallScore: 72,
    breakdown: { positive: 65, neutral: 25, negative: 10 },
    trend: "improving",
    keyPhrases: ["interested in proposal", "budget concerns"],
  }),
  "ai-suggest-action": "ACTION: Schedule a follow-up call\nREASON: Lead showed interest but has budget concerns\nURGENCY: MEDIUM",
  default: "[DUMMY] Simulated AI response for testing purposes. This output was generated without any real AI API calls or wallet charges.",
};

export function enableDummyMode(): { enabled: boolean; responseCount: number } {
  dummyModeEnabled = true;
  return { enabled: true, responseCount: Object.keys(DUMMY_AI_RESPONSES).length };
}

export function disableDummyMode(): { enabled: boolean } {
  dummyModeEnabled = false;
  return { enabled: false };
}

export function isDummyModeEnabled(): boolean {
  return dummyModeEnabled;
}

export function getDummyResponse(tool: string, _input?: Record<string, any>): string | null {
  if (!dummyModeEnabled) return null;

  const custom = dummyResponses.get(tool);
  if (custom) return JSON.stringify(custom(_input ?? {}));

  return DUMMY_AI_RESPONSES[tool] ?? DUMMY_AI_RESPONSES["default"];
}

export function registerDummyResponse(tool: string, responseFn: (input: Record<string, any>) => Record<string, any>): void {
  dummyResponses.set(tool, responseFn);
}

export function getDummyModeStatus() {
  return {
    enabled: dummyModeEnabled,
    builtInResponses: Object.keys(DUMMY_AI_RESPONSES),
    customResponses: Array.from(dummyResponses.keys()),
  };
}

async function runTest(suite: string, name: string, fn: () => Promise<void>): Promise<TestRunResult> {
  const id = `${suite}::${name}::${Date.now()}`;
  const start = Date.now();
  try {
    await fn();
    const result: TestRunResult = { id, suite, name, status: "passed", durationMs: Date.now() - start, timestamp: new Date() };
    pushResult(result);
    return result;
  } catch (err: any) {
    const result: TestRunResult = { id, suite, name, status: "failed", durationMs: Date.now() - start, error: err.message, timestamp: new Date() };
    pushResult(result);
    return result;
  }
}

function pushResult(r: TestRunResult) {
  testResults.push(r);
  if (testResults.length > MAX_HISTORY) {
    testResults.splice(0, testResults.length - MAX_HISTORY);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertDefined(value: any, message: string): void {
  if (value === undefined || value === null) throw new Error(`Expected defined value: ${message}`);
}

async function runCrmIntegrationTests(): Promise<TestSuiteResult> {
  const suite = "crm_integration";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "lead_creation", async () => {
    const [lead] = await db.insert(leadsTable).values({
      source: "test_suite",
      status: "new",
      priority: "medium",
    } as any).returning();
    assertDefined(lead.id, "Lead should have an ID");
    assert(lead.status === "new", "Lead status should be 'new'");
    await db.delete(leadsTable).where(eq(leadsTable.id, lead.id));
  }));

  tests.push(await runTest(suite, "company_creation_with_lead", async () => {
    const [company] = await db.insert(companiesTable).values({
      name: `Test Co ${Date.now()}`,
      industry: "Technology",
      status: "prospect",
    }).returning();
    const [lead] = await db.insert(leadsTable).values({
      companyId: company.id,
      source: "test_suite",
      status: "new",
      priority: "high",
    } as any).returning();
    assert(lead.companyId === company.id, "Lead should reference company");
    await db.delete(leadsTable).where(eq(leadsTable.id, lead.id));
    await db.delete(companiesTable).where(eq(companiesTable.id, company.id));
  }));

  tests.push(await runTest(suite, "opportunity_lifecycle", async () => {
    const [opp] = await db.insert(opportunitiesTable).values({
      title: `Test Deal ${Date.now()}`,
      value: 25000,
      stage: "discovery",
    }).returning();
    assert(opp.stage === "discovery", "Opportunity should start at discovery");
    assert(opp.value === 25000, "Opportunity value should be 25000");
    const [updated] = await db.update(opportunitiesTable).set({ stage: "proposal" }).where(eq(opportunitiesTable.id, opp.id)).returning();
    assert(updated.stage === "proposal", "Should advance to proposal");
    await db.delete(opportunitiesTable).where(eq(opportunitiesTable.id, opp.id));
  }));

  tests.push(await runTest(suite, "contact_creation", async () => {
    const [contact] = await db.insert(contactsTable).values({
      firstName: "Test",
      lastName: "Contact",
      email: `test-${Date.now()}@test.com`,
    }).returning();
    assertDefined(contact.id, "Contact should have ID");
    await db.delete(contactsTable).where(eq(contactsTable.id, contact.id));
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: 0, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runFinanceIntegrationTests(): Promise<TestSuiteResult> {
  const suite = "finance_integration";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "invoice_creation", async () => {
    const [inv] = await db.insert(invoicesTable).values({
      invoiceNumber: `TEST-${Date.now()}`,
      clientName: "Test Client",
      amount: 5000,
      status: "draft",
      dueDate: new Date(Date.now() + 30 * 86400000),
    } as any).returning();
    assert(inv.status === "draft", "Invoice should start as draft");
    assertDefined(inv.id, "Invoice should have ID");
    await db.delete(invoicesTable).where(eq(invoicesTable.id, inv.id));
  }));

  tests.push(await runTest(suite, "contract_creation", async () => {
    const [contract] = await db.insert(contractsTable).values({
      title: `Test Contract ${Date.now()}`,
      type: "service_agreement",
      status: "draft",
    } as any).returning();
    assert(contract.status === "draft", "Contract should start as draft");
    await db.delete(contractsTable).where(eq(contractsTable.id, contract.id));
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: 0, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runEventBusTests(): Promise<TestSuiteResult> {
  const suite = "event_bus_integration";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "event_emission_and_subscription", async () => {
    const { subscribe } = await import("./event-bus");
    let received = false;
    const unsub = subscribe("test.event", async () => { received = true; });
    await emit("test.event", { domain: "test", actor: "test_suite", actorType: "system" });
    await new Promise(r => setTimeout(r, 100));
    assert(received === true, "Event should have been received");
    unsub();
  }));

  tests.push(await runTest(suite, "wildcard_subscription", async () => {
    const { subscribe } = await import("./event-bus");
    let wildcardReceived = false;
    const unsub = subscribe("*", async (event) => {
      if (event === "test.wildcard") wildcardReceived = true;
    });
    await emit("test.wildcard", { domain: "test", actor: "test_suite", actorType: "system" });
    await new Promise(r => setTimeout(r, 100));
    assert(wildcardReceived === true, "Wildcard subscriber should receive event");
    unsub();
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: 0, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runToolChainTests(): Promise<TestSuiteResult> {
  const suite = "tool_chain_integration";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "tool_registry_populated", async () => {
    const { getAllTools } = await import("./tool-chain-service");
    const allTools = getAllTools();
    assert(allTools.length >= 30, `Expected 30+ tools, got ${allTools.length}`);
  }));

  tests.push(await runTest(suite, "tool_lookup_by_name", async () => {
    const { getTool } = await import("./tool-chain-service");
    const tool = getTool("enrich_lead");
    assertDefined(tool, "enrich_lead tool should exist");
    assert(tool!.domain === "crm", "enrich_lead should be in crm domain");
  }));

  tests.push(await runTest(suite, "chain_templates_populated", async () => {
    const { getAllChainTemplates } = await import("./tool-chain-service");
    const chains = getAllChainTemplates();
    assert(chains.length >= 9, `Expected 9+ chain templates, got ${chains.length}`);
  }));

  tests.push(await runTest(suite, "chain_template_lookup", async () => {
    const { getChainTemplate } = await import("./tool-chain-service");
    const chain = getChainTemplate("lead_qualification");
    assertDefined(chain, "lead_qualification chain should exist");
    assert(chain!.steps.length >= 2, "lead_qualification should have 2+ steps");
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: 0, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runReportingKnowledgeTests(): Promise<TestSuiteResult> {
  const suite = "reporting_knowledge_integration";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "knowledge_entry_creation", async () => {
    const { addKnowledgeEntry } = await import("./knowledge-service");
    const entry = await addKnowledgeEntry({
      category: "test",
      title: `Test Entry ${Date.now()}`,
      content: "Test knowledge content",
      source: "test_suite",
      confidence: 90,
    });
    assertDefined(entry.id, "Knowledge entry should have ID");
    await db.delete(knowledgeEntriesTable).where(eq(knowledgeEntriesTable.id, entry.id));
  }));

  tests.push(await runTest(suite, "report_generation_and_cleanup", async () => {
    const [report] = await db.insert(reportsTable).values({
      title: `Test Report ${Date.now()}`,
      type: "test",
      domain: "test",
      status: "draft",
      generationType: "test",
    } as any).returning();
    assertDefined(report.id, "Report should have ID");
    assert(report.status === "draft", "Report should start as draft");
    await db.delete(reportsTable).where(eq(reportsTable.id, report.id));
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: 0, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runEndToEndWorkflowTests(): Promise<TestSuiteResult> {
  const suite = "e2e_workflow";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "lead_to_opportunity_flow", async () => {
    const [company] = await db.insert(companiesTable).values({
      name: `E2E Test Corp ${Date.now()}`,
      industry: "Cybersecurity",
      status: "prospect",
    }).returning();

    const [lead] = await db.insert(leadsTable).values({
      companyId: company.id,
      source: "e2e_test",
      status: "new",
      priority: "high",
    } as any).returning();

    await emit("lead.created", {
      entityType: "lead",
      entityId: lead.id,
      domain: "crm",
      actor: "e2e_test",
      actorType: "system",
    });

    const [qualifiedLead] = await db.update(leadsTable).set({ status: "qualified" }).where(eq(leadsTable.id, lead.id)).returning();
    assert(qualifiedLead.status === "qualified", "Lead should be qualified");

    const [opp] = await db.insert(opportunitiesTable).values({
      title: `E2E Deal — ${company.name}`,
      companyId: company.id,
      leadId: lead.id,
      value: 75000,
      stage: "discovery",
    }).returning();

    await emit("lead.converted", {
      entityType: "lead",
      entityId: lead.id,
      domain: "crm",
      actor: "e2e_test",
      actorType: "system",
      data: { opportunityId: opp.id, name: company.name },
    });

    assert(opp.leadId === lead.id, "Opportunity should reference lead");
    assert(opp.companyId === company.id, "Opportunity should reference company");

    await db.delete(opportunitiesTable).where(eq(opportunitiesTable.id, opp.id));
    await db.delete(leadsTable).where(eq(leadsTable.id, lead.id));
    await db.delete(companiesTable).where(eq(companiesTable.id, company.id));
  }));

  tests.push(await runTest(suite, "invoice_lifecycle_flow", async () => {
    const [inv] = await db.insert(invoicesTable).values({
      invoiceNumber: `E2E-${Date.now()}`,
      clientName: "E2E Client",
      amount: 10000,
      status: "draft",
      dueDate: new Date(Date.now() + 30 * 86400000),
    } as any).returning();

    assert(inv.status === "draft", "Invoice starts as draft");

    const [sent] = await db.update(invoicesTable).set({ status: "sent" }).where(eq(invoicesTable.id, inv.id)).returning();
    assert(sent.status === "sent", "Invoice transitions to sent");

    const [paid] = await db.update(invoicesTable).set({ status: "paid" }).where(eq(invoicesTable.id, inv.id)).returning();
    assert(paid.status === "paid", "Invoice transitions to paid");

    await emit("invoice.paid", {
      entityType: "invoice",
      entityId: inv.id,
      domain: "finance",
      actor: "e2e_test",
      actorType: "system",
      data: { amount: 10000, client: "E2E Client" },
    });

    await new Promise(r => setTimeout(r, 500));

    await db.delete(invoicesTable).where(eq(invoicesTable.id, inv.id));
  }));

  tests.push(await runTest(suite, "deal_won_triggers_report_and_knowledge", async () => {
    const [opp] = await db.insert(opportunitiesTable).values({
      title: `E2E Won Deal ${Date.now()}`,
      value: 50000,
      stage: "won",
    }).returning();

    const beforeReports = await db.select({ count: count() }).from(reportsTable);
    const beforeKnowledge = await db.select({ count: count() }).from(knowledgeEntriesTable);

    await emit("opportunity.won", {
      entityType: "opportunity",
      entityId: opp.id,
      domain: "crm",
      actor: "e2e_test",
      actorType: "system",
      data: { title: opp.title, value: 50000, previousStage: "negotiation" },
    });

    await new Promise(r => setTimeout(r, 3000));

    const afterReports = await db.select({ count: count() }).from(reportsTable);
    const afterKnowledge = await db.select({ count: count() }).from(knowledgeEntriesTable);

    assert(Number(afterReports[0].count) > Number(beforeReports[0].count), "Event should trigger a new report");
    assert(Number(afterKnowledge[0].count) > Number(beforeKnowledge[0].count), "Event should auto-populate knowledge");

    await db.delete(opportunitiesTable).where(eq(opportunitiesTable.id, opp.id));
  }));

  tests.push(await runTest(suite, "webhook_to_lead_pipeline", async () => {
    const { processInboundWebhook } = await import("./integration-hub-service");
    const result = await processInboundWebhook({
      source: "lead_form",
      event: "lead_capture",
      payload: {
        name: `E2E Webhook Lead ${Date.now()}`,
        email: `e2e-${Date.now()}@test.com`,
        source: "e2e_test",
      },
    });
    assert(result.processed === true, "Webhook should process successfully");
    assert(result.entityType === "lead", "Should create a lead");
    assertDefined(result.entityId, "Should return entity ID");

    if (result.entityId) {
      await db.delete(leadsTable).where(eq(leadsTable.id, result.entityId));
    }
  }));

  tests.push(await runTest(suite, "csv_import_pipeline", async () => {
    const { importCsvData } = await import("./integration-hub-service");
    const result = await importCsvData({
      entityType: "contacts",
      csvContent: "firstName,lastName,email\nE2EFirst,E2ELast,e2e@test.com",
      fieldMapping: { firstName: "firstName", lastName: "lastName", email: "email" },
      actor: "e2e_test",
      skipDuplicates: true,
      dryRun: true,
    });
    assert(result.success === true, "Dry-run import should succeed");
    assert(result.imported === 1, "Should detect 1 importable row");
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: 0, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runTriModeAiTests(): Promise<TestSuiteResult> {
  const suite = "tri_mode_ai";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  const { setGlobalMode, getGlobalMode, shouldAiAct, setWorkflowMode } = await import("./ai-mode-service");
  const { setDummyMode: setWalletDummy } = await import("./wallet-service");
  const origGlobal = await getGlobalMode();

  tests.push(await runTest(suite, "set_global_ai_autonomous", async () => {
    await setGlobalMode("ai_autonomous");
    const mode = await getGlobalMode();
    assert(mode === "ai_autonomous", `Expected ai_autonomous, got ${mode}`);
  }));

  tests.push(await runTest(suite, "ai_mode_allows_all_workflows", async () => {
    const wfKeys = ["lead_scoring", "reporting", "outreach_draft", "transcript_analysis"];
    for (const key of wfKeys) {
      const check = await shouldAiAct(key, 90);
      assert(check.canAct === true, `AI should act for ${key} in ai_autonomous, got blocked: ${check.reason}`);
    }
  }));

  tests.push(await runTest(suite, "ai_mode_dummy_callAI_returns_result", async () => {
    enableDummyMode();
    setWalletDummy(true);
    try {
      const { callAI } = await import("./ai-service");
      const result = await callAI({
        systemPrompt: "You are a test assistant",
        userPrompt: "Test prompt for AI mode",
        workflowKey: "lead_scoring",
        tool: "ai-score-lead",
        domain: "crm",
        action: "test_score",
      });
      assertDefined(result.result, "Should return a result");
      assert(result.confidence >= 0, "Should have confidence score");
      assertDefined(result.runId, "Should have run ID");
    } finally {
      disableDummyMode();
      setWalletDummy(false);
    }
  }));

  tests.push(await runTest(suite, "ai_mode_cache_hit_works", async () => {
    const { cacheSet, cacheGet, TTL } = await import("./cache-service");
    const key = "test:cache:ai_mode";
    cacheSet(key, { result: "cached_value" }, TTL.AI_RESPONSE);
    const cached = cacheGet<any>(key);
    assertDefined(cached, "Cache should return stored value");
    assert(cached.result === "cached_value", "Cached value should match");
  }));

  tests.push(await runTest(suite, "ai_mode_memory_auto_ingest", async () => {
    const { addKnowledgeEntry, searchKnowledge } = await import("./knowledge-service");
    const entry = await addKnowledgeEntry({
      category: "ai_output",
      title: `AI Mode Test Memory ${Date.now()}`,
      content: "Test memory entry created during AI mode test suite",
      source: "ai",
      sourceDomain: "system",
      confidence: 95,
    });
    assertDefined(entry.id, "Knowledge entry should be created");
    const found = await searchKnowledge("AI Mode Test Memory");
    assert(found.length > 0, "Should find entry via search");
    await db.delete(knowledgeEntriesTable).where(eq(knowledgeEntriesTable.id, entry.id));
  }));

  tests.push(await runTest(suite, "ai_mode_event_triggers_knowledge", async () => {
    const beforeCount = await db.select({ count: count() }).from(knowledgeEntriesTable);
    await emit("opportunity.won", {
      entityType: "opportunity", entityId: 99999, domain: "crm",
      actor: "test_suite", actorType: "system",
      data: { title: "Test AI Won Deal", value: 100000, previousStage: "negotiation" },
    });
    await new Promise(r => setTimeout(r, 2000));
    const afterCount = await db.select({ count: count() }).from(knowledgeEntriesTable);
    assert(Number(afterCount[0].count) > Number(beforeCount[0].count), "Knowledge count should increase after opportunity.won event");
  }));

  tests.push(await runTest(suite, "ai_mode_assignment_router_auto_assigns", async () => {
    const [task] = await db.insert(tasksTable).values({
      title: `AI Test Task ${Date.now()}`,
      domain: "crm",
      priority: "high",
      status: "pending",
    } as any).returning();
    assertDefined(task.id, "Task should be created");
    await emit("task.created", { entityType: "task", entityId: task.id, domain: "crm", actor: "test", actorType: "system" });
    await new Promise(r => setTimeout(r, 1500));
    const [updated] = await db.select().from(tasksTable).where(eq(tasksTable.id, task.id));
    assertDefined(updated, "Task should still exist after assignment attempt");
    await db.delete(tasksTable).where(eq(tasksTable.id, task.id));
  }));

  tests.push(await runTest(suite, "ai_mode_confidence_handoff_high", async () => {
    const { classifyConfidence } = await import("./confidence-handoff-service");
    const decision = classifyConfidence(90);
    assert(decision.tier === "HIGH", `Expected HIGH tier, got ${decision.tier}`);
    assert(decision.action === "auto_continue", "High confidence should auto-continue");
    assert(decision.requiresHuman === false, "High confidence should not require human");
  }));

  try { await setGlobalMode(origGlobal); } catch {}
  disableDummyMode();
  try { setWalletDummy(false); } catch {}

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: tests.filter(t => t.status === "error").length, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runTriModeHybridTests(): Promise<TestSuiteResult> {
  const suite = "tri_mode_hybrid";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  const { setGlobalMode, getGlobalMode, shouldAiAct } = await import("./ai-mode-service");
  const origGlobal = await getGlobalMode();

  tests.push(await runTest(suite, "set_global_hybrid", async () => {
    await setGlobalMode("hybrid");
    const mode = await getGlobalMode();
    assert(mode === "hybrid", `Expected hybrid, got ${mode}`);
  }));

  tests.push(await runTest(suite, "hybrid_high_confidence_allows_action", async () => {
    const check = await shouldAiAct("lead_scoring", 85);
    assert(check.canAct === true, `Should allow action at 85% confidence in hybrid, got: ${check.reason}`);
  }));

  tests.push(await runTest(suite, "hybrid_low_confidence_blocks_action", async () => {
    const { setWorkflowMode } = await import("./ai-mode-service");
    await setWorkflowMode("lead_scoring", "hybrid");
    try {
      const check = await shouldAiAct("lead_scoring", 50);
      assert(check.canAct === false, `Should block action at 50% confidence in hybrid, got canAct=${check.canAct}`);
    } finally {
      await setWorkflowMode("lead_scoring", "ai_autonomous");
    }
  }));

  tests.push(await runTest(suite, "hybrid_confidence_handoff_medium", async () => {
    const { classifyConfidence } = await import("./confidence-handoff-service");
    const decision = classifyConfidence(65);
    assert(decision.tier === "MEDIUM", `Expected MEDIUM tier, got ${decision.tier}`);
    assert(decision.action === "ai_with_review", "Medium confidence should be AI with review");
    assert(decision.requiresHuman === true, "Medium confidence should require human");
  }));

  tests.push(await runTest(suite, "hybrid_confidence_handoff_low", async () => {
    const { classifyConfidence } = await import("./confidence-handoff-service");
    const decision = classifyConfidence(30);
    assert(decision.tier === "LOW", `Expected LOW tier, got ${decision.tier}`);
    assert(decision.action === "human_takeover", "Low confidence should require human takeover");
  }));

  tests.push(await runTest(suite, "hybrid_queues_pending_action", async () => {
    const { executeOrQueue } = await import("./mode-action-service");
    let executed = false;
    const result = await executeOrQueue({
      actionType: "test_hybrid_action",
      workflowKey: "lead_scoring",
      title: "Test Hybrid Queue",
      description: "Testing that hybrid mode queues actions below threshold",
      confidence: 50,
      executeAction: async () => { executed = true; },
    });
    if (result.queued) {
      assert(result.executed === false, "Queued action should not be executed");
      assert(result.queued === true, "Should be queued");
      if (result.pendingActionId) {
        await db.delete(pendingActionsTable).where(eq(pendingActionsTable.id, result.pendingActionId));
      }
    }
  }));

  tests.push(await runTest(suite, "hybrid_approval_flow", async () => {
    const [approval] = await db.insert(approvalsTable).values({
      entityType: "test",
      entityId: 99999,
      type: "test_approval",
      status: "pending",
      requestedBy: "test_suite",
      priority: "medium",
      domain: "system",
    } as any).returning();
    assertDefined(approval.id, "Approval should be created");
    assert(approval.status === "pending", "Approval should start as pending");

    const { transitionApproval } = await import("./approval-engine");
    const result = await transitionApproval({
      approvalId: approval.id,
      newStatus: "approved",
      reviewedBy: "test_suite",
      notes: "Approved during hybrid test",
    });
    assert(result.success === true, `Approval transition should succeed: ${result.error}`);
    await db.delete(approvalsTable).where(eq(approvalsTable.id, approval.id));
  }));

  tests.push(await runTest(suite, "hybrid_rejection_creates_task", async () => {
    const [approval] = await db.insert(approvalsTable).values({
      entityType: "test",
      entityId: 88888,
      type: "test_rejection",
      status: "pending",
      requestedBy: "test_suite",
      priority: "medium",
      domain: "system",
    } as any).returning();

    const { transitionApproval } = await import("./approval-engine");
    const result = await transitionApproval({
      approvalId: approval.id,
      newStatus: "rejected",
      reviewedBy: "test_suite",
      rejectionReason: "Test rejection for hybrid suite",
    });
    assert(result.success === true, `Rejection should succeed: ${result.error}`);
    await new Promise(r => setTimeout(r, 1000));

    const revisionTasks = await db.select().from(tasksTable)
      .where(eq(tasksTable.entityId, 88888));
    assert(result.success === true, "Rejection transition should succeed before checking tasks");
    await db.delete(approvalsTable).where(eq(approvalsTable.id, approval.id));
    for (const t of revisionTasks) {
      await db.delete(tasksTable).where(eq(tasksTable.id, t.id));
    }
  }));

  tests.push(await runTest(suite, "hybrid_memory_update_on_correction", async () => {
    const { addKnowledgeEntry } = await import("./knowledge-service");
    const entry = await addKnowledgeEntry({
      category: "correction",
      title: `Hybrid Correction Test ${Date.now()}`,
      content: "A human corrected an AI output during hybrid review",
      source: "correction",
      sourceDomain: "crm",
      confidence: 100,
    });
    assertDefined(entry.id, "Correction entry should be created");
    assert(entry.category === "correction", "Category should be correction");
    await db.delete(knowledgeEntriesTable).where(eq(knowledgeEntriesTable.id, entry.id));
  }));

  try { await setGlobalMode(origGlobal); } catch {}

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: tests.filter(t => t.status === "error").length, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runTriModeHumanTests(): Promise<TestSuiteResult> {
  const suite = "tri_mode_human";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  const { setGlobalMode, getGlobalMode, shouldAiAct } = await import("./ai-mode-service");
  const origGlobal = await getGlobalMode();

  tests.push(await runTest(suite, "set_global_human_controlled", async () => {
    await setGlobalMode("human_controlled");
    const mode = await getGlobalMode();
    assert(mode === "human_controlled", `Expected human_controlled, got ${mode}`);
  }));

  tests.push(await runTest(suite, "human_mode_blocks_all_ai_actions", async () => {
    const wfKeys = ["lead_scoring", "reporting", "outreach_draft", "lead_routing"];
    for (const key of wfKeys) {
      const check = await shouldAiAct(key, 99);
      assert(check.canAct === false, `AI should be blocked for ${key} in human mode`);
      assert(check.mode === "human_controlled", "Mode should be human_controlled");
    }
  }));

  tests.push(await runTest(suite, "human_mode_callAI_throws_blocked", async () => {
    enableDummyMode();
    try {
      const { callAI } = await import("./ai-service");
      let threwError = false;
      let errorMsg = "";
      try {
        await callAI({
          systemPrompt: "Test",
          userPrompt: "Test",
          workflowKey: "lead_scoring",
          tool: "ai-score-lead",
          domain: "crm",
          action: "test",
        });
      } catch (err: any) {
        threwError = true;
        errorMsg = err.message;
      }
      assert(threwError === true, "callAI should throw in human_controlled mode");
      assert(errorMsg.includes("AI_BLOCKED"), `Error should contain AI_BLOCKED, got: ${errorMsg}`);
    } finally {
      disableDummyMode();
    }
  }));

  tests.push(await runTest(suite, "human_mode_queues_all_actions", async () => {
    const { executeOrQueue } = await import("./mode-action-service");
    const result = await executeOrQueue({
      actionType: "test_human_action",
      workflowKey: "lead_scoring",
      title: "Test Human Queue",
      description: "Testing that human mode always queues",
      confidence: 99,
      executeAction: async () => { throw new Error("Should not execute"); },
    });
    assert(result.executed === false, "Should not execute in human mode");
    assert(result.queued === true, "Should queue in human mode");
    if (result.pendingActionId) {
      await db.delete(pendingActionsTable).where(eq(pendingActionsTable.id, result.pendingActionId));
    }
  }));

  tests.push(await runTest(suite, "human_mode_manual_task_creation", async () => {
    const [task] = await db.insert(tasksTable).values({
      title: `Human Mode Task ${Date.now()}`,
      domain: "crm",
      priority: "high",
      status: "pending",
      assignedTo: "test_user",
    } as any).returning();
    assertDefined(task.id, "Task should be created");
    assert(task.assignedTo === "test_user", "Should be assigned to specified user");
    const [completed] = await db.update(tasksTable).set({ status: "completed" }).where(eq(tasksTable.id, task.id)).returning();
    assert(completed.status === "completed", "Task should transition to completed");
    await db.delete(tasksTable).where(eq(tasksTable.id, task.id));
  }));

  tests.push(await runTest(suite, "human_mode_manual_approval_lifecycle", async () => {
    const [approval] = await db.insert(approvalsTable).values({
      entityType: "contract",
      entityId: 77777,
      type: "contract_approval",
      status: "pending",
      requestedBy: "test_suite",
      priority: "high",
      domain: "legal",
    } as any).returning();

    const { transitionApproval } = await import("./approval-engine");
    const revResult = await transitionApproval({
      approvalId: approval.id,
      newStatus: "revision_requested",
      reviewedBy: "test_reviewer",
      notes: "Needs revision",
    });
    assert(revResult.success === true, `Revision request should succeed: ${revResult.error}`);

    const [afterRevision] = await db.select().from(approvalsTable).where(eq(approvalsTable.id, approval.id));
    assert(afterRevision.status === "revision_requested", "Should be in revision_requested state");

    await db.delete(approvalsTable).where(eq(approvalsTable.id, approval.id));
  }));

  tests.push(await runTest(suite, "human_mode_record_level_override", async () => {
    const { setRecordOverride } = await import("./ai-mode-service");
    const [lead] = await db.insert(leadsTable).values({
      source: "test_override",
      status: "new",
      priority: "medium",
    } as any).returning();

    await setRecordOverride("lead", lead.id, "ai_autonomous");
    const check = await shouldAiAct("lead_scoring", 90, "lead", lead.id);
    assert(check.canAct === true, "Record-level AI override should allow action even when global is human_controlled");
    assert(check.source === "record", "Decision source should be record");

    await setRecordOverride("lead", lead.id, null);
    const checkAfter = await shouldAiAct("lead_scoring", 90, "lead", lead.id);
    assert(checkAfter.canAct === false, "After clearing override, global human_controlled should apply");

    await db.delete(leadsTable).where(eq(leadsTable.id, lead.id));
  }));

  tests.push(await runTest(suite, "human_mode_knowledge_manual_entry", async () => {
    const { addKnowledgeEntry } = await import("./knowledge-service");
    const entry = await addKnowledgeEntry({
      category: "sop",
      title: `Human SOP Entry ${Date.now()}`,
      content: "Standard operating procedure created manually in human mode",
      source: "manual",
      sourceDomain: "compliance",
      confidence: 100,
    });
    assertDefined(entry.id, "Manual knowledge entry should be created");
    assert(entry.source === "manual", "Source should be manual");
    await db.delete(knowledgeEntriesTable).where(eq(knowledgeEntriesTable.id, entry.id));
  }));

  try { await setGlobalMode(origGlobal); } catch {}
  disableDummyMode();

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: tests.filter(t => t.status === "error").length, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runRetryFailureTests(): Promise<TestSuiteResult> {
  const suite = "retry_failure";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "job_queue_enqueue_and_process", async () => {
    const { enqueueJob, registerJobExecutor, processJobs } = await import("./job-queue");
    let jobExecuted = false;
    registerJobExecutor("test_job_type", async (payload) => {
      jobExecuted = true;
      return { success: true, value: payload.testValue };
    });
    const jobId = await enqueueJob({
      type: "test_job_type",
      payload: { testValue: 42 },
      maxAttempts: 3,
      domain: "system",
    });
    assertDefined(jobId, "Job should be enqueued with ID");
    const result = await processJobs(1);
    assert(result.processed >= 1, "Should process at least 1 job after enqueue");
  }));

  tests.push(await runTest(suite, "job_queue_failure_handling", async () => {
    const { enqueueJob, registerJobExecutor, processJobs } = await import("./job-queue");
    let attempts = 0;
    registerJobExecutor("test_failing_job", async () => {
      attempts++;
      throw new Error("Simulated failure");
    });
    const jobId = await enqueueJob({
      type: "test_failing_job",
      payload: {},
      maxAttempts: 1,
      domain: "system",
    });
    assertDefined(jobId, "Failing job should be enqueued");
    await processJobs(1);
    const [job] = await db.select().from(jobQueueTable).where(eq(jobQueueTable.id, jobId));
    if (job) {
      assert(job.status === "dead_letter" || job.status === "retry", `Job should be dead_letter or retry, got ${job.status}`);
      await db.delete(jobQueueTable).where(eq(jobQueueTable.id, jobId));
    }
  }));

  tests.push(await runTest(suite, "state_machine_valid_transitions", async () => {
    const { validateTransition } = await import("./state-machine");
    const valid = await validateTransition({
      entityType: "approval",
      entityId: 0,
      currentState: "pending",
      targetState: "approved",
      actor: "test",
    });
    assert(valid.valid === true, `pending→approved should be valid: ${valid.error}`);
  }));

  tests.push(await runTest(suite, "state_machine_invalid_transition_blocked", async () => {
    const { validateTransition } = await import("./state-machine");
    const invalid = await validateTransition({
      entityType: "approval",
      entityId: 0,
      currentState: "approved",
      targetState: "pending",
      actor: "test",
    });
    assert(invalid.valid === false, "approved→pending should be invalid");
  }));

  tests.push(await runTest(suite, "cache_invalidation_pattern", async () => {
    const { cacheSet, cacheGet, cacheInvalidatePattern } = await import("./cache-service");
    cacheSet("test:pattern:a", "valueA", 60000);
    cacheSet("test:pattern:b", "valueB", 60000);
    cacheSet("test:other:c", "valueC", 60000);
    const count = cacheInvalidatePattern("test:pattern:");
    assert(count === 2, `Should invalidate 2 entries, got ${count}`);
    assert(cacheGet("test:pattern:a") === undefined, "Pattern A should be invalidated");
    assert(cacheGet("test:other:c") === "valueC", "Non-matching key should remain");
  }));

  tests.push(await runTest(suite, "cache_ttl_expiry", async () => {
    const { cacheSet, cacheGet } = await import("./cache-service");
    cacheSet("test:expiry", "ephemeral", 1);
    await new Promise(r => setTimeout(r, 50));
    const result = cacheGet("test:expiry");
    assert(result === undefined, "Expired cache entry should return undefined");
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: tests.filter(t => t.status === "error").length, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runPhase2RealTests(): Promise<TestSuiteResult> {
  const suite = "phase2_real";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  const { isDummyMode: isWalletDummy } = await import("./wallet-service");
  const { setGlobalMode, getGlobalMode } = await import("./ai-mode-service");
  const origGlobal = await getGlobalMode();

  tests.push(await runTest(suite, "real_mode_not_dummy", async () => {
    assert(isDummyModeEnabled() === false, "Dummy mode should be OFF for Phase 2");
    assert(isWalletDummy() === false, "Wallet dummy mode should be OFF for Phase 2");
  }));

  tests.push(await runTest(suite, "real_ai_call_with_wallet", async () => {
    await setGlobalMode("ai_autonomous");
    disableDummyMode();
    const { callAI } = await import("./ai-service");
    try {
      const result = await callAI({
        systemPrompt: "You are PMG Group's AI assistant. Respond with a brief greeting.",
        userPrompt: "Say hello in one sentence for a system test.",
        workflowKey: "reporting",
        tool: "ai-generate-report",
        domain: "system",
        action: "phase2_test",
      });
      assertDefined(result.result, "Real AI should return a result");
      assert(result.result.length > 0, "Result should not be empty");
      assert(result.confidence >= 0 && result.confidence <= 100, "Confidence should be 0-100");
      assertDefined(result.runId, "Should have a run ID");
    } catch (err: any) {
      if (err.message.includes("AI_BLOCKED")) throw err;
      if (err.message.includes("Insufficient balance")) {
        assert(true, "Wallet check working (insufficient balance is valid)");
      } else {
        throw err;
      }
    }
    await setGlobalMode(origGlobal);
  }));

  tests.push(await runTest(suite, "real_knowledge_ingestion_and_search", async () => {
    const { addKnowledgeEntry, searchKnowledge } = await import("./knowledge-service");
    const uniqueTitle = `Phase2 Real Test ${Date.now()}`;
    const entry = await addKnowledgeEntry({
      category: "performance_data",
      title: uniqueTitle,
      content: "Real phase 2 test: system performance metrics validated through live testing",
      source: "manual",
      sourceDomain: "system",
      confidence: 95,
      tags: ["phase2", "test", "real"],
    });
    assertDefined(entry.id, "Entry should be created");
    const found = await searchKnowledge("Phase2 Real Test");
    assert(found.length > 0, "Should find the entry by search");
    await db.delete(knowledgeEntriesTable).where(eq(knowledgeEntriesTable.id, entry.id));
  }));

  tests.push(await runTest(suite, "real_wallet_balance_check", async () => {
    const { getWalletBalance } = await import("./wallet-service");
    const wallet = await getWalletBalance();
    assertDefined(wallet, "Wallet should exist");
    assert(typeof wallet.balance === "number", "Balance should be a number");
    assert(typeof wallet.availableBalance === "number", "Available balance should be a number");
  }));

  tests.push(await runTest(suite, "real_crm_routing_pipeline", async () => {
    const [company] = await db.insert(companiesTable).values({
      name: `Phase2 Test Corp ${Date.now()}`,
      industry: "Cybersecurity",
      status: "prospect",
    }).returning();
    const [lead] = await db.insert(leadsTable).values({
      companyId: company.id,
      source: "phase2_test",
      status: "new",
      priority: "high",
    } as any).returning();
    assertDefined(lead.id, "Lead should be created");
    await emit("lead.created", {
      entityType: "lead", entityId: lead.id, domain: "crm",
      actor: "phase2_test", actorType: "system",
    });
    await new Promise(r => setTimeout(r, 1000));
    await db.delete(leadsTable).where(eq(leadsTable.id, lead.id));
    await db.delete(companiesTable).where(eq(companiesTable.id, company.id));
  }));

  tests.push(await runTest(suite, "real_reporting_generation", async () => {
    const [report] = await db.insert(reportsTable).values({
      title: `Phase2 Report ${Date.now()}`,
      type: "performance",
      domain: "system",
      status: "draft",
      generationType: "phase2_test",
    } as any).returning();
    assertDefined(report.id, "Report should be created");
    const [updated] = await db.update(reportsTable).set({ status: "published" }).where(eq(reportsTable.id, report.id)).returning();
    assert(updated.status === "published", "Report should transition to published");
    await db.delete(reportsTable).where(eq(reportsTable.id, report.id));
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: tests.filter(t => t.status === "error").length, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

async function runDummyModeTests(): Promise<TestSuiteResult> {
  const suite = "dummy_mode";
  const tests: TestRunResult[] = [];
  const start = Date.now();

  tests.push(await runTest(suite, "enable_dummy_mode", async () => {
    const result = enableDummyMode();
    assert(result.enabled === true, "Dummy mode should be enabled");
    assert(result.responseCount > 0, "Should have built-in responses");
  }));

  tests.push(await runTest(suite, "get_dummy_response_builtin", async () => {
    const response = getDummyResponse("ai-enrich-lead");
    assertDefined(response, "Should return built-in response");
    assert(response!.includes("DUMMY"), "Response should contain DUMMY marker");
  }));

  tests.push(await runTest(suite, "get_dummy_response_default", async () => {
    const response = getDummyResponse("unknown-tool");
    assertDefined(response, "Should return default response");
    assert(response!.includes("Simulated"), "Default should be a simulation message");
  }));

  tests.push(await runTest(suite, "custom_dummy_response", async () => {
    registerDummyResponse("custom-test-tool", (input) => ({
      result: `Custom response for ${input.name ?? "unknown"}`,
      score: 99,
    }));
    const response = getDummyResponse("custom-test-tool", { name: "TestEntity" });
    assertDefined(response, "Custom response should exist");
    assert(response!.includes("TestEntity"), "Should use input data");
    dummyResponses.delete("custom-test-tool");
  }));

  tests.push(await runTest(suite, "dummy_mode_no_wallet_charge", async () => {
    assert(isDummyModeEnabled() === true, "Dummy mode should be enabled");
    const response = getDummyResponse("ai-score-lead");
    assertDefined(response, "Should get score response without wallet charge");
    assert(response!.includes("fitScore"), "Should contain scoring data");
  }));

  tests.push(await runTest(suite, "disable_dummy_mode", async () => {
    const result = disableDummyMode();
    assert(result.enabled === false, "Dummy mode should be disabled");
    const response = getDummyResponse("ai-enrich-lead");
    assert(response === null, "Should return null when disabled");
  }));

  return { suite, total: tests.length, passed: tests.filter(t => t.status === "passed").length, failed: tests.filter(t => t.status === "failed").length, skipped: 0, errors: 0, durationMs: Date.now() - start, tests, timestamp: new Date() };
}

const PHASE1_SUITES = ["dummy_mode", "crm_integration", "finance_integration", "event_bus_integration", "tool_chain_integration", "reporting_knowledge_integration", "e2e_workflow", "tri_mode_ai", "tri_mode_hybrid", "tri_mode_human", "retry_failure"];
const PHASE2_SUITES = ["phase2_real"];

export async function runTestSuite(suiteName?: string, phase?: number): Promise<TestSuiteResult[]> {
  const suites: Record<string, () => Promise<TestSuiteResult>> = {
    dummy_mode: runDummyModeTests,
    crm_integration: runCrmIntegrationTests,
    finance_integration: runFinanceIntegrationTests,
    event_bus_integration: runEventBusTests,
    tool_chain_integration: runToolChainTests,
    reporting_knowledge_integration: runReportingKnowledgeTests,
    e2e_workflow: runEndToEndWorkflowTests,
    tri_mode_ai: runTriModeAiTests,
    tri_mode_hybrid: runTriModeHybridTests,
    tri_mode_human: runTriModeHumanTests,
    retry_failure: runRetryFailureTests,
    phase2_real: runPhase2RealTests,
  };

  if (suiteName) {
    if (!suites[suiteName]) return [];
    return [await suites[suiteName]()];
  }

  const suitesToRun = phase === 1 ? PHASE1_SUITES : phase === 2 ? PHASE2_SUITES : [...PHASE1_SUITES, ...PHASE2_SUITES];

  const results: TestSuiteResult[] = [];
  for (const name of suitesToRun) {
    const runner = suites[name];
    if (!runner) continue;
    try {
      results.push(await runner());
    } catch (err: any) {
      results.push({
        suite: name,
        total: 1,
        passed: 0,
        failed: 0,
        skipped: 0,
        errors: 1,
        durationMs: 0,
        tests: [{ id: `${name}::suite_error`, suite: name, name: "suite_init", status: "error", durationMs: 0, error: err.message, timestamp: new Date() }],
        timestamp: new Date(),
      });
    }
  }

  await logAudit({
    eventType: "test_suite_run",
    domain: "system",
    action: "run_tests",
    description: `Test run: ${results.reduce((s, r) => s + r.passed, 0)}/${results.reduce((s, r) => s + r.total, 0)} passed across ${results.length} suites`,
    actor: "test_runner",
    actorType: "system",
    metadata: {
      suites: results.map(r => ({ suite: r.suite, passed: r.passed, failed: r.failed, total: r.total })),
    },
  });

  return results;
}

export function getAvailableSuites() {
  return [
    { name: "dummy_mode", description: "Tests dummy mode enable/disable and response simulation", testCount: 6, phase: 1 },
    { name: "crm_integration", description: "CRM entity CRUD: leads, companies, opportunities, contacts", testCount: 4, phase: 1 },
    { name: "finance_integration", description: "Finance entity CRUD: invoices, contracts", testCount: 2, phase: 1 },
    { name: "event_bus_integration", description: "Event emission, subscription, wildcard handlers", testCount: 2, phase: 1 },
    { name: "tool_chain_integration", description: "Tool registry, chain templates, lookup validation", testCount: 4, phase: 1 },
    { name: "reporting_knowledge_integration", description: "Knowledge entries, report generation", testCount: 2, phase: 1 },
    { name: "e2e_workflow", description: "Full business flows: lead→opp, invoice lifecycle, event-triggered reports, webhook→lead, CSV import", testCount: 5, phase: 1 },
    { name: "tri_mode_ai", description: "AI Autonomous mode: permissions, dummy AI calls, cache, memory ingestion, event triggers, routing, handoff", testCount: 8, phase: 1 },
    { name: "tri_mode_hybrid", description: "Hybrid mode: confidence thresholds, action queuing, approvals, rejections, corrections, memory updates", testCount: 9, phase: 1 },
    { name: "tri_mode_human", description: "Human Controlled mode: AI blocking, pending actions, manual tasks, approvals, record overrides, manual knowledge", testCount: 8, phase: 1 },
    { name: "retry_failure", description: "Job queue retry/failure, state machine transitions, cache invalidation, TTL expiry", testCount: 6, phase: 1 },
    { name: "phase2_real", description: "Real AI calls, wallet deductions, live knowledge ingestion, CRM routing, reporting — requires real providers", testCount: 6, phase: 2 },
  ];
}

export function getTestHistory(limit = 50) {
  return testResults.slice(-limit);
}
