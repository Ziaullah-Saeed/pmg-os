export type AgentStatus = "active" | "idle" | "running" | "paused" | "error";

export interface AgentDefinition {
  id: string;
  name: string;
  domain: string;
  domainIndex: number;
  description: string;
  status: AgentStatus;
  lastRun?: Date;
  totalRuns: number;
  avgDuration?: number;
  successRate: number;
  capabilities: string[];
}

const agentDefinitions: Omit<AgentDefinition, "status" | "lastRun" | "totalRuns" | "avgDuration" | "successRate">[] = [
  { id: "exec-signal", name: "Executive Signal Agent", domain: "command_center", domainIndex: 1, description: "Synthesizes cross-domain signals into executive visibility", capabilities: ["signal_detection", "priority_ranking"] },
  { id: "priority-rank", name: "Priority Ranking Agent", domain: "command_center", domainIndex: 1, description: "Ranks items by business impact and urgency", capabilities: ["scoring", "ranking"] },
  { id: "risk-detect", name: "Risk Detection Agent", domain: "command_center", domainIndex: 1, description: "Identifies risks across pipeline, operations, and finance", capabilities: ["risk_scoring", "alerting"] },
  { id: "bottleneck-detect", name: "Bottleneck Detection Agent", domain: "command_center", domainIndex: 1, description: "Finds workflow bottlenecks and stalled processes", capabilities: ["workflow_analysis", "alerting"] },
  { id: "human-intervention", name: "Human Intervention Agent", domain: "command_center", domainIndex: 1, description: "Queues items requiring human decision-making", capabilities: ["escalation", "routing"] },
  { id: "agent-supervisor", name: "Agent Activity Supervisor", domain: "command_center", domainIndex: 1, description: "Monitors all agent activity and performance", capabilities: ["monitoring", "reporting"] },
  { id: "cross-domain-summary", name: "Cross-Domain Summary Agent", domain: "command_center", domainIndex: 1, description: "Generates holistic business state summaries", capabilities: ["summarization", "reporting"] },
  { id: "perf-digest", name: "Performance Digest Agent", domain: "command_center", domainIndex: 1, description: "Creates daily/weekly performance digests", capabilities: ["reporting", "analytics"] },
  { id: "escalation-trigger", name: "Escalation Trigger Agent", domain: "command_center", domainIndex: 1, description: "Triggers escalation paths when thresholds are breached", capabilities: ["alerting", "routing"] },
  { id: "daily-brief", name: "Daily Executive Brief Agent", domain: "command_center", domainIndex: 1, description: "Generates morning executive briefings", capabilities: ["reporting", "summarization"] },

  { id: "market-segment", name: "Market Segmentation Agent", domain: "intelligence", domainIndex: 2, description: "Segments target markets by fit and opportunity", capabilities: ["segmentation", "analysis"] },
  { id: "icp-model", name: "ICP Modeling Agent", domain: "intelligence", domainIndex: 2, description: "Builds and refines ideal customer profiles", capabilities: ["modeling", "scoring"] },
  { id: "competitor-map", name: "Competitor Mapping Agent", domain: "intelligence", domainIndex: 2, description: "Maps competitive landscape and positioning", capabilities: ["research", "mapping"] },
  { id: "positioning-gap", name: "Positioning Gap Agent", domain: "intelligence", domainIndex: 2, description: "Identifies positioning gaps and opportunities", capabilities: ["analysis", "strategy"] },
  { id: "trust-barrier", name: "Trust Barrier Agent", domain: "intelligence", domainIndex: 2, description: "Analyzes trust barriers in target segments", capabilities: ["analysis", "research"] },
  { id: "opp-scoring", name: "Opportunity Scoring Agent", domain: "intelligence", domainIndex: 2, description: "Scores opportunities by fit, timing, and probability", capabilities: ["scoring", "prediction"] },
  { id: "buyer-pain", name: "Buyer Pain Analysis Agent", domain: "intelligence", domainIndex: 2, description: "Maps buyer pain points to PMG solutions", capabilities: ["analysis", "mapping"] },
  { id: "authority-struct", name: "Authority Structure Agent", domain: "intelligence", domainIndex: 2, description: "Maps buying authority and decision chains", capabilities: ["mapping", "research"] },
  { id: "service-fit", name: "Service Fit Agent", domain: "intelligence", domainIndex: 2, description: "Evaluates PMG service fit per prospect", capabilities: ["scoring", "matching"] },
  { id: "niche-trend", name: "Niche Trend Agent", domain: "intelligence", domainIndex: 2, description: "Detects cybersecurity market trends", capabilities: ["research", "trend_analysis"] },
  { id: "research-summary", name: "Research Summary Agent", domain: "intelligence", domainIndex: 2, description: "Summarizes research into actionable insights", capabilities: ["summarization", "reporting"] },
  { id: "decision-support", name: "Decision Support Agent", domain: "intelligence", domainIndex: 2, description: "Provides data-backed decision recommendations", capabilities: ["recommendation", "analysis"] },

  { id: "company-discovery", name: "Company Discovery Agent", domain: "outreach", domainIndex: 3, description: "Discovers target companies matching ICP", capabilities: ["discovery", "research"] },
  { id: "contact-discovery", name: "Contact Discovery Agent", domain: "outreach", domainIndex: 3, description: "Finds key contacts within target companies", capabilities: ["discovery", "enrichment"] },
  { id: "email-verify", name: "Email Verification Agent", domain: "outreach", domainIndex: 3, description: "Verifies email deliverability and validity", capabilities: ["verification", "validation"] },
  { id: "phone-verify", name: "Phone Verification Agent", domain: "outreach", domainIndex: 3, description: "Validates phone numbers and call eligibility", capabilities: ["verification", "validation"] },
  { id: "lead-enrich", name: "Lead Enrichment Agent", domain: "outreach", domainIndex: 3, description: "Enriches leads with firmographic and tech data", capabilities: ["enrichment", "research"] },
  { id: "authority-map", name: "Authority Mapping Agent", domain: "outreach", domainIndex: 3, description: "Maps decision-making authority for each lead", capabilities: ["mapping", "analysis"] },
  { id: "pain-map", name: "Pain Mapping Agent", domain: "outreach", domainIndex: 3, description: "Identifies specific pain points per prospect", capabilities: ["analysis", "mapping"] },
  { id: "confidence-score", name: "Confidence Scoring Agent", domain: "outreach", domainIndex: 3, description: "Scores confidence in lead data and readiness", capabilities: ["scoring", "validation"] },
  { id: "qualification", name: "Qualification Agent", domain: "outreach", domainIndex: 3, description: "Qualifies leads against PMG criteria", capabilities: ["scoring", "routing"] },
  { id: "outreach-angle", name: "Outreach Angle Agent", domain: "outreach", domainIndex: 3, description: "Constructs best approach angle per prospect", capabilities: ["strategy", "personalization"] },
  { id: "personalization", name: "Personalization Agent", domain: "outreach", domainIndex: 3, description: "Personalizes outreach content per recipient", capabilities: ["content_generation", "personalization"] },
  { id: "routing", name: "Routing Agent", domain: "outreach", domainIndex: 3, description: "Routes qualified leads to appropriate channels", capabilities: ["routing", "decision_making"] },
  { id: "sequence-recommend", name: "Sequence Recommendation Agent", domain: "outreach", domainIndex: 3, description: "Recommends optimal outreach sequences", capabilities: ["recommendation", "strategy"] },
  { id: "lead-readiness", name: "Lead Readiness Agent", domain: "outreach", domainIndex: 3, description: "Assesses if lead is ready for sales handoff", capabilities: ["scoring", "assessment"] },

  { id: "seo-intent", name: "SEO Intent Agent", domain: "marketing", domainIndex: 4, description: "Maps search intent for cybersecurity keywords", capabilities: ["seo", "research"] },
  { id: "topic-cluster", name: "Topic Cluster Agent", domain: "marketing", domainIndex: 4, description: "Builds topic clusters for content strategy", capabilities: ["strategy", "planning"] },
  { id: "content-calendar", name: "Content Calendar Agent", domain: "marketing", domainIndex: 4, description: "Plans and schedules content production", capabilities: ["scheduling", "planning"] },
  { id: "brand-consistency", name: "Brand Consistency Agent", domain: "marketing", domainIndex: 4, description: "Ensures brand voice and visual consistency", capabilities: ["validation", "review"] },
  { id: "campaign-plan", name: "Campaign Planning Agent", domain: "marketing", domainIndex: 4, description: "Plans multi-channel campaign strategies", capabilities: ["planning", "strategy"] },
  { id: "channel-role", name: "Channel Role Agent", domain: "marketing", domainIndex: 4, description: "Assigns channel roles (awareness/nurture/conversion)", capabilities: ["strategy", "classification"] },
  { id: "paid-strategy", name: "Paid Strategy Agent", domain: "marketing", domainIndex: 4, description: "Optimizes paid advertising strategy", capabilities: ["optimization", "strategy"] },
  { id: "organic-strategy", name: "Organic Strategy Agent", domain: "marketing", domainIndex: 4, description: "Drives organic growth and SEO strategy", capabilities: ["strategy", "seo"] },
  { id: "retargeting", name: "Retargeting Agent", domain: "marketing", domainIndex: 4, description: "Manages retargeting audiences and campaigns", capabilities: ["targeting", "optimization"] },
  { id: "discoverability", name: "Discoverability Agent", domain: "marketing", domainIndex: 4, description: "Improves brand discoverability across channels", capabilities: ["optimization", "strategy"] },
  { id: "optimization-loop", name: "Optimization Loop Agent", domain: "marketing", domainIndex: 4, description: "Runs continuous optimization on campaigns", capabilities: ["optimization", "analytics"] },
  { id: "market-signal", name: "Market Signal Monitoring Agent", domain: "marketing", domainIndex: 4, description: "Monitors market signals and competitor moves", capabilities: ["monitoring", "alerting"] },

  { id: "brand-strategy", name: "Brand Strategy Agent", domain: "production", domainIndex: 5, description: "Guides brand strategy for asset creation", capabilities: ["strategy", "creative_direction"] },
  { id: "tone-voice", name: "Tone of Voice Agent", domain: "production", domainIndex: 5, description: "Maintains consistent tone across all content", capabilities: ["validation", "content_generation"] },
  { id: "design-brief", name: "Design Brief Agent", domain: "production", domainIndex: 5, description: "Generates design briefs from requirements", capabilities: ["content_generation", "planning"] },
  { id: "visual-concept", name: "Visual Concept Agent", domain: "production", domainIndex: 5, description: "Creates visual concept directions", capabilities: ["creative_direction", "content_generation"] },
  { id: "asset-layout", name: "Asset Layout Agent", domain: "production", domainIndex: 5, description: "Generates layout compositions for assets", capabilities: ["content_generation", "design"] },
  { id: "deck-structure", name: "Deck Structure Agent", domain: "production", domainIndex: 5, description: "Structures presentation deck content", capabilities: ["content_generation", "planning"] },
  { id: "proposal-draft", name: "Proposal Draft Agent", domain: "production", domainIndex: 5, description: "Drafts business proposals", capabilities: ["content_generation", "writing"] },
  { id: "script-draft", name: "Script Draft Agent", domain: "production", domainIndex: 5, description: "Writes scripts for videos and demos", capabilities: ["content_generation", "writing"] },
  { id: "storyboard", name: "Storyboard Agent", domain: "production", domainIndex: 5, description: "Creates visual storyboards for video content", capabilities: ["creative_direction", "planning"] },
  { id: "revision-suggest", name: "Revision Suggestion Agent", domain: "production", domainIndex: 5, description: "Suggests improvements on draft assets", capabilities: ["review", "recommendation"] },
  { id: "preview-prep", name: "Preview Preparation Agent", domain: "production", domainIndex: 5, description: "Prepares assets for review preview", capabilities: ["processing", "preparation"] },
  { id: "approval-route-prod", name: "Approval Routing Agent", domain: "production", domainIndex: 5, description: "Routes assets through approval workflow", capabilities: ["routing", "workflow"] },
  { id: "finalization-ready", name: "Finalization Readiness Agent", domain: "production", domainIndex: 5, description: "Checks if assets meet finalization criteria", capabilities: ["validation", "assessment"] },
  { id: "asset-archive", name: "Asset Archive Agent", domain: "production", domainIndex: 5, description: "Archives finalized assets with metadata", capabilities: ["archiving", "indexing"] },

  { id: "workflow-trigger", name: "Workflow Trigger Agent", domain: "execution", domainIndex: 6, description: "Triggers workflows based on events and rules", capabilities: ["triggering", "automation"] },
  { id: "task-create", name: "Task Creation Agent", domain: "execution", domainIndex: 6, description: "Auto-creates tasks from workflows and events", capabilities: ["task_creation", "automation"] },
  { id: "ownership-assign", name: "Ownership Assignment Agent", domain: "execution", domainIndex: 6, description: "Assigns task ownership based on rules", capabilities: ["assignment", "routing"] },
  { id: "reminder", name: "Reminder Agent", domain: "execution", domainIndex: 6, description: "Sends reminders for upcoming deadlines", capabilities: ["notification", "scheduling"] },
  { id: "scheduling", name: "Scheduling Agent", domain: "execution", domainIndex: 6, description: "Schedules tasks and meetings", capabilities: ["scheduling", "planning"] },
  { id: "checklist-enforce", name: "Checklist Enforcement Agent", domain: "execution", domainIndex: 6, description: "Enforces checklist completion before progression", capabilities: ["validation", "enforcement"] },
  { id: "approval-queue", name: "Approval Queue Agent", domain: "execution", domainIndex: 6, description: "Manages approval queues and routing", capabilities: ["routing", "workflow"] },
  { id: "failure-detect", name: "Failure Detection Agent", domain: "execution", domainIndex: 6, description: "Detects task failures and anomalies", capabilities: ["monitoring", "alerting"] },
  { id: "escalation-path", name: "Escalation Path Agent", domain: "execution", domainIndex: 6, description: "Determines escalation paths for issues", capabilities: ["routing", "escalation"] },
  { id: "completion-verify", name: "Completion Verification Agent", domain: "execution", domainIndex: 6, description: "Verifies task completion and quality", capabilities: ["validation", "verification"] },

  { id: "lead-accept", name: "Lead Acceptance Agent", domain: "crm", domainIndex: 7, description: "Evaluates and accepts qualified leads into CRM", capabilities: ["scoring", "routing"] },
  { id: "deal-progress", name: "Deal Progression Agent", domain: "crm", domainIndex: 7, description: "Monitors and advances deal stages", capabilities: ["workflow", "monitoring"] },
  { id: "stage-integrity", name: "Stage Integrity Agent", domain: "crm", domainIndex: 7, description: "Ensures pipeline stage data integrity", capabilities: ["validation", "enforcement"] },
  { id: "follow-up", name: "Follow-Up Agent", domain: "crm", domainIndex: 7, description: "Schedules and tracks deal follow-ups", capabilities: ["scheduling", "tracking"] },
  { id: "activity-log", name: "Activity Logging Agent", domain: "crm", domainIndex: 7, description: "Logs all CRM activities automatically", capabilities: ["logging", "tracking"] },
  { id: "proposal-status", name: "Proposal Status Agent", domain: "crm", domainIndex: 7, description: "Tracks proposal lifecycle and outcomes", capabilities: ["tracking", "reporting"] },
  { id: "contract-status", name: "Contract Status Agent", domain: "crm", domainIndex: 7, description: "Monitors contract status and renewals", capabilities: ["tracking", "alerting"] },
  { id: "risk-to-close", name: "Risk-to-Close Agent", domain: "crm", domainIndex: 7, description: "Assesses risk factors in closing deals", capabilities: ["scoring", "analysis"] },
  { id: "next-best-action", name: "Next Best Action Agent", domain: "crm", domainIndex: 7, description: "Recommends optimal next actions for deals", capabilities: ["recommendation", "analysis"] },
  { id: "stale-opp", name: "Stale Opportunity Agent", domain: "crm", domainIndex: 7, description: "Flags stale opportunities needing attention", capabilities: ["monitoring", "alerting"] },
  { id: "crm-sync", name: "CRM Sync Agent", domain: "crm", domainIndex: 7, description: "Synchronizes data with external CRMs", capabilities: ["sync", "integration"] },
  { id: "revenue-forecast", name: "Revenue Forecast Agent", domain: "crm", domainIndex: 7, description: "Generates revenue forecasts from pipeline", capabilities: ["prediction", "reporting"] },

  { id: "call-eligibility", name: "Call Eligibility Agent", domain: "communications", domainIndex: 8, description: "Determines call timing and eligibility", capabilities: ["assessment", "scheduling"] },
  { id: "ai-call-guide", name: "AI Call Guidance Agent", domain: "communications", domainIndex: 8, description: "Provides real-time call guidance and coaching", capabilities: ["coaching", "real_time"] },
  { id: "objection-detect", name: "Objection Detection Agent", domain: "communications", domainIndex: 8, description: "Detects objections during conversations", capabilities: ["detection", "analysis"] },
  { id: "interest-signal", name: "Interest Signal Agent", domain: "communications", domainIndex: 8, description: "Identifies buyer interest signals", capabilities: ["detection", "scoring"] },
  { id: "hesitation-detect", name: "Hesitation Detection Agent", domain: "communications", domainIndex: 8, description: "Detects buyer hesitation patterns", capabilities: ["detection", "analysis"] },
  { id: "meeting-summary", name: "Meeting Summary Agent", domain: "communications", domainIndex: 8, description: "Generates meeting summaries and action items", capabilities: ["summarization", "extraction"] },
  { id: "followup-draft", name: "Follow-Up Draft Agent", domain: "communications", domainIndex: 8, description: "Drafts follow-up communications", capabilities: ["content_generation", "writing"] },
  { id: "crm-update-assist", name: "CRM Update Assistant Agent", domain: "communications", domainIndex: 8, description: "Auto-updates CRM from communications", capabilities: ["integration", "automation"] },
  { id: "tone-coaching", name: "Tone Coaching Agent", domain: "communications", domainIndex: 8, description: "Provides tone and approach coaching", capabilities: ["coaching", "analysis"] },
  { id: "convo-outcome", name: "Conversation Outcome Agent", domain: "communications", domainIndex: 8, description: "Classifies conversation outcomes", capabilities: ["classification", "analysis"] },

  { id: "invoice-track", name: "Invoice Tracking Agent", domain: "finance_legal", domainIndex: 9, description: "Tracks invoice status and payments", capabilities: ["tracking", "alerting"] },
  { id: "payment-risk", name: "Payment Risk Agent", domain: "finance_legal", domainIndex: 9, description: "Assesses payment risk on accounts", capabilities: ["scoring", "risk_analysis"] },
  { id: "profitability", name: "Profitability Snapshot Agent", domain: "finance_legal", domainIndex: 9, description: "Calculates project and account profitability", capabilities: ["analytics", "reporting"] },
  { id: "legal-review", name: "Legal Review Flag Agent", domain: "finance_legal", domainIndex: 9, description: "Flags items requiring legal review", capabilities: ["classification", "routing"] },
  { id: "compliance-check", name: "Compliance Checklist Agent", domain: "finance_legal", domainIndex: 9, description: "Enforces compliance checklists", capabilities: ["validation", "enforcement"] },
  { id: "sop-structure", name: "SOP Structuring Agent", domain: "finance_legal", domainIndex: 9, description: "Structures and maintains SOPs", capabilities: ["content_generation", "organization"] },
  { id: "qa-review", name: "QA Review Agent", domain: "finance_legal", domainIndex: 9, description: "Reviews outputs for quality standards", capabilities: ["review", "validation"] },
  { id: "rejection-reason", name: "Rejection Reason Agent", domain: "finance_legal", domainIndex: 9, description: "Categorizes and tracks rejection reasons", capabilities: ["classification", "tracking"] },

  { id: "exec-report", name: "Executive Report Agent", domain: "reports", domainIndex: 10, description: "Generates executive-level reports", capabilities: ["reporting", "summarization"] },
  { id: "tech-report", name: "Technical Report Agent", domain: "reports", domainIndex: 10, description: "Generates technical/operational reports", capabilities: ["reporting", "analysis"] },
  { id: "archive-index", name: "Archive Indexing Agent", domain: "reports", domainIndex: 10, description: "Indexes and organizes archive content", capabilities: ["indexing", "organization"] },
  { id: "memory-update", name: "Memory Update Agent", domain: "reports", domainIndex: 10, description: "Updates knowledge base from operations", capabilities: ["learning", "updating"] },
  { id: "retrieval-suggest", name: "Retrieval Suggestion Agent", domain: "reports", domainIndex: 10, description: "Suggests relevant knowledge for context", capabilities: ["recommendation", "search"] },
  { id: "knowledge-relevance", name: "Knowledge Relevance Agent", domain: "reports", domainIndex: 10, description: "Scores knowledge relevance for decisions", capabilities: ["scoring", "ranking"] },

  { id: "permission-enforce", name: "Permission Enforcement Agent", domain: "system", domainIndex: 11, description: "Enforces role-based access control", capabilities: ["enforcement", "security"] },
  { id: "integration-health", name: "Integration Health Agent", domain: "system", domainIndex: 11, description: "Monitors integration connection health", capabilities: ["monitoring", "alerting"] },
  { id: "wallet-spend", name: "Wallet Spend Control Agent", domain: "system", domainIndex: 11, description: "Controls and monitors AI wallet spending", capabilities: ["monitoring", "enforcement"] },
  { id: "incident-aware", name: "Incident Awareness Agent", domain: "system", domainIndex: 11, description: "Detects and manages system incidents", capabilities: ["monitoring", "incident_management"] },
];

