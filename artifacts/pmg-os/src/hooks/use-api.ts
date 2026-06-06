import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json();
}

export function useWalletBalance() {
  return useQuery({
    queryKey: ["wallet", "balance"],
    queryFn: () => apiFetch<{ balance: number; reservedBalance: number; availableBalance: number; id: number }>("/wallet/balance"),
    refetchInterval: 30000,
  });
}

export function useWalletTransactions(limit = 50) {
  return useQuery({
    queryKey: ["wallet", "transactions", limit],
    queryFn: () => apiFetch<any[]>(`/wallet/transactions?limit=${limit}`),
  });
}

export function useFundWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (amount: number) => apiFetch<{ balance: number }>("/wallet/fund", {
      method: "POST",
      body: JSON.stringify({ amount }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useWalletAnalytics() {
  return useQuery({
    queryKey: ["wallet", "analytics"],
    queryFn: () => apiFetch<any>("/wallet/analytics"),
    refetchInterval: 60000,
  });
}

export function useWalletLedger(params?: { limit?: number; domain?: string; tool?: string; type?: string }) {
  return useQuery({
    queryKey: ["wallet", "ledger", params],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (params?.limit) qs.set("limit", String(params.limit));
      if (params?.domain) qs.set("domain", params.domain);
      if (params?.tool) qs.set("tool", params.tool);
      if (params?.type) qs.set("type", params.type);
      return apiFetch<any[]>(`/wallet/ledger?${qs.toString()}`);
    },
  });
}

// --- Apollo (lead-generation data layer) ---
export interface ApolloStatus {
  provider: string;
  mode: "live" | "fixture";
  connected: boolean;
  integrationId: number | null;
  lastVerifiedAt: string | null;
  lastStatus: string | null;
  lastError: string | null;
  fixtureNotice: string | null;
}

export interface ApolloTestResult {
  mode: "live" | "fixture";
  connected: boolean;
  healthy?: boolean;
  isLoggedIn?: boolean;
  message: string;
  code?: string;
}

export function useApolloStatus() {
  return useQuery({
    queryKey: ["apollo", "status"],
    queryFn: () => apiFetch<ApolloStatus>("/apollo/status"),
  });
}

export function useTestApollo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<ApolloTestResult>("/apollo/test", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apollo"] }),
  });
}

export function useConnectApollo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (apiKey: string) =>
      apiFetch<{ success: boolean; integrationId?: number }>("/integration-hub/connect-api-key", {
        method: "POST",
        body: JSON.stringify({ provider: "apollo", apiKey }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apollo"] }),
  });
}

export function useDisconnectApollo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ success: boolean }>("/integration-hub/disconnect", {
        method: "POST",
        body: JSON.stringify({ provider: "apollo" }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["apollo"] }),
  });
}

// People search — free preview (no credits, no emails). Fixture vs live is
// connection-gated server-side; `mode === "fixture"` means labeled sample data.
export interface ApolloPerson {
  apolloId: string | null;
  firstName: string;
  lastName: string;
  title: string | null;
  seniority: string | null;
  organizationName: string | null;
  organizationDomain: string | null;
  industry: string | null;
  estimatedNumEmployees: number | null;
  location: string | null;
  linkedinUrl: string | null;
  hasEmail: false;
}

export interface ApolloSearchFilters {
  titles?: string[];
  seniorities?: string[];
  organizationKeywords?: string[];
  locations?: string[];
  employeeRanges?: string[];
  keywords?: string;
  page?: number;
  perPage?: number;
}

export interface ApolloSearchResult {
  mode: "live" | "fixture";
  people: ApolloPerson[];
  pagination: { page: number; perPage: number; totalEntries: number; totalPages: number };
  fixtureNotice: string | null;
}

export function useApolloSearch() {
  return useMutation({
    mutationFn: (filters: ApolloSearchFilters) =>
      apiFetch<ApolloSearchResult>("/apollo/search", {
        method: "POST",
        body: JSON.stringify(filters),
      }),
  });
}

export function useWalletThresholds() {
  return useQuery({
    queryKey: ["wallet", "thresholds"],
    queryFn: () => apiFetch<any[]>("/wallet/thresholds"),
  });
}

export function useUpsertThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { scopeType: string; scopeId: string; dailyLimit?: number; monthlyLimit?: number; perActionCap?: number; enabled?: boolean }) =>
      apiFetch<any>("/wallet/thresholds", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet", "thresholds"] }),
  });
}

export function useDeleteThreshold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/wallet/thresholds/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet", "thresholds"] }),
  });
}

export function useWalletDummyMode() {
  return useQuery({
    queryKey: ["wallet", "dummy-mode"],
    queryFn: () => apiFetch<{ dummyMode: boolean }>("/wallet/dummy-mode"),
  });
}

export function useSetDummyMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enabled: boolean) => apiFetch<{ dummyMode: boolean }>("/wallet/dummy-mode", { method: "POST", body: JSON.stringify({ enabled }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet"] }),
  });
}

export function useProviderSpend() {
  return useQuery({
    queryKey: ["wallet", "provider-spend"],
    queryFn: () => apiFetch<Record<string, { daily: number; monthly: number }>>("/wallet/provider-spend"),
    refetchInterval: 60000,
  });
}

export function useWorkflowSpend() {
  return useQuery({
    queryKey: ["wallet", "workflow-spend"],
    queryFn: () => apiFetch<Record<string, { daily: number; monthly: number }>>("/wallet/workflow-spend"),
    refetchInterval: 60000,
  });
}

export function useWalletCacheStats() {
  return useQuery({
    queryKey: ["wallet", "cache-stats"],
    queryFn: () => apiFetch<any>("/wallet/cache/stats"),
    refetchInterval: 60000,
  });
}

export function useInvalidateWalletCache() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { category?: string; domain?: string }) =>
      apiFetch<any>("/wallet/cache/invalidate", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["wallet", "cache-stats"] }),
  });
}

export function useChannels() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: () => apiFetch<any[]>("/channels"),
    refetchInterval: 30000,
  });
}

export function useChannelAnalytics() {
  return useQuery({
    queryKey: ["channels", "analytics"],
    queryFn: () => apiFetch<any>("/channels/analytics"),
    refetchInterval: 30000,
  });
}

