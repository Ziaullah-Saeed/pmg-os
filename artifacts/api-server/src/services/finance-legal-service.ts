import { db, invoicesTable, paymentsTable, expensesTable, contractsTable, qualityIssuesTable, sopsTable, approvalsTable, tasksTable } from "@workspace/db";
import { eq, and, lte, gte, sql } from "drizzle-orm";
import { callAI } from "./ai-service";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";
import { broadcast } from "./websocket-service";
import { emit } from "./event-bus";
import { validateTransition } from "./state-machine";
import { transitionApproval } from "./approval-engine";

const INVOICE_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent"],
  sent: ["viewed", "overdue", "partially_paid", "paid", "cancelled"],
  viewed: ["overdue", "partially_paid", "paid", "cancelled"],
  overdue: ["partially_paid", "paid", "cancelled", "written_off"],
  partially_paid: ["paid", "overdue", "cancelled"],
  paid: [],
  cancelled: ["draft"],
  written_off: [],
};

function validateInvoiceTransition(current: string, target: string): boolean {
  return (INVOICE_TRANSITIONS[current] ?? []).includes(target);
}

export async function transitionInvoice(params: {
  invoiceId: number;
  targetStatus: string;
  actor: string;
  notes?: string;
}): Promise<{ success: boolean; invoice?: any; error?: string }> {
  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.invoiceId));
  if (!invoice) return { success: false, error: "Invoice not found" };

  if (!validateInvoiceTransition(invoice.status, params.targetStatus)) {
    return { success: false, error: `Cannot transition invoice from "${invoice.status}" to "${params.targetStatus}". Allowed: ${(INVOICE_TRANSITIONS[invoice.status] ?? []).join(", ") || "none"}` };
  }

  const updateData: Record<string, any> = { status: params.targetStatus };
  if (params.targetStatus === "sent") {
    updateData.issuedAt = new Date();
    updateData.issuedBy = params.actor;
  }
  if (params.targetStatus === "paid") {
    updateData.paidAt = new Date();
  }

  const [updated] = await db.update(invoicesTable).set(updateData).where(eq(invoicesTable.id, params.invoiceId)).returning();

  await logAudit({
    eventType: "invoice_transition",
    domain: "finance_legal",
    action: `invoice_${params.targetStatus}`,
    description: `Invoice ${invoice.invoiceNumber} transitioned from "${invoice.status}" to "${params.targetStatus}"`,
    entityType: "invoice",
    entityId: params.invoiceId,
    actor: params.actor,
    actorType: "human",
    metadata: { previousStatus: invoice.status, newStatus: params.targetStatus, invoiceNumber: invoice.invoiceNumber },
  });

  const severityMap: Record<string, string> = { paid: "success", overdue: "error", cancelled: "warning", sent: "info" };
  await createNotification({
    type: `invoice_${params.targetStatus}`,
    severity: severityMap[params.targetStatus] ?? "info",
    title: `Invoice ${invoice.invoiceNumber}: ${params.targetStatus}`,
    message: `Invoice ${invoice.invoiceNumber} ($${invoice.totalAmount}) is now ${params.targetStatus}${params.notes ? `. ${params.notes}` : ""}`,
    domain: "finance_legal",
    entityType: "invoice",
    entityId: params.invoiceId,
    actor: params.actor,
  });

  broadcast("invoice_transition", { invoiceId: params.invoiceId, status: params.targetStatus, previousStatus: invoice.status });

  await emit(`invoice.${params.targetStatus}`, {
    entityType: "invoice",
    entityId: params.invoiceId,
    domain: "finance_legal",
    actor: params.actor,
    actorType: "human",
    data: { invoiceNumber: invoice.invoiceNumber, amount: invoice.totalAmount, previousStatus: invoice.status },
  });

  return { success: true, invoice: updated };
}

