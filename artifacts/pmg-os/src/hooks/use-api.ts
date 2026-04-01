import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", "X-User-Role": "super_admin", ...options?.headers },
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
    queryFn: () => apiFetch<{ balance: number; id: number }>("/wallet/balance"),
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

export function useGHLSyncLogs() {
  return useQuery({
    queryKey: ["ghl", "sync-logs"],
    queryFn: () => apiFetch<{ logs: any[]; total: number }>("/ghl/sync-logs"),
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

export function useCreateCampaignMut() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => apiFetch<any>("/campaigns", { method: "POST", body: JSON.stringify(data) }),
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

export { apiFetch };