export function useChannelTypes() {
  return useQuery({
    queryKey: ["channels", "types"],
    queryFn: () => apiFetch<any[]>("/channels/types"),
    staleTime: Infinity,
  });
}

export function useCreateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch<any>("/channels", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
}

export function useUpdateChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch<any>(`/channels/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
}

export function useDeleteChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/channels/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
}

export function useConnectChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch<any>(`/channels/${id}/connect`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
}

export function useDisconnectChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/channels/${id}/disconnect`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
}

export function useReconnectChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/channels/${id}/reconnect`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
}

export function useTriggerChannelSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/channels/${id}/sync`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
}

export function useChannelForms() {
  return useQuery({
    queryKey: ["channels", "forms"],
    queryFn: () => apiFetch<any[]>("/channels/forms/list"),
  });
}

export function useCreateForm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch<any>("/channels/forms", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels", "forms"] }),
  });
}

export function useDeleteFormMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/channels/forms/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels", "forms"] }),
  });
}

export function useLandingPages() {
  return useQuery({
    queryKey: ["channels", "pages"],
    queryFn: () => apiFetch<any[]>("/channels/pages/list"),
  });
}

export function useCreateLandingPage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch<any>("/channels/pages", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels", "pages"] }),
  });
}

export function useDeleteLandingPageMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/channels/pages/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels", "pages"] }),
  });
}

export function useAttributionSummary() {
  return useQuery({
    queryKey: ["channels", "attribution"],
    queryFn: () => apiFetch<any[]>("/channels/attribution/summary"),
  });
}

export function useManualImports() {
  return useQuery({
    queryKey: ["channels", "imports"],
    queryFn: () => apiFetch<any[]>("/channels/imports/list"),
  });
}

export function useStartImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiFetch<any>("/channels/imports/start", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels", "imports"] }),
  });
}

export function useProcessImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) => apiFetch<any>(`/channels/imports/${id}/process`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels", "imports"] }),
  });
}

export function useReconcileImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: any) => apiFetch<any>(`/channels/imports/${id}/reconcile`, { method: "POST", body: JSON.stringify({ notes }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels", "imports"] }),
  });
}

export function useSeedChannels() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<any>("/channels/seed", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["channels"] }),
  });
}

export function useAiMode() {
  return useQuery({
    queryKey: ["ai-mode", "global"],
    queryFn: () => apiFetch<{ mode: string }>("/ai-mode/global"),
  });
}

export function useSetAiMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode: string) => apiFetch<{ mode: string }>("/ai-mode/global", {
      method: "PUT",
      body: JSON.stringify({ mode }),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-mode"] });
      qc.invalidateQueries({ queryKey: ["command-center"] });
    },
  });
}

export function useWorkflowModes() {
  return useQuery({
    queryKey: ["ai-mode", "workflows"],
    queryFn: () => apiFetch<any[]>("/ai-mode/workflows"),
  });
}

export function useSetWorkflowMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, mode }: { key: string; mode: string }) =>
      apiFetch<any>(`/ai-mode/workflows/${key}`, {
        method: "PUT",
        body: JSON.stringify({ mode }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-mode"] });
    },
  });
}