export async function recordPayment(params: {
  invoiceId: number;
  amount: number;
  method?: string;
  reference?: string;
  notes?: string;
  actor: string;
}): Promise<{ success: boolean; payment?: any; invoice?: any; error?: string }> {
  const [invoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.invoiceId));
  if (!invoice) return { success: false, error: "Invoice not found" };

  if (["draft", "paid", "cancelled", "written_off"].includes(invoice.status)) {
    return { success: false, error: `Cannot record payment on ${invoice.status} invoice` };
  }

  if (!params.amount || params.amount <= 0) {
    return { success: false, error: "Payment amount must be positive" };
  }

  const [payment] = await db.insert(paymentsTable).values({
    invoiceId: params.invoiceId,
    amount: params.amount,
    method: params.method ?? "bank_transfer",
    reference: params.reference,
    status: "completed",
    notes: params.notes,
  }).returning();

  const existingPayments = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(paymentsTable)
    .where(and(eq(paymentsTable.invoiceId!, params.invoiceId), eq(paymentsTable.status, "completed")));
  const totalPaid = Number(existingPayments[0]?.total ?? 0);

  let newStatus = invoice.status;
  if (totalPaid >= invoice.totalAmount) {
    newStatus = "paid";
  } else if (totalPaid > 0) {
    newStatus = "partially_paid";
  }

  if (newStatus !== invoice.status) {
    await transitionInvoice({ invoiceId: params.invoiceId, targetStatus: newStatus, actor: params.actor, notes: `Payment of $${params.amount} recorded` });
  }

  const [updatedInvoice] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, params.invoiceId));

  return { success: true, payment, invoice: updatedInvoice };
}

export async function checkOverdueInvoices(actor?: string): Promise<{ overdueCount: number; totalOverdue: number }> {
  const now = new Date();
  const overdueInvoices = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.status, "sent"), lte(invoicesTable.dueDate!, now)));

  let totalOverdue = 0;
  for (const inv of overdueInvoices) {
    await transitionInvoice({ invoiceId: inv.id, targetStatus: "overdue", actor: actor ?? "system", notes: "Auto-detected overdue" });
    totalOverdue += inv.totalAmount;
  }

  const viewedOverdue = await db.select().from(invoicesTable)
    .where(and(eq(invoicesTable.status, "viewed"), lte(invoicesTable.dueDate!, now)));

  for (const inv of viewedOverdue) {
    await transitionInvoice({ invoiceId: inv.id, targetStatus: "overdue", actor: actor ?? "system", notes: "Auto-detected overdue" });
    totalOverdue += inv.totalAmount;
  }

  return { overdueCount: overdueInvoices.length + viewedOverdue.length, totalOverdue };
}

const EXPENSE_TRANSITIONS: Record<string, string[]> = {
  pending: ["submitted"],
  submitted: ["approved", "rejected"],
  approved: ["paid", "cancelled"],
  rejected: ["pending"],
  paid: [],
  cancelled: [],
};

export async function submitExpense(params: {
  expenseId: number;
  actor: string;
}): Promise<{ success: boolean; approvalId?: number; error?: string }> {
  const [expense] = await db.select().from(expensesTable).where(eq(expensesTable.id, params.expenseId));
  if (!expense) return { success: false, error: "Expense not found" };

  if (expense.status !== "pending") {
    return { success: false, error: `Expense is "${expense.status}", must be "pending" to submit` };
  }

  await db.update(expensesTable).set({ status: "submitted" }).where(eq(expensesTable.id, params.expenseId));

  const [approval] = await db.insert(approvalsTable).values({
    entityType: "expense",
    entityId: params.expenseId,
    domain: "finance_legal",
    status: "pending",
    requestedBy: params.actor,
    priority: expense.amount >= 5000 ? "critical" : expense.amount >= 1000 ? "high" : "normal",
    reason: `Expense approval: ${expense.category} — $${expense.amount} from ${expense.vendor ?? "unknown vendor"}`,
    metadata: { category: expense.category, amount: expense.amount, vendor: expense.vendor },
  }).returning();

  await logAudit({
    eventType: "expense_submitted",
    domain: "finance_legal",
    action: "submit_expense",
    description: `Expense #${params.expenseId} ($${expense.amount}) submitted for approval`,
    entityType: "expense",
    entityId: params.expenseId,
    actor: params.actor,
    actorType: "human",
    metadata: { amount: expense.amount, category: expense.category },
  });

  await createNotification({
    type: "expense_submitted",
    severity: expense.amount >= 5000 ? "warning" : "info",
    title: `Expense Submitted: $${expense.amount}`,
    message: `${expense.category} expense for $${expense.amount} from ${expense.vendor ?? "unknown"} awaits approval.`,
    domain: "finance_legal",
    entityType: "expense",
    entityId: params.expenseId,
    actor: params.actor,
  });

  broadcast("expense_submitted", { expenseId: params.expenseId, amount: expense.amount, approvalId: approval.id });

  return { success: true, approvalId: approval.id };
}

