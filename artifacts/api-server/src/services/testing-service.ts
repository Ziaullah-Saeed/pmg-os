import { db, leadsTable, opportunitiesTable, companiesTable, contactsTable, invoicesTable, contractsTable, reportsTable, knowledgeEntriesTable } from "@workspace/db";
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

export async function runTestSuite(suiteName?: string): Promise<TestSuiteResult[]> {
  const suites: Record<string, () => Promise<TestSuiteResult>> = {
    dummy_mode: runDummyModeTests,
    crm_integration: runCrmIntegrationTests,
    finance_integration: runFinanceIntegrationTests,
    event_bus_integration: runEventBusTests,
    tool_chain_integration: runToolChainTests,
    reporting_knowledge_integration: runReportingKnowledgeTests,
    e2e_workflow: runEndToEndWorkflowTests,
  };

  if (suiteName) {
    if (!suites[suiteName]) return [];
    return [await suites[suiteName]()];
  }

  const results: TestSuiteResult[] = [];
  for (const [name, runner] of Object.entries(suites)) {
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
    { name: "dummy_mode", description: "Tests dummy mode enable/disable and response simulation", testCount: 6 },
    { name: "crm_integration", description: "CRM entity CRUD: leads, companies, opportunities, contacts", testCount: 4 },
    { name: "finance_integration", description: "Finance entity CRUD: invoices, contracts", testCount: 2 },
    { name: "event_bus_integration", description: "Event emission, subscription, wildcard handlers", testCount: 2 },
    { name: "tool_chain_integration", description: "Tool registry, chain templates, lookup validation", testCount: 4 },
    { name: "reporting_knowledge_integration", description: "Knowledge entries, report generation", testCount: 2 },
    { name: "e2e_workflow", description: "Full business flows: lead→opp, invoice lifecycle, event-triggered reports, webhook→lead, CSV import", testCount: 5 },
  ];
}

export function getTestHistory(limit = 50) {
  return testResults.slice(-limit);
}