export function useNotifications(limit = 50) {
  return useQuery({
    queryKey: ["notifications", limit],
    queryFn: () => apiFetch<any[]>(`/notifications?limit=${limit}`),
    refetchInterval: 15000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => apiFetch<{ count: number }>("/notifications/unread-count"),
    refetchInterval: 15000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ success: boolean }>(`/notifications/${id}/read`, { method: "PUT" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<{ success: boolean }>("/notifications/read-all", { method: "PUT" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDismissNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<{ success: boolean }>(`/notifications/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useCommandCenter() {
  return useQuery({
    queryKey: ["command-center"],
    queryFn: () => apiFetch<{
      walletBalance: number;
      aiMode: string;
      unreadNotifications: number;
      aiRunsToday: number;
      activitiesToday: number;
      pendingTasks: number;
      recentAiRuns: any[];
      recentNotifications: any[];
    }>("/dashboard/command-center"),
    refetchInterval: 30000,
  });
}

export function useAiEnrichLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: number; name: string; email?: string; company?: string; source?: string }) =>
      apiFetch<{ enrichment: string; confidence: number; runId: number }>("/ai/enrich-lead", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["command-center"] });
    },
  });
}

export function useAiScoreLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: { id: number; name: string; email?: string; company?: string; source?: string; enrichmentData?: string }) =>
      apiFetch<{ score: number; tier: string; reasoning: string; confidence: number; runId: number }>("/ai/score-lead", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useAiGenerateOutreach() {
  return useMutation({
    mutationFn: (params: { leadName: string; company?: string; context: string; channel: string }) =>
      apiFetch<{ draft: string; confidence: number; runId: number }>("/ai/generate-outreach", {
        method: "POST",
        body: JSON.stringify(params),
      }),
  });
}

export function useAiGenerateReport() {
  return useMutation({
    mutationFn: (params: { domain: string; reportType: string; data?: Record<string, unknown> }) =>
      apiFetch<{ report: string; confidence: number; runId: number }>("/ai/generate-report", {
        method: "POST",
        body: JSON.stringify(params),
      }),
  });
}

export function useAiSuggestAction() {
  return useMutation({
    mutationFn: (params: { entityType: string; entityId: number; currentStage: string; data?: Record<string, unknown> }) =>
      apiFetch<{ suggestion: string; confidence: number; runId: number }>("/ai/suggest-action", {
        method: "POST",
        body: JSON.stringify(params),
      }),
  });
}

export function useStateMachine(entityType: string) {
  return useQuery({
    queryKey: ["state-machines", entityType],
    queryFn: () => apiFetch<{
      entityType: string;
      states: string[];
      initialState: string;
      transitions: Record<string, string[]>;
      terminalStates: string[];
    }>(`/state-machines/${entityType}`),
    enabled: !!entityType,
  });
}

export function useRouteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, destination }: { id: number; destination: string }) =>
      apiFetch<any>(`/leads/${id}/route`, {
        method: "POST",
        body: JSON.stringify({ destination }),
      }),
    onSuccess: () => {
      invalidateEntity(qc, "leads");
    },
  });
}

export function useLeadActivities(leadId: number) {
  return useQuery({
    queryKey: ["leads", leadId, "activities"],
    queryFn: () => apiFetch<any[]>(`/leads/${leadId}/activities`),
    enabled: !!leadId,
  });
}

export function useLeadAiRuns(leadId: number) {
  return useQuery({
    queryKey: ["leads", leadId, "ai-runs"],
    queryFn: () => apiFetch<any[]>(`/leads/${leadId}/ai-runs`),
    enabled: !!leadId,
  });
}

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiFetch<any>(`/leads/${id}/convert`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      invalidateEntity(qc, "leads");
      invalidateEntity(qc, "opportunities");
    },
  });
}

export function useCloseLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason, notes }: { id: number; reason: string; notes?: string }) =>
      apiFetch<any>(`/leads/${id}/close`, { method: "POST", body: JSON.stringify({ reason, notes }) }),
    onSuccess: () => { invalidateEntity(qc, "leads"); },
  });
}

export function useDeleteOpportunity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/opportunities/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidateEntity(qc, "opportunities"); },
  });
}

export function useGetOpportunity(id: number | null) {
  return useQuery({
    queryKey: ["opportunities", id],
    queryFn: () => apiFetch<any>(`/opportunities/${id}`),
    enabled: !!id,
  });
}

export function useKnowledgeLibrary(limit = 100) {
  return useQuery({
    queryKey: ["knowledge", limit],
    queryFn: () => apiFetch<any[]>(`/knowledge?limit=${limit}`),
  });
}

export function useSearchKnowledge(query: string) {
  return useQuery({
    queryKey: ["knowledge", "search", query],
    queryFn: () => apiFetch<any[]>(`/knowledge/search?q=${encodeURIComponent(query)}`),
    enabled: query.length > 2,
  });
}

function invalidateEntity(qc: ReturnType<typeof useQueryClient>, entity: string) {
  qc.invalidateQueries({ queryKey: [entity] });
  qc.invalidateQueries({ queryKey: [`/api/${entity}`] });
}

export function useGlobalSearch(query: string) {
  return useQuery({
    queryKey: ["search", query],
    queryFn: () => apiFetch<{ results: Array<{ id: number; name: string; entityType: string }>; query: string; total: number }>(`/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
}

export function useGHLConfig() {
  return useQuery({
    queryKey: ["ghl", "config"],
    queryFn: () => apiFetch<any>("/ghl/config"),
  });
}

export function useSaveGHLConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: Record<string, unknown>) => apiFetch<any>("/ghl/config", { method: "PUT", body: JSON.stringify(config) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ghl"] }); },
  });
}

export function useTestGHLConnection() {
  return useMutation({
    mutationFn: () => apiFetch<{ connected: boolean; error?: string }>("/ghl/test", { method: "POST" }),
  });
}

export function useGHLCRMMode() {
  return useQuery({
    queryKey: ["ghl", "crm-mode"],
    queryFn: () => apiFetch<{ mode: string }>("/ghl/crm-mode"),
  });
}

export function useSetGHLCRMMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (mode: string) => apiFetch<{ mode: string }>("/ghl/crm-mode", { method: "PUT", body: JSON.stringify({ mode }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ghl"] }); },
  });
}

export function useGHLSyncLogs(filters?: { entityType?: string; status?: string; direction?: string }) {
  const params = new URLSearchParams();
  if (filters?.entityType) params.set("entityType", filters.entityType);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.direction) params.set("direction", filters.direction);
  const qs = params.toString();
  return useQuery({
    queryKey: ["ghl", "sync-logs", filters],
    queryFn: () => apiFetch<{ logs: any[]; total: number; failed: number; succeeded: number }>(`/ghl/sync-logs${qs ? `?${qs}` : ""}`),
  });
}

export function useGHLFieldMapping() {
  return useQuery({
    queryKey: ["ghl", "field-mapping"],
    queryFn: () => apiFetch<{ fieldMapping: Record<string, string>; defaults: Record<string, string> }>("/ghl/field-mapping"),
  });
}

export function useSaveGHLFieldMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fieldMapping: Record<string, string>) => apiFetch<any>("/ghl/field-mapping", { method: "PUT", body: JSON.stringify({ fieldMapping }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ghl"] }); },
  });
}

export function useGHLPipelineMapping() {
  return useQuery({
    queryKey: ["ghl", "pipeline-mapping"],
    queryFn: () => apiFetch<{ pipelineMapping: Record<string, string>; pmgStages: string[] }>("/ghl/pipeline-mapping"),
  });
}

export function useSaveGHLPipelineMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pipelineMapping: Record<string, string>) => apiFetch<any>("/ghl/pipeline-mapping", { method: "PUT", body: JSON.stringify({ pipelineMapping }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ghl"] }); },
  });
}

export function useGHLSyncHealth() {
  return useQuery({
    queryKey: ["ghl", "sync-health"],
    queryFn: () => apiFetch<any>("/ghl/sync-health"),
    refetchInterval: 30000,
  });
}

export function useGHLRoutingSummary() {
  return useQuery({
    queryKey: ["ghl", "routing-summary"],
    queryFn: () => apiFetch<any>("/ghl/routing-summary"),
  });
}

export function useGHLRetryQueue() {
  return useQuery({
    queryKey: ["ghl", "retry-queue"],
    queryFn: () => apiFetch<{ queue: any[]; total: number }>("/ghl/retry-queue"),
  });
}

export function useGHLSyncRetry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (logId: number) => apiFetch<any>(`/ghl/sync-retry/${logId}`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ghl"] }); invalidateEntity(qc, "leads"); },
  });
}

export function useGHLRetryAllFailed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch<any>("/ghl/retry-all-failed", { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ghl"] }); invalidateEntity(qc, "leads"); },
  });
}

export function useGHLRouteLeadEnhanced() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, destination }: { id: number; destination: string }) =>
      apiFetch<any>(`/ghl/route-lead/${id}`, { method: "POST", body: JSON.stringify({ destination }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ghl"] }); invalidateEntity(qc, "leads"); },
  });
}