export async function reviewExpense(params: {
  expenseId: number;
  decision: "approved" | "rejected";
  reviewer: string;
  notes?: string;
  rejectionReason?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!["approved", "rejected"].includes(params.decision)) {
    return { success: false, error: 'Decision must be "approved" or "rejected"' };
  }

  if (params.decision === "rejected" && !params.rejectionReason) {
    return { success: false, error: "Rejection reason is required when rejecting an expense" };
  }

  const [expense] = await db.select().from(expensesTable).where(eq(expensesTable.id, params.expenseId));
  if (!expense) return { success: false, error: "Expense not found" };

  if (expense.status !== "submitted") {
    return { success: false, error: `Expense is "${expense.status}", must be "submitted" for review` };
  }

  const [approval] = await db.select().from(approvalsTable)
    .where(and(eq(approvalsTable.entityType, "expense"), eq(approvalsTable.entityId, params.expenseId), eq(approvalsTable.status, "pending")));
  if (approval) {
    await transitionApproval({
      approvalId: approval.id,
      newStatus: params.decision,
      reviewedBy: params.reviewer,
      rejectionReason: params.rejectionReason,
      notes: params.notes,
    });
  }

  await db.update(expensesTable).set({
    status: params.decision,
    approvedBy: params.decision === "approved" ? params.reviewer : undefined,
  }).where(eq(expensesTable.id, params.expenseId));

  await logAudit({
    eventType: params.decision === "approved" ? "expense_approved" : "expense_rejected",
    domain: "finance_legal",
    action: `expense_${params.decision}`,
    description: `Expense #${params.expenseId} ($${expense.amount}) ${params.decision} by ${params.reviewer}`,
    entityType: "expense",
    entityId: params.expenseId,
    actor: params.reviewer,
    actorType: "human",
    metadata: { decision: params.decision, amount: expense.amount },
  });

  await createNotification({
    type: `expense_${params.decision}`,
    severity: params.decision === "approved" ? "success" : "warning",
    title: `Expense ${params.decision === "approved" ? "Approved" : "Rejected"}: $${expense.amount}`,
    message: params.decision === "approved"
      ? `Expense for $${expense.amount} has been approved by ${params.reviewer}.`
      : `Expense for $${expense.amount} was rejected. ${params.rejectionReason ?? ""}`,
    domain: "finance_legal",
    entityType: "expense",
    entityId: params.expenseId,
    actor: params.reviewer,
  });

  broadcast("expense_reviewed", { expenseId: params.expenseId, decision: params.decision, amount: expense.amount });

  return { success: true };
}