const agents: Map<string, AgentDefinition> = new Map();

function initAgents() {
  if (agents.size > 0) return;
  for (const def of agentDefinitions) {
    agents.set(def.id, {
      ...def,
      status: "idle",
      totalRuns: Math.floor(Math.random() * 50),
      successRate: 85 + Math.floor(Math.random() * 15),
      avgDuration: 200 + Math.floor(Math.random() * 2000),
    });
  }
}

export function getAllAgents(): AgentDefinition[] {
  initAgents();
  return Array.from(agents.values());
}

export function getAgentsByDomain(domain: string): AgentDefinition[] {
  initAgents();
  return Array.from(agents.values()).filter(a => a.domain === domain);
}

export function getAgent(id: string): AgentDefinition | undefined {
  initAgents();
  return agents.get(id);
}

export function updateAgentStatus(id: string, status: AgentStatus): boolean {
  initAgents();
  const agent = agents.get(id);
  if (!agent) return false;
  agent.status = status;
  if (status === "running") agent.lastRun = new Date();
  return true;
}

export function recordAgentRun(id: string, durationMs: number, success: boolean): boolean {
  initAgents();
  const agent = agents.get(id);
  if (!agent) return false;
  agent.totalRuns++;
  agent.lastRun = new Date();
  agent.status = "idle";
  const total = agent.totalRuns;
  agent.successRate = Math.round(((agent.successRate * (total - 1)) + (success ? 100 : 0)) / total);
  agent.avgDuration = Math.round(((agent.avgDuration ?? 0) * (total - 1) + durationMs) / total);
  return true;
}

export function getAgentStats() {
  initAgents();
  const all = Array.from(agents.values());
  const domainCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = { active: 0, idle: 0, running: 0, paused: 0, error: 0 };

  for (const a of all) {
    domainCounts[a.domain] = (domainCounts[a.domain] ?? 0) + 1;
    statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1;
  }

  return {
    total: all.length,
    domainCounts,
    statusCounts,
    avgSuccessRate: Math.round(all.reduce((s, a) => s + a.successRate, 0) / all.length),
    totalRuns: all.reduce((s, a) => s + a.totalRuns, 0),
  };
}

export const domainLabels: Record<string, string> = {
  command_center: "Command Center",
  intelligence: "Intelligence",
  outreach: "Outreach & Prospecting",
  marketing: "Marketing",
  production: "Production Studio",
  execution: "Execution & Operations",
  crm: "CRM & Sales",
  communications: "Communications",
  finance_legal: "Finance, Legal & QA",
  reports: "Reports & Archive",
  system: "System Core",
};