export function useGHLRouteBulk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ leadIds, destination }: { leadIds: number[]; destination: string }) =>
      apiFetch<any>("/ghl/route-bulk", { method: "POST", body: JSON.stringify({ leadIds, destination }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ghl"] }); invalidateEntity(qc, "leads"); },
  });
}

export function useGHLSyncNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, entityId, notes }: { entityType: string; entityId: number; notes: string }) =>
      apiFetch<any>("/ghl/sync-notes", { method: "POST", body: JSON.stringify({ entityType, entityId, notes }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ghl", "sync-logs"] }); },
  });
}

export function useGHLSyncContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (contactId: number) => apiFetch<any>(`/ghl/sync-contact/${contactId}`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ghl"] }); invalidateEntity(qc, "contacts"); },
  });
}

export function useGHLPullContacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (limit: number = 50) => apiFetch<any>("/ghl/pull-contacts", { method: "POST", body: JSON.stringify({ limit }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ghl"] }); invalidateEntity(qc, "contacts"); },
  });
}

export function useAutomationRules() {
  return useQuery({
    queryKey: ["automation", "rules"],
    queryFn: () => apiFetch<{ rules: any[]; total: number }>("/automation/rules"),
  });
}

export function useAutomationTriggers() {
  return useQuery({
    queryKey: ["automation", "triggers"],
    queryFn: () => apiFetch<{ triggers: Array<{ event: string; label: string }> }>("/automation/triggers"),
  });
}

export function useAutomationActions() {
  return useQuery({
    queryKey: ["automation", "actions"],
    queryFn: () => apiFetch<{ actions: Array<{ type: string; label: string }> }>("/automation/actions"),
  });
}

export function useCreateAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch<any>("/automation/rules", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation"] }); },
  });
}

export function useToggleAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<any>(`/automation/rules/${id}/toggle`, { method: "PUT" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation"] }); },
  });
}

export function useDeleteAutomationRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/automation/rules/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation"] }); },
  });
}

export function useUpdateOpportunityMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiFetch<any>(`/opportunities/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { invalidateEntity(qc, "opportunities"); },
  });
}

export function useListCampaigns() {
  return useQuery({
    queryKey: ["campaigns"],
    queryFn: () => apiFetch<any[]>("/campaigns"),
  });
}

export function useCreateCampaignMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch<any>("/campaigns", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { invalidateEntity(qc, "campaigns"); },
  });
}

export function useUpdateCampaignMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiFetch<any>(`/campaigns/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { invalidateEntity(qc, "campaigns"); },
  });
}

export function useDeleteCampaignMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<void>(`/campaigns/${id}`, { method: "DELETE" }),
    onSuccess: () => { invalidateEntity(qc, "campaigns"); },
  });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<any>("/leads", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      invalidateEntity(qc, "leads");
      qc.invalidateQueries({ queryKey: ["command-center"] });
    },
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiFetch<any>(`/leads/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      invalidateEntity(qc, "leads");
    },
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/leads/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateEntity(qc, "leads");
    },
  });
}

export function useCreateCompanyMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<any>("/companies", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      invalidateEntity(qc, "companies");
    },
  });
}

export function useCreateContactMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<any>("/contacts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      invalidateEntity(qc, "contacts");
    },
  });
}

export function useCreateOpportunityMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<any>("/opportunities", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      invalidateEntity(qc, "opportunities");
    },
  });
}

export function useCreateTaskMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<any>("/tasks", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      invalidateEntity(qc, "tasks");
    },
  });
}

export function useAgents() {
  return useQuery({
    queryKey: ["agents"],
    queryFn: () => apiFetch<any[]>("/agents"),
    refetchInterval: 15000,
  });
}

export function useAgentStats() {
  return useQuery({
    queryKey: ["agents", "stats"],
    queryFn: () => apiFetch<any>("/agents/stats"),
    refetchInterval: 15000,
  });
}

export function useAgentsByDomain(domain: string) {
  return useQuery({
    queryKey: ["agents", "domain", domain],
    queryFn: () => apiFetch<any[]>(`/agents/domain/${domain}`),
    enabled: !!domain,
  });
}

export function useUpdateAgentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiFetch<any>(`/agents/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

export function useRunAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, durationMs, success }: { id: string; durationMs?: number; success?: boolean }) =>
      apiFetch<any>(`/agents/${id}/run`, {
        method: "POST",
        body: JSON.stringify({ durationMs: durationMs ?? 500, success: success ?? true }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
    },
  });
}

export function useFullAgents() {
  return useQuery({
    queryKey: ["agents", "full"],
    queryFn: () => apiFetch<any[]>("/agents/full"),
    refetchInterval: 15000,
  });
}

export function useEnhancedAgents() {
  return useQuery({
    queryKey: ["agents", "enhanced"],
    queryFn: () => apiFetch<any[]>("/agents/enhanced"),
  });
}

export function useAgentProfile(id: string) {
  return useQuery({
    queryKey: ["agents", "profile", id],
    queryFn: () => apiFetch<any>(`/agents/${id}/full`),
    enabled: !!id,
  });
}

export function useOrchestrationStats() {
  return useQuery({
    queryKey: ["orchestration", "stats"],
    queryFn: () => apiFetch<any>("/agents/orchestration/stats"),
    refetchInterval: 10000,
  });
}

export function useOrchestrationActive() {
  return useQuery({
    queryKey: ["orchestration", "active"],
    queryFn: () => apiFetch<any[]>("/agents/orchestration/active"),
    refetchInterval: 5000,
  });
}

export function useOrchestrationCompleted(limit = 50) {
  return useQuery({
    queryKey: ["orchestration", "completed", limit],
    queryFn: () => apiFetch<any[]>(`/agents/orchestration/completed?limit=${limit}`),
    refetchInterval: 10000,
  });
}