export async function reviewContract(contractId: number): Promise<{
  riskScore: number;
  flaggedClauses: Array<{ clause: string; risk: string; severity: string; recommendation: string }>;
  missingClauses: string[];
  complianceIssues: string[];
  overallAssessment: string;
  confidence: number;
}> {
  const [contract] = await db.select().from(contractsTable).where(eq(contractsTable.id, contractId));
  if (!contract) throw new Error("Contract not found");

  const result = await callAI({
    systemPrompt: `You are a senior legal counsel for a cybersecurity and IT services company (PMG Group LLC). Analyze the contract for risks, compliance issues, and missing protections. Return JSON:
{
  "riskScore": 0-100,
  "flaggedClauses": [{"clause": "text snippet", "risk": "description", "severity": "critical|high|medium|low", "recommendation": "what to do"}],
  "missingClauses": ["clause that should be present"],
  "complianceIssues": ["compliance concern"],
  "overallAssessment": "summary text",
  "requiresHumanReview": true/false
}

Focus on: liability limitations, data handling/privacy (GDPR, CCPA), indemnification, IP ownership, SLA penalties, termination clauses, non-compete/non-solicitation, cyber insurance requirements, incident response obligations, and payment terms.`,
    userPrompt: `Review this ${contract.type} contract:\n\nTitle: ${contract.title}\nCompany ID: ${contract.companyId}\nContent:\n${contract.content?.slice(0, 4000) ?? "(no content provided)"}\n\nNotes: ${contract.notes ?? "None"}\nEffective: ${contract.effectiveDate ?? "TBD"}\nExpiration: ${contract.expirationDate ?? "TBD"}`,
    workflowKey: "contract_review",
    tool: "finance_legal",
    domain: "finance_legal",
    action: "ai_contract_review",
    entityType: "contract",
    entityId: contractId,
  });

  let parsed: any;
  try {
    parsed = JSON.parse(result.result);
  } catch {
    parsed = { riskScore: 50, flaggedClauses: [], missingClauses: [], complianceIssues: [], overallAssessment: result.result, requiresHumanReview: true };
  }

  const requiresHuman = parsed.requiresHumanReview || parsed.riskScore >= 70;
  await db.update(contractsTable).set({
    reviewStatus: requiresHuman ? "requires_review" : "reviewed",
    requiresHumanReview: requiresHuman ? "yes" : "no",
    metadata: { ...(contract.metadata as Record<string, any> ?? {}), aiReview: { riskScore: parsed.riskScore, flagCount: parsed.flaggedClauses?.length, reviewedAt: new Date().toISOString() } },
  }).where(eq(contractsTable.id, contractId));

  await logAudit({
    eventType: "contract_ai_reviewed",
    domain: "finance_legal",
    action: "ai_contract_review",
    description: `AI reviewed contract "${contract.title}" — Risk: ${parsed.riskScore}/100, ${parsed.flaggedClauses?.length ?? 0} clauses flagged`,
    entityType: "contract",
    entityId: contractId,
    actor: "ai_system",
    actorType: "ai",
    metadata: { riskScore: parsed.riskScore, requiresHumanReview: requiresHuman },
  });

  if (requiresHuman) {
    await createNotification({
      type: "contract_review_required",
      severity: parsed.riskScore >= 70 ? "error" : "warning",
      title: `Contract Review Required: ${contract.title}`,
      message: `AI flagged ${parsed.flaggedClauses?.length ?? 0} clauses with risk score ${parsed.riskScore}/100. Human review required.`,
      domain: "finance_legal",
      entityType: "contract",
      entityId: contractId,
      actor: "ai_system",
    });
  }

  broadcast("contract_reviewed", { contractId, riskScore: parsed.riskScore, requiresHumanReview: requiresHuman });

  return {
    riskScore: parsed.riskScore ?? 50,
    flaggedClauses: parsed.flaggedClauses ?? [],
    missingClauses: parsed.missingClauses ?? [],
    complianceIssues: parsed.complianceIssues ?? [],
    overallAssessment: parsed.overallAssessment ?? result.result,
    confidence: result.confidence,
  };
}

