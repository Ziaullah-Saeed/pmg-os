import * as zod from "zod";

const idParams = zod.object({ id: zod.coerce.number() });
const listParams = zod.object({
  status: zod.string().optional(),
  domain: zod.string().optional(),
  type: zod.string().optional(),
  limit: zod.coerce.number().optional(),
  offset: zod.coerce.number().optional(),
});

export const ListApprovalsQueryParams = listParams.extend({ entityType: zod.string().optional() });
export const CreateApprovalBody = zod.object({
  entityType: zod.string(),
  entityId: zod.number(),
  domain: zod.string(),
  status: zod.string().optional(),
  requestedBy: zod.string().optional(),
  reviewedBy: zod.string().optional(),
  priority: zod.string().optional(),
  reason: zod.string().optional(),
  rejectionReason: zod.string().optional(),
  notes: zod.string().optional(),
  metadata: zod.any().optional(),
  expiresAt: zod.string().optional(),
});
export const UpdateApprovalBody = CreateApprovalBody.partial();
export const GetApprovalParams = idParams;
export const UpdateApprovalParams = idParams;
export const GetApprovalResponse = zod.any();
export const ListApprovalsResponse = zod.array(zod.any());

export const ListAssetsQueryParams = listParams.extend({ category: zod.string().optional(), lifecycleStage: zod.string().optional() });
export const CreateAssetBody = zod.object({
  title: zod.string(),
  type: zod.string(),
  category: zod.string(),
  status: zod.string().optional(),
  lifecycleStage: zod.string().optional(),
  content: zod.string().optional(),
  previewUrl: zod.string().optional(),
  finalUrl: zod.string().optional(),
  version: zod.number().optional(),
  parentId: zod.number().optional(),
  domain: zod.string().optional(),
  campaignId: zod.number().optional(),
  createdBy: zod.string().optional(),
  reviewedBy: zod.string().optional(),
  approvedBy: zod.string().optional(),
  rejectionReason: zod.string().optional(),
  reviewNotes: zod.string().optional(),
  tags: zod.string().optional(),
  metadata: zod.any().optional(),
  generatedByAi: zod.string().optional(),
  publishedAt: zod.string().optional(),
  archivedAt: zod.string().optional(),
});
export const UpdateAssetBody = CreateAssetBody.partial();
export const GetAssetParams = idParams;
export const UpdateAssetParams = idParams;
export const GetAssetResponse = zod.any();
export const ListAssetsResponse = zod.array(zod.any());

export const ListAuditEventsQueryParams = listParams.extend({ eventType: zod.string().optional(), severity: zod.string().optional(), actorType: zod.string().optional() });
export const CreateAuditEventBody = zod.object({
  eventType: zod.string(),
  domain: zod.string(),
  entityType: zod.string().optional(),
  entityId: zod.number().optional(),
  action: zod.string(),
  description: zod.string(),
  actor: zod.string().optional(),
  actorType: zod.string().optional(),
  severity: zod.string().optional(),
  metadata: zod.any().optional(),
  ipAddress: zod.string().optional(),
});
export const GetAuditEventParams = idParams;
export const GetAuditEventResponse = zod.any();
export const ListAuditEventsResponse = zod.array(zod.any());

export const ListAiRunsQueryParams = listParams.extend({ runType: zod.string().optional(), model: zod.string().optional() });
export const CreateAiRunBody = zod.object({
  runType: zod.string(),
  domain: zod.string(),
  entityType: zod.string().optional(),
  entityId: zod.number().optional(),
  model: zod.string().optional(),
  prompt: zod.string().optional(),
  output: zod.string().optional(),
  status: zod.string().optional(),
  confidenceScore: zod.number().optional(),
  tokensUsed: zod.number().optional(),
  costEstimate: zod.number().optional(),
  reviewRequired: zod.string().optional(),
  reviewedBy: zod.string().optional(),
  reviewedAt: zod.string().optional(),
  metadata: zod.any().optional(),
  error: zod.string().optional(),
  durationMs: zod.number().optional(),
});
export const GetAiRunParams = idParams;
export const GetAiRunResponse = zod.any();
export const ListAiRunsResponse = zod.array(zod.any());