export function useSelectProvider() {
  return useMutation({
    mutationFn: (data: { taskType: string; domain: string; preferences?: any }) =>
      apiFetch<any[]>("/agents/orchestration/select-provider", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  });
}

export function useOrchestrateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { agentId: string; taskType: string; input?: any; priority?: string; preferences?: any }) =>
      apiFetch<any>("/agents/orchestration/execute", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orchestration"] });
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useExecuteAgent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input?: any }) =>
      apiFetch<any>(`/agents/${id}/execute`, {
        method: "POST",
        body: JSON.stringify({ input: input ?? {} }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["orchestration"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useNotes(entityType?: string, entityId?: string) {
  const params = entityType && entityId ? `?entityType=${entityType}&entityId=${entityId}` : "";
  return useQuery({
    queryKey: ["notes", entityType, entityId],
    queryFn: () => apiFetch<any[]>(`/notes${params}`),
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { entityType: string; entityId: string; content: string; author?: string; domain?: string }) =>
      apiFetch<any>("/notes", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["notes"] }); },
  });
}

export function useFollowUps(entityType?: string, entityId?: string) {
  const params = entityType && entityId ? `?entityType=${entityType}&entityId=${entityId}` : "";
  return useQuery({
    queryKey: ["follow-ups", entityType, entityId],
    queryFn: () => apiFetch<any[]>(`/follow-ups${params}`),
  });
}

export function useCreateFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { entityType: string; entityId: string; title: string; description?: string; dueDate: string; assignedTo?: string; domain?: string }) =>
      apiFetch<any>("/follow-ups", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["follow-ups"] }); },
  });
}

export function useUpdateFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      apiFetch<any>(`/follow-ups/${id}`, { method: "PUT", body: JSON.stringify({ status }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["follow-ups"] }); },
  });
}

export function useSops(category?: string) {
  const params = category ? `?category=${category}` : "";
  return useQuery({
    queryKey: ["sops", category],
    queryFn: () => apiFetch<any[]>(`/sops${params}`),
  });
}

export function useUpdateTaskMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiFetch<any>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { invalidateEntity(qc, "tasks"); qc.invalidateQueries({ queryKey: ["command-center"] }); },
  });
}

export function useUpdateDocumentMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiFetch<any>(`/documents/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { invalidateEntity(qc, "documents"); },
  });
}

export function useCreateCommunicationMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<any>("/communications", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { invalidateEntity(qc, "communications"); },
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: () => apiFetch<any[]>("/invoices"),
  });
}

export function useCreateInvoiceMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<any>("/invoices", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { invalidateEntity(qc, "invoices"); },
  });
}

export function useContracts() {
  return useQuery({
    queryKey: ["contracts"],
    queryFn: () => apiFetch<any[]>("/contracts"),
  });
}

export function useCreateContractMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<any>("/contracts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { invalidateEntity(qc, "contracts"); },
  });
}

export function useCreateSop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; category: string; content: string; version?: string; domain?: string; createdBy?: string }) =>
      apiFetch<any>("/sops", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sops"] }); },
  });
}

export function useAiRecommendations() {
  return useQuery({
    queryKey: ["dashboard", "ai-recommendations"],
    queryFn: () => apiFetch<{ recommendations: any[] }>("/dashboard/ai-recommendations"),
    refetchInterval: 60000,
  });
}

export function useInterventionQueue() {
  return useQuery({
    queryKey: ["dashboard", "intervention-queue"],
    queryFn: () => apiFetch<{ items: any[]; totalCount: number }>("/dashboard/intervention-queue"),
    refetchInterval: 30000,
  });
}

export function useAgentActivity() {
  return useQuery({
    queryKey: ["dashboard", "agent-activity"],
    queryFn: () => apiFetch<{ stats: any; domainActivity: Record<string, any>; recentRuns: any[]; agents: any[] }>("/dashboard/agent-activity"),
    refetchInterval: 30000,
  });
}

export function useQualityIssues(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["quality-issues", params],
    queryFn: () => apiFetch<any[]>(`/quality-issues${qs}`),
  });
}

export function useCreateQualityIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<any>("/quality-issues", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quality-issues"] }); },
  });
}

export function useUpdateQualityIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiFetch<any>(`/quality-issues/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quality-issues"] }); },
  });
}

export function useIntegrationConnectors() {
  return useQuery({
    queryKey: ["integration-hub", "connectors"],
    queryFn: () => apiFetch<any[]>("/integration-hub/connectors"),
  });
}

export function useIntegrationStatus() {
  return useQuery({
    queryKey: ["integration-hub", "status"],
    queryFn: () => apiFetch<any>("/integration-hub/status"),
    refetchInterval: 30000,
  });
}

export function useConnectIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { provider: string; apiKey: string }) =>
      apiFetch<any>("/integration-hub/connect-api-key", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["integration-hub"] }); },
  });
}

export function useDisconnectIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) =>
      apiFetch<any>("/integration-hub/disconnect", { method: "POST", body: JSON.stringify({ provider }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["integration-hub"] }); },
  });
}

export function useSyncLogs() {
  return useQuery({
    queryKey: ["integration-hub", "sync-logs"],
    queryFn: () => apiFetch<any>("/integration-hub/sync/logs"),
  });
}

export function useSyncHealth() {
  return useQuery({
    queryKey: ["integration-hub", "sync-health"],
    queryFn: () => apiFetch<any>("/integration-hub/sync/health"),
    refetchInterval: 30000,
  });
}

export function useTriggerSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (integrationId: string) =>
      apiFetch<any>("/integration-hub/sync/trigger", { method: "POST", body: JSON.stringify({ integrationId }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["integration-hub"] }); },
  });
}

export function useImportCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { entityType: string; csvContent: string; fieldMapping: Record<string, string>; skipDuplicates?: boolean; dryRun?: boolean }) =>
      apiFetch<any>("/integration-hub/import/execute", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
}

export function useReportTemplates() {
  return useQuery({
    queryKey: ["reporting", "templates"],
    queryFn: () => apiFetch<any[]>("/reporting/templates"),
  });
}

export function useReportEventTriggers() {
  return useQuery({
    queryKey: ["reporting", "event-triggers"],
    queryFn: () => apiFetch<any[]>("/reporting/event-triggers"),
  });
}

export function useReportArchive(params?: Record<string, string>) {
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  return useQuery({
    queryKey: ["reporting", "archive", params],
    queryFn: async () => {
      const result = await apiFetch<{ items: any[]; total: number; accessLevels: string[] }>(`/reporting/archive${qs}`);
      return result.items ?? [];
    },
  });
}