export async function generateContractFromTemplate(params: {
  type: string;
  companyName?: string;
  companyId?: number;
  serviceDescription?: string;
  term?: string;
  value?: number;
  actor?: string;
}): Promise<{ contract: any; confidence: number }> {
  const result = await callAI({
    systemPrompt: `You are a legal document specialist for PMG Group LLC, a cybersecurity and IT services company. Generate a complete ${params.type} contract. Include all standard sections: parties, scope of services, terms, payment, liability, confidentiality, IP, termination, force majeure, dispute resolution, and signatures block. Use professional legal language but keep it readable. Include placeholders like [CLIENT_NAME], [EFFECTIVE_DATE], etc. for variable fields.`,
    userPrompt: `Generate a ${params.type} contract:\nClient: ${params.companyName ?? "[CLIENT_NAME]"}\nService: ${params.serviceDescription ?? "Cybersecurity & IT Services"}\nTerm: ${params.term ?? "12 months"}\nValue: $${params.value ?? "[CONTRACT_VALUE]"}`,
    workflowKey: "contract_generation",
    tool: "finance_legal",
    domain: "finance_legal",
    action: "generate_contract",
  });

  const [contract] = await db.insert(contractsTable).values({
    title: `${params.type} — ${params.companyName ?? "New Client"}`,
    type: params.type,
    companyId: params.companyId,
    status: "draft",
    version: 1,
    content: result.result,
    reviewStatus: "pending",
    requiresHumanReview: "yes",
    createdBy: params.actor ?? "ai_system",
    metadata: { generatedByAi: true, serviceDescription: params.serviceDescription, term: params.term, value: params.value },
  }).returning();

  await logAudit({
    eventType: "contract_generated",
    domain: "finance_legal",
    action: "generate_contract",
    description: `AI generated ${params.type} contract for ${params.companyName ?? "new client"}`,
    entityType: "contract",
    entityId: contract.id,
    actor: params.actor ?? "ai_system",
    actorType: "ai",
    metadata: { type: params.type },
  });

  return { contract, confidence: result.confidence };
}

export interface QualityCheckpoint {
  domain: string;
  entityType: string;
  checkType: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  validator: (entity: any) => { passed: boolean; issue?: string };
}

const QUALITY_CHECKPOINTS: QualityCheckpoint[] = [
  {
    domain: "crm",
    entityType: "lead",
    checkType: "data_completeness",
    description: "Lead must have email or phone",
    severity: "high",
    validator: (e) => ({ passed: !!(e.email || e.phone), issue: "Lead missing both email and phone contact" }),
  },
  {
    domain: "crm",
    entityType: "lead",
    checkType: "company_required",
    description: "Lead must have company name",
    severity: "medium",
    validator: (e) => ({ passed: !!e.company, issue: "Lead missing company name" }),
  },
  {
    domain: "crm",
    entityType: "opportunity",
    checkType: "value_required",
    description: "Opportunity must have estimated value",
    severity: "high",
    validator: (e) => ({ passed: e.value > 0, issue: "Opportunity has no estimated value" }),
  },
  {
    domain: "crm",
    entityType: "opportunity",
    checkType: "close_date_required",
    description: "Opportunity must have expected close date",
    severity: "medium",
    validator: (e) => ({ passed: !!e.expectedCloseDate, issue: "Opportunity missing expected close date" }),
  },
  {
    domain: "finance_legal",
    entityType: "invoice",
    checkType: "line_items_required",
    description: "Invoice must have line items before sending",
    severity: "critical",
    validator: (e) => {
      const items = e.lineItems;
      const hasItems = Array.isArray(items) ? items.length > 0 : !!items;
      return { passed: hasItems, issue: "Invoice has no line items" };
    },
  },
  {
    domain: "finance_legal",
    entityType: "invoice",
    checkType: "due_date_required",
    description: "Invoice must have due date before sending",
    severity: "critical",
    validator: (e) => ({ passed: !!e.dueDate, issue: "Invoice missing due date" }),
  },
  {
    domain: "finance_legal",
    entityType: "invoice",
    checkType: "amount_valid",
    description: "Invoice total must be greater than zero",
    severity: "critical",
    validator: (e) => ({ passed: e.totalAmount > 0, issue: "Invoice total amount is zero or negative" }),
  },
  {
    domain: "finance_legal",
    entityType: "contract",
    checkType: "content_required",
    description: "Contract must have content before review",
    severity: "critical",
    validator: (e) => ({ passed: !!e.content && e.content.length > 100, issue: "Contract has insufficient content" }),
  },
  {
    domain: "finance_legal",
    entityType: "contract",
    checkType: "dates_required",
    description: "Contract must have effective and expiration dates",
    severity: "high",
    validator: (e) => ({ passed: !!(e.effectiveDate && e.expirationDate), issue: "Contract missing effective or expiration date" }),
  },
  {
    domain: "production",
    entityType: "asset",
    checkType: "content_exists",
    description: "Asset must have content before review submission",
    severity: "critical",
    validator: (e) => ({ passed: !!e.content, issue: "Asset has no content" }),
  },
  {
    domain: "finance_legal",
    entityType: "expense",
    checkType: "receipt_recommended",
    description: "Expenses over $100 should have receipt",
    severity: "medium",
    validator: (e) => ({ passed: e.amount < 100 || !!e.receiptUrl, issue: "Expense over $100 missing receipt" }),
  },
];