export const ListArchiveItemsQueryParams = listParams.extend({ category: zod.string().optional(), sourceType: zod.string().optional(), accessLevel: zod.string().optional() });
export const CreateArchiveItemBody = zod.object({
  sourceType: zod.string(),
  sourceId: zod.number().optional(),
  domain: zod.string(),
  title: zod.string(),
  category: zod.string(),
  content: zod.string().optional(),
  summary: zod.string().optional(),
  tags: zod.string().optional(),
  version: zod.number().optional(),
  status: zod.string().optional(),
  accessLevel: zod.string().optional(),
  owner: zod.string().optional(),
  clientId: zod.number().optional(),
  retentionPolicy: zod.string().optional(),
  metadata: zod.any().optional(),
  archivedBy: zod.string().optional(),
  expiresAt: zod.string().optional(),
});
export const UpdateArchiveItemBody = CreateArchiveItemBody.partial();
export const GetArchiveItemParams = idParams;
export const UpdateArchiveItemParams = idParams;
export const GetArchiveItemResponse = zod.any();
export const ListArchiveItemsResponse = zod.array(zod.any());

export const ListContractsQueryParams = listParams.extend({ companyId: zod.coerce.number().optional(), reviewStatus: zod.string().optional() });
export const CreateContractBody = zod.object({
  title: zod.string(),
  type: zod.string(),
  companyId: zod.number().optional(),
  status: zod.string().optional(),
  version: zod.number().optional(),
  content: zod.string().optional(),
  templateId: zod.string().optional(),
  reviewStatus: zod.string().optional(),
  requiresHumanReview: zod.string().optional(),
  reviewedBy: zod.string().optional(),
  approvedBy: zod.string().optional(),
  signerName: zod.string().optional(),
  signedAt: zod.string().optional(),
  effectiveDate: zod.string().optional(),
  expirationDate: zod.string().optional(),
  renewalDate: zod.string().optional(),
  metadata: zod.any().optional(),
  notes: zod.string().optional(),
  createdBy: zod.string().optional(),
});
export const UpdateContractBody = CreateContractBody.partial();
export const GetContractParams = idParams;
export const UpdateContractParams = idParams;
export const GetContractResponse = zod.any();
export const ListContractsResponse = zod.array(zod.any());

export const ListInvoicesQueryParams = listParams.extend({ companyId: zod.coerce.number().optional() });
export const CreateInvoiceBody = zod.object({
  invoiceNumber: zod.string(),
  companyId: zod.number().optional(),
  type: zod.string().optional(),
  status: zod.string().optional(),
  amount: zod.number().optional(),
  taxAmount: zod.number().optional(),
  totalAmount: zod.number().optional(),
  currency: zod.string().optional(),
  dueDate: zod.string().optional(),
  paidAt: zod.string().optional(),
  lineItems: zod.any().optional(),
  notes: zod.string().optional(),
  terms: zod.string().optional(),
  issuedBy: zod.string().optional(),
  issuedAt: zod.string().optional(),
});
export const UpdateInvoiceBody = CreateInvoiceBody.partial();
export const GetInvoiceParams = idParams;
export const UpdateInvoiceParams = idParams;
export const GetInvoiceResponse = zod.any();
export const ListInvoicesResponse = zod.array(zod.any());

export const ListPaymentsQueryParams = zod.object({ invoiceId: zod.coerce.number().optional(), status: zod.string().optional(), limit: zod.coerce.number().optional(), offset: zod.coerce.number().optional() });
export const CreatePaymentBody = zod.object({
  invoiceId: zod.number().optional(),
  amount: zod.number(),
  method: zod.string().optional(),
  reference: zod.string().optional(),
  status: zod.string().optional(),
  paidAt: zod.string().optional(),
  notes: zod.string().optional(),
});
export const GetPaymentParams = idParams;
export const GetPaymentResponse = zod.any();
export const ListPaymentsResponse = zod.array(zod.any());

export const ListExpensesQueryParams = zod.object({ category: zod.string().optional(), status: zod.string().optional(), limit: zod.coerce.number().optional(), offset: zod.coerce.number().optional() });
export const CreateExpenseBody = zod.object({
  category: zod.string(),
  description: zod.string(),
  amount: zod.number(),
  vendor: zod.string().optional(),
  status: zod.string().optional(),
  receiptUrl: zod.string().optional(),
  approvedBy: zod.string().optional(),
  paidAt: zod.string().optional(),
});
export const UpdateExpenseBody = CreateExpenseBody.partial();
export const GetExpenseParams = idParams;
export const UpdateExpenseParams = idParams;
export const GetExpenseResponse = zod.any();
export const ListExpensesResponse = zod.array(zod.any());