export function useGenerateScheduledReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { template: string }) =>
      apiFetch<any>("/reporting/generate", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reporting"] }); },
  });
}

export function useDeliverReportSlack() {
  return useMutation({
    mutationFn: (data: { reportId: number; channel?: string }) =>
      apiFetch<any>("/reporting/deliver/slack", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useDeliverReportEmail() {
  return useMutation({
    mutationFn: (data: { reportId: number; email: string; subject?: string }) =>
      apiFetch<any>("/reporting/deliver/email", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useKnowledgeEventMappings() {
  return useQuery({
    queryKey: ["knowledge", "event-mappings"],
    queryFn: () => apiFetch<any[]>("/knowledge/event-mappings"),
  });
}

export function useSemanticSearch(query: string) {
  return useQuery({
    queryKey: ["knowledge", "semantic-search", query],
    queryFn: () => apiFetch<any[]>(`/knowledge/semantic-search?q=${encodeURIComponent(query)}`),
    enabled: query.length > 2,
  });
}

export function useKnowledgeStats() {
  return useQuery({
    queryKey: ["knowledge", "stats"],
    queryFn: () => apiFetch<{
      totalEntries: number;
      activeEntries: number;
      categoryCounts: Record<string, number>;
      sourceCounts: Record<string, number>;
      recentCount: number;
      totalUsageCount: number;
      topUsed: Array<{ id: number; title: string; usageCount: number; category: string }>;
    }>("/knowledge/stats"),
  });
}

export function useKnowledgeCategories() {
  return useQuery({
    queryKey: ["knowledge", "categories"],
    queryFn: () => apiFetch<string[]>("/knowledge/categories"),
  });
}

export function useCreateKnowledgeEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { category: string; subcategory?: string; title: string; content: string; source: string; sourceDomain?: string; tags?: string[] }) =>
      apiFetch<any>("/knowledge", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["knowledge"] }); },
  });
}

export function useIngestKnowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: string; payload: Record<string, unknown> }) =>
      apiFetch<any>(`/knowledge/ingest/${data.type}`, { method: "POST", body: JSON.stringify(data.payload) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["knowledge"] }); },
  });
}

export function useTestSuites() {
  return useQuery({
    queryKey: ["testing", "suites"],
    queryFn: () => apiFetch<any[]>("/testing/suites"),
  });
}

export function useTestHistory(limit = 50) {
  return useQuery({
    queryKey: ["testing", "history", limit],
    queryFn: () => apiFetch<any[]>(`/testing/history?limit=${limit}`),
  });
}

export function useDummyModeStatus() {
  return useQuery({
    queryKey: ["testing", "dummy-mode"],
    queryFn: () => apiFetch<any>("/testing/dummy-mode/status"),
  });
}

export function useRunTestSuite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params?: string | { suite?: string; phase?: number }) => {
      const body = typeof params === "string" ? { suite: params } : (params ?? {});
      return apiFetch<any>("/testing/run", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["testing"] }); },
  });
}

export function useToggleDummyMode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enable: boolean) =>
      apiFetch<any>(`/testing/dummy-mode/${enable ? "enable" : "disable"}`, { method: "POST" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["testing"] }); },
  });
}

export function usePendingActions() {
  return useQuery({
    queryKey: ["pending-actions"],
    queryFn: () => apiFetch<any[]>("/pending-actions"),
    refetchInterval: 15000,
  });
}

export function useApprovePendingAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      apiFetch<any>(`/pending-actions/${id}/resolve`, { method: "POST", body: JSON.stringify({ option: "approve" }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-actions"] });
      qc.invalidateQueries({ queryKey: ["command-center"] });
    },
  });
}

export function useRejectPendingAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      apiFetch<any>(`/pending-actions/${id}/resolve`, { method: "POST", body: JSON.stringify({ option: "skip", reason }) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pending-actions"] });
    },
  });
}

export function useAiRuns(limit = 50) {
  return useQuery({
    queryKey: ["ai-runs", limit],
    queryFn: () => apiFetch<any[]>(`/ai-runs?limit=${limit}`),
    refetchInterval: 15000,
  });
}

export function useAuditEvents(limit = 100) {
  return useQuery({
    queryKey: ["audit-events", limit],
    queryFn: () => apiFetch<any[]>(`/audit-events?limit=${limit}`),
  });
}

export function useScheduledJobs() {
  return useQuery({
    queryKey: ["scheduler", "jobs"],
    queryFn: async () => {
      const result = await apiFetch<{ jobs: any[]; total: number }>("/scheduler");
      return result.jobs ?? [];
    },
    refetchInterval: 30000,
  });
}

export function useEventBusLog() {
  return useQuery({
    queryKey: ["event-bus", "log"],
    queryFn: async () => {
      const result = await apiFetch<{ events: any[]; subscribers: number; totalEvents: number }>("/event-bus");
      return result.events ?? [];
    },
    refetchInterval: 10000,
  });
}

export function useInvoiceTransition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { invoiceId: number; newStatus: string }) =>
      apiFetch<any>("/ai/invoice/transition", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); },
  });
}