export function runQualityCheckpoints(entity: any, entityType: string, domain?: string): {
  passed: boolean;
  results: Array<{ checkType: string; description: string; severity: string; passed: boolean; issue?: string }>;
  criticalFailures: number;
} {
  const applicable = QUALITY_CHECKPOINTS.filter(cp =>
    cp.entityType === entityType && (!domain || cp.domain === domain)
  );

  const results = applicable.map(cp => {
    const result = cp.validator(entity);
    return { checkType: cp.checkType, description: cp.description, severity: cp.severity, passed: result.passed, issue: result.issue };
  });

  const criticalFailures = results.filter(r => !r.passed && r.severity === "critical").length;
  const passed = criticalFailures === 0;

  return { passed, results, criticalFailures };
}

export async function enforceQualityCheckpoints(params: {
  entity: any;
  entityType: string;
  entityId: number;
  domain: string;
  actor?: string;
  createIssuesOnFailure?: boolean;
}): Promise<ReturnType<typeof runQualityCheckpoints>> {
  const result = runQualityCheckpoints(params.entity, params.entityType, params.domain);

  if (params.createIssuesOnFailure) {
    const failures = result.results.filter(r => !r.passed);
    for (const f of failures) {
      await db.insert(qualityIssuesTable).values({
        entityType: params.entityType,
        entityId: params.entityId,
        domain: params.domain,
        issueType: f.checkType,
        severity: f.severity,
        status: "open",
        title: f.description,
        description: f.issue,
        reportedBy: params.actor ?? "quality_engine",
        metadata: { autoDetected: true },
      }).catch(() => {});
    }
  }

  if (!result.passed) {
    await createNotification({
      type: "quality_check_failed",
      severity: "error",
      title: `Quality Check Failed: ${params.entityType} #${params.entityId}`,
      message: `${result.criticalFailures} critical issue(s) found. ${result.results.filter(r => !r.passed).length} total issues.`,
      domain: params.domain,
      entityType: params.entityType,
      entityId: params.entityId,
      actor: params.actor ?? "quality_engine",
    });
  }

  return result;
}

export function getQualityCheckpointsForType(entityType: string, domain?: string): QualityCheckpoint[] {
  return QUALITY_CHECKPOINTS.filter(cp => cp.entityType === entityType && (!domain || cp.domain === domain));
}

export interface SOPRequirement {
  sopId: number;
  title: string;
  domain: string;
  category: string;
  requiredForAction: string;
}