export const ListIntegrationsQueryParams = zod.object({ type: zod.string().optional(), provider: zod.string().optional(), status: zod.string().optional(), limit: zod.coerce.number().optional(), offset: zod.coerce.number().optional() });
export const CreateIntegrationBody = zod.object({
  name: zod.string(),
  type: zod.string(),
  provider: zod.string(),
  status: zod.string().optional(),
  isActive: zod.boolean().optional(),
  config: zod.any().optional(),
  credentials: zod.any().optional(),
  syncFrequency: zod.string().optional(),
  metadata: zod.any().optional(),
});
export const UpdateIntegrationBody = CreateIntegrationBody.partial();
export const GetIntegrationParams = idParams;
export const UpdateIntegrationParams = idParams;
export const GetIntegrationResponse = zod.any();
export const ListIntegrationsResponse = zod.array(zod.any());

export const ListOutreachSequencesQueryParams = listParams.extend({ channel: zod.string().optional() });
export const CreateOutreachSequenceBody = zod.object({
  name: zod.string(),
  type: zod.string(),
  status: zod.string().optional(),
  channel: zod.string(),
  steps: zod.any().optional(),
  targetAudience: zod.string().optional(),
  totalEnrolled: zod.number().optional(),
  totalResponded: zod.number().optional(),
  totalConverted: zod.number().optional(),
  cadenceRules: zod.any().optional(),
  safetyControls: zod.any().optional(),
  owner: zod.string().optional(),
  notes: zod.string().optional(),
});
export const UpdateOutreachSequenceBody = CreateOutreachSequenceBody.partial();
export const GetOutreachSequenceParams = idParams;
export const UpdateOutreachSequenceParams = idParams;
export const GetOutreachSequenceResponse = zod.any();
export const ListOutreachSequencesResponse = zod.array(zod.any());

export const ListQualityIssuesQueryParams = listParams.extend({ severity: zod.string().optional(), entityType: zod.string().optional(), assignedTo: zod.string().optional() });
export const CreateQualityIssueBody = zod.object({
  entityType: zod.string(),
  entityId: zod.number(),
  domain: zod.string(),
  issueType: zod.string(),
  severity: zod.string().optional(),
  status: zod.string().optional(),
  title: zod.string(),
  description: zod.string().optional(),
  resolution: zod.string().optional(),
  reportedBy: zod.string().optional(),
  assignedTo: zod.string().optional(),
  resolvedBy: zod.string().optional(),
  metadata: zod.any().optional(),
  resolvedAt: zod.string().optional(),
});
export const UpdateQualityIssueBody = CreateQualityIssueBody.partial();
export const GetQualityIssueParams = idParams;
export const UpdateQualityIssueParams = idParams;
export const GetQualityIssueResponse = zod.any();
export const ListQualityIssuesResponse = zod.array(zod.any());

export const ListReportsQueryParams = listParams.extend({ format: zod.string().optional(), generationType: zod.string().optional() });
export const CreateReportBody = zod.object({
  title: zod.string(),
  type: zod.string(),
  domain: zod.string(),
  format: zod.string().optional(),
  status: zod.string().optional(),
  content: zod.string().optional(),
  summary: zod.string().optional(),
  data: zod.any().optional(),
  generatedBy: zod.string().optional(),
  generationType: zod.string().optional(),
  scheduledFor: zod.string().optional(),
  deliveredAt: zod.string().optional(),
  deliveryChannel: zod.string().optional(),
  recipients: zod.string().optional(),
  period: zod.string().optional(),
  tags: zod.string().optional(),
});
export const UpdateReportBody = CreateReportBody.partial();
export const GetReportParams = idParams;
export const UpdateReportParams = idParams;
export const GetReportResponse = zod.any();
export const ListReportsResponse = zod.array(zod.any());

export const ListUsersQueryParams = zod.object({ role: zod.string().optional(), department: zod.string().optional(), isActive: zod.string().optional(), limit: zod.coerce.number().optional(), offset: zod.coerce.number().optional() });
export const CreateUserBody = zod.object({
  email: zod.string(),
  name: zod.string(),
  role: zod.string().optional(),
  avatarUrl: zod.string().optional(),
  department: zod.string().optional(),
  title: zod.string().optional(),
  isActive: zod.boolean().optional(),
});
export const UpdateUserBody = CreateUserBody.partial();
export const GetUserParams = idParams;
export const UpdateUserParams = idParams;
export const GetUserResponse = zod.any();
export const ListUsersResponse = zod.array(zod.any());