export function useContractReview() {
  return useMutation({
    mutationFn: (data: { contractId: number }) =>
      apiFetch<any>("/ai/contract/review", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useToolsList() {
  return useQuery({
    queryKey: ["ai", "tools"],
    queryFn: () => apiFetch<any[]>("/ai/tools"),
  });
}

export function useChainsList() {
  return useQuery({
    queryKey: ["ai", "chains"],
    queryFn: () => apiFetch<any[]>("/ai/chains"),
  });
}

export function useListLeads() {
  return useQuery({
    queryKey: ["leads"],
    queryFn: () => apiFetch<any[]>("/leads"),
    refetchInterval: 30000,
  });
}

export function useListOpportunities() {
  return useQuery({
    queryKey: ["opportunities"],
    queryFn: () => apiFetch<any[]>("/opportunities"),
    refetchInterval: 30000,
  });
}

export function useListTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: () => apiFetch<any[]>("/tasks"),
    refetchInterval: 30000,
  });
}

export function useListActivities() {
  return useQuery({
    queryKey: ["activities"],
    queryFn: () => apiFetch<any[]>("/activities"),
    refetchInterval: 30000,
  });
}

export function useJobQueueStats() {
  return useQuery({
    queryKey: ["job-queue", "stats"],
    queryFn: () => apiFetch<{ pending: number; running: number; completed: number; failed: number; deadLetter: number; retry: number }>("/job-queue/stats"),
    refetchInterval: 15000,
  });
}

export function useChannelHealth() {
  return useQuery({
    queryKey: ["channel-health"],
    queryFn: () => apiFetch<any>("/channel-health"),
    refetchInterval: 30000,
  });
}

export function useCreativeProviders() {
  return useQuery({
    queryKey: ["creative-providers"],
    queryFn: () => apiFetch<{ providers: any[]; total: number; categories: string[] }>("/ai/production/creative-providers"),
    staleTime: 60000,
  });
}

export function useCreativeProvidersByAssetType(assetType: string) {
  return useQuery({
    queryKey: ["creative-providers", "asset-type", assetType],
    queryFn: () => apiFetch<{ providers: any[]; total: number }>(`/ai/production/creative-providers/asset-type/${assetType}`),
    enabled: !!assetType,
    staleTime: 60000,
  });
}

export function useCreativeRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { assetType: string; qualityPreference?: string; speedPreference?: string; budgetSensitive?: boolean; specificProvider?: string; needsAudio?: boolean; needsEditing?: boolean }) =>
      apiFetch<any>("/ai/production/creative-route", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["creative-route"] }),
  });
}

export function useAICreativeRoute() {
  return useMutation({
    mutationFn: (data: { assetType: string; prompt: string; brandContext?: string }) =>
      apiFetch<any>("/ai/production/ai-route", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
  });
}

export function useGenerateAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { type: string; title: string; prompt: string; category?: string; domain?: string; campaignId?: number; brandKitId?: number; aspectRatio?: string; durationSeconds?: number; providerId?: string; qualityPreference?: string; speedPreference?: string }) =>
      apiFetch<any>("/ai/production/generate", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); qc.invalidateQueries({ queryKey: ["assets"] }); },
  });
}

export function useArchiveAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetId: number) =>
      apiFetch<any>(`/ai/production/${assetId}/archive`, { method: "POST", headers: { "Content-Type": "application/json" } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); qc.invalidateQueries({ queryKey: ["archived-assets"] }); },
  });
}

export function useArchivedAssets() {
  return useQuery({
    queryKey: ["archived-assets"],
    queryFn: () => apiFetch<{ assets: any[]; total: number }>("/ai/production/archive"),
    refetchInterval: 30000,
  });
}

export function useRestoreAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assetId: number) =>
      apiFetch<any>(`/ai/production/${assetId}/restore`, { method: "POST", headers: { "Content-Type": "application/json" } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["documents"] }); qc.invalidateQueries({ queryKey: ["archived-assets"] }); },
  });
}

export function useAIReviewAsset() {
  return useMutation({
    mutationFn: (assetId: number) =>
      apiFetch<any>(`/ai/production/${assetId}/ai-review`, { method: "POST", headers: { "Content-Type": "application/json" } }),
  });
}

export function useDesignBrief() {
  return useMutation({
    mutationFn: (data: { type: string; objective: string; targetAudience?: string; keyMessages?: string[]; references?: string[] }) =>
      apiFetch<any>("/ai/production/design-brief", { method: "POST", body: JSON.stringify(data), headers: { "Content-Type": "application/json" } }),
  });
}

export function useUsers(filters?: { role?: string; isActive?: string }) {
  const params = new URLSearchParams();
  if (filters?.role) params.set("role", filters.role);
  if (filters?.isActive) params.set("isActive", filters.isActive);
  const qs = params.toString();
  return useQuery({ queryKey: ["users", filters], queryFn: () => apiFetch<any[]>(`/users${qs ? `?${qs}` : ""}`), refetchInterval: 30000 });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { email: string; name: string; password: string; role?: string; department?: string; title?: string }) =>
      apiFetch<any>("/users", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; email?: string; name?: string; department?: string; title?: string }) =>
      apiFetch<any>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: string }) =>
      apiFetch<any>(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUserPermissions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissions }: { id: number; permissions: any }) =>
      apiFetch<any>(`/users/${id}/permissions`, { method: "PATCH", body: JSON.stringify({ permissions }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useDeactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/users/${id}/deactivate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useReactivateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiFetch<any>(`/users/${id}/reactivate`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      apiFetch<any>(`/users/${id}/reset-password`, { method: "POST", body: JSON.stringify({ password }) }),
  });
}

export function useUserAuditLog(filters?: { userId?: number; limit?: number }) {
  const params = new URLSearchParams();
  if (filters?.userId) params.set("userId", String(filters.userId));
  if (filters?.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  return useQuery({ queryKey: ["user-audit-log", filters], queryFn: () => apiFetch<any[]>(`/users/audit-log${qs ? `?${qs}` : ""}`), refetchInterval: 15000 });
}

export function useRoleDefaults(role: string) {
  return useQuery({ queryKey: ["role-defaults", role], queryFn: () => apiFetch<any>(`/users/role-defaults/${role}`) });
}

export function useAiFindProspects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { industry?: string; region?: string; companySize?: string; marketingGaps?: string }) =>
      apiFetch<any>("/outreach/find-prospects", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });
}