const SOP_ACTION_MAP: Record<string, { domain: string; categories: string[] }> = {
  "invoice_send": { domain: "finance_legal", categories: ["billing", "invoicing", "finance"] },
  "contract_sign": { domain: "finance_legal", categories: ["legal", "contracts", "compliance"] },
  "expense_approve": { domain: "finance_legal", categories: ["expense", "finance", "procurement"] },
  "lead_qualify": { domain: "crm", categories: ["sales", "qualification", "crm"] },
  "asset_publish": { domain: "production", categories: ["brand", "content", "production", "publishing"] },
  "proposal_send": { domain: "crm", categories: ["sales", "proposals", "crm"] },
  "onboarding_start": { domain: "execution", categories: ["onboarding", "client", "execution"] },
};

export async function checkSOPCompliance(action: string): Promise<{
  compliant: boolean;
  requiredSOPs: SOPRequirement[];
  missingSops: string[];
  activeSopCount: number;
}> {
  const mapping = SOP_ACTION_MAP[action];
  if (!mapping) return { compliant: true, requiredSOPs: [], missingSops: [], activeSopCount: 0 };

  const activeSops = await db.select().from(sopsTable).where(eq(sopsTable.status!, "active"));

  const relevantSops = activeSops.filter(sop =>
    mapping.categories.some(cat =>
      sop.category.toLowerCase().includes(cat) ||
      sop.title.toLowerCase().includes(cat)
    )
  );

  const requiredSOPs: SOPRequirement[] = relevantSops.map(sop => ({
    sopId: sop.id,
    title: sop.title,
    domain: sop.domain ?? mapping.domain,
    category: sop.category,
    requiredForAction: action,
  }));

  const missingSops = mapping.categories.filter(cat =>
    !relevantSops.some(sop => sop.category.toLowerCase().includes(cat) || sop.title.toLowerCase().includes(cat))
  );

  return {
    compliant: requiredSOPs.length > 0 && missingSops.length === 0,
    requiredSOPs,
    missingSops,
    activeSopCount: relevantSops.length,
  };
}

export async function aiAuditSOPCompliance(params: {
  action: string;
  entityType: string;
  entityContext: string;
}): Promise<{ compliant: boolean; findings: string[]; recommendations: string[]; confidence: number }> {
  const sopCheck = await checkSOPCompliance(params.action);

  const sopTexts = await Promise.all(
    sopCheck.requiredSOPs.slice(0, 5).map(async (req) => {
      const [sop] = await db.select().from(sopsTable).where(eq(sopsTable.id, req.sopId));
      return sop ? `SOP "${sop.title}" (${sop.category}):\n${sop.content?.slice(0, 500)}` : "";
    })
  );

  const result = await callAI({
    systemPrompt: `You are a compliance officer for PMG Group LLC. Evaluate whether the action being taken follows the company's SOPs. Return JSON: { "compliant": true/false, "findings": ["finding1", ...], "recommendations": ["rec1", ...] }`,
    userPrompt: `Action: ${params.action}\nEntity Type: ${params.entityType}\nContext: ${params.entityContext}\n\nRelevant SOPs:\n${sopTexts.filter(Boolean).join("\n\n") || "No SOPs found for this action."}\n\nMissing SOP categories: ${sopCheck.missingSops.join(", ") || "None"}`,
    workflowKey: "sop_enforcement",
    tool: "finance_legal",
    domain: "finance_legal",
    action: "sop_compliance_check",
  });

  try {
    const parsed = JSON.parse(result.result);
    return { compliant: parsed.compliant ?? false, findings: parsed.findings ?? [], recommendations: parsed.recommendations ?? [], confidence: result.confidence };
  } catch {
    return { compliant: false, findings: ["AI response could not be parsed — treating as non-compliant for safety", result.result], recommendations: ["Manual compliance review required"], confidence: result.confidence };
  }
}

export function initFinanceLegalService(): void {
  console.log("[FinanceLegal] Initialized — invoice lifecycle, expense approval, contract AI review, quality checkpoints, SOP enforcement");
}