export function useAiMonitorChannels() {
  return useMutation({
    mutationFn: (data: { channels?: string[] }) =>
      apiFetch<any>("/outreach/monitor-channels", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiPlanApproach() {
  return useMutation({
    mutationFn: (data: { prospectName?: string; companyName?: string; industryContext?: string; painPoints?: string }) =>
      apiFetch<any>("/outreach/plan-approach", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiComposeMessage() {
  return useMutation({
    mutationFn: (data: { channel?: string; prospectName?: string; companyName?: string; painPoints?: string; solution?: string }) =>
      apiFetch<any>("/outreach/compose-message", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiScheduleFollowup() {
  return useMutation({
    mutationFn: (data: { prospectId?: number; lastContactDate?: string; channel?: string; nextStep?: string }) =>
      apiFetch<any>("/outreach/schedule-followup", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiOutreachAnalytics() {
  return useMutation({
    mutationFn: (data: { timeframe?: string }) =>
      apiFetch<any>("/outreach/analytics", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiQualifyLead() {
  return useMutation({
    mutationFn: (data: { leadData?: any; companyName?: string; problemStatement?: string }) =>
      apiFetch<any>("/crm/qualify-lead", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiManageDeal() {
  return useMutation({
    mutationFn: (data: { dealId?: number; companyName?: string; dealValue?: number; interactions?: string[] }) =>
      apiFetch<any>("/crm/manage-deal", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiPrepareCall() {
  return useMutation({
    mutationFn: (data: { prospectName?: string; companyName?: string; callObjective?: string; priorContext?: string }) =>
      apiFetch<any>("/crm/prepare-call", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiCreateProposal() {
  return useMutation({
    mutationFn: (data: { prospectName?: string; companyName?: string; discoveryFindings?: string; budget?: number }) =>
      apiFetch<any>("/crm/create-proposal", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiSyncGhl() {
  return useMutation({
    mutationFn: (data: { leadId?: number; companyName?: string; contactEmail?: string; dealValue?: number; platform?: string }) =>
      apiFetch<any>("/crm/sync-ghl", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiCreateContent() {
  return useMutation({
    mutationFn: (data: { type?: string; description?: string; tone?: string; wordCount?: number }) =>
      apiFetch<any>("/marketing/create-content", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiCreateAd() {
  return useMutation({
    mutationFn: (data: { platform?: string; audience?: string; objective?: string; briefing?: string }) =>
      apiFetch<any>("/marketing/create-ad", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiSeoAudit() {
  return useMutation({
    mutationFn: (data: { websiteUrl?: string; competitors?: string[] }) =>
      apiFetch<any>("/marketing/seo-audit", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiOrchestrateCampaign() {
  return useMutation({
    mutationFn: (data: { campaignName?: string; channels?: string[]; goals?: string; timeline?: string }) =>
      apiFetch<any>("/marketing/orchestrate-campaign", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiCompetitorIntel() {
  return useMutation({
    mutationFn: (data: { competitors?: string[] }) =>
      apiFetch<any>("/marketing/competitor-intel", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiOnboardClient() {
  return useMutation({
    mutationFn: (data: { clientName?: string; companyName?: string }) =>
      apiFetch<any>("/production/onboard-client", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiAuditClient() {
  return useMutation({
    mutationFn: (data: { clientId?: number; clientName?: string; websiteUrl?: string }) =>
      apiFetch<any>("/production/audit-client", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiCreateImage() {
  return useMutation({
    mutationFn: (data: { type?: string; description?: string; brandColors?: string }) =>
      apiFetch<any>("/production/create-image", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiCreateVideo() {
  return useMutation({
    mutationFn: (data: { type?: string; description?: string; duration?: number }) =>
      apiFetch<any>("/production/create-video", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiCreateDocument() {
  return useMutation({
    mutationFn: (data: { docType?: string; title?: string; content?: string }) =>
      apiFetch<any>("/production/create-document", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiGenerateLeads() {
  return useMutation({
    mutationFn: (data: { clientId?: number; clientName?: string; targetMarket?: string; industryFocus?: string }) =>
      apiFetch<any>("/production/generate-leads", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiBuildCampaign() {
  return useMutation({
    mutationFn: (data: { clientId?: number; campaignType?: string; targetAudience?: string; marketingGap?: string }) =>
      apiFetch<any>("/production/build-campaign", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiGenerateClientReport() {
  return useMutation({
    mutationFn: (data: { clientId?: number; reportType?: string; timeframe?: string }) =>
      apiFetch<any>("/production/generate-report", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiAssignTasks() {
  return useMutation({
    mutationFn: (data: { teamMembers?: string[] }) =>
      apiFetch<any>("/admin/assign-tasks", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiManageKnowledge() {
  return useMutation({
    mutationFn: (data: { documentType?: string; topic?: string }) =>
      apiFetch<any>("/admin/manage-knowledge", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiExecutiveBriefing() {
  return useMutation({
    mutationFn: () =>
      apiFetch<any>("/admin/executive-briefing", { method: "POST", body: JSON.stringify({}) }),
  });
}

export function useAiSystemEvolution() {
  return useMutation({
    mutationFn: () =>
      apiFetch<any>("/admin/system-evolution", { method: "POST", body: JSON.stringify({}) }),
  });
}

export function useAiCreateInvoice() {
  return useMutation({
    mutationFn: (data: { clientId?: number; clientName?: string; amount?: number; services?: string[]; dueDate?: string }) =>
      apiFetch<any>("/finance/create-invoice", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiManageContracts() {
  return useMutation({
    mutationFn: (data: { clientId?: number; clientName?: string; serviceType?: string; duration?: string; monthlyValue?: number }) =>
      apiFetch<any>("/finance/manage-contracts", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiCheckCompliance() {
  return useMutation({
    mutationFn: (data: { contentType?: string; content?: string; channel?: string }) =>
      apiFetch<any>("/legal/check-compliance", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiGetGuide() {
  return useMutation({
    mutationFn: (data: { section?: string }) =>
      apiFetch<any>("/video/get-guide", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiLinkedInSync() {
  return useMutation({
    mutationFn: (data: { prospectId?: number; linkedinUrl?: string }) =>
      apiFetch<any>("/integrations/linkedin/sync", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiGhlSync() {
  return useMutation({
    mutationFn: (data: { leadId?: number; ghlApiKey?: string }) =>
      apiFetch<any>("/integrations/ghl/sync", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiGoogleAdsSync() {
  return useMutation({
    mutationFn: (data: { campaignId?: number }) =>
      apiFetch<any>("/integrations/google-ads/sync", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useAiStripePayment() {
  return useMutation({
    mutationFn: (data: { invoiceId?: number; amount?: number; clientName?: string }) =>
      apiFetch<any>("/integrations/stripe/create-payment", { method: "POST", body: JSON.stringify(data) }),
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => apiFetch<any>("/dashboard/stats"),
    refetchInterval: 30000,
  });
}

export function useDashboardRecentActivities() {
  return useQuery({
    queryKey: ["dashboard", "recent-activities"],
    queryFn: () => apiFetch<any>("/dashboard/recent-activities"),
    refetchInterval: 15000,
  });
}

export { apiFetch };
