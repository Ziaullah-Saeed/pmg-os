export type AgentStatus = "active" | "idle" | "running" | "paused" | "error";
export type TriggerType = "event" | "schedule" | "manual" | "threshold" | "chain";

export interface ConfidenceModel {
  minConfidence: number;
  escalateBelow: number;
  autoApproveAbove: number;
  method: "ai_scored" | "rule_based" | "hybrid";
}

export interface WalletBehavior {
  maxChargePerRun: number;
  budgetPool: "standard" | "premium" | "creative" | "system";
  chargeOnFailure: boolean;
}

export interface FallbackBehavior {
  strategy: "retry" | "degrade_gracefully" | "escalate_human" | "skip";
  maxRetries: number;
  fallbackAgentId?: string;
}

export interface ArchiveBehavior {
  autoArchive: boolean;
  retentionDays: number;
  archiveCategory: "knowledge" | "assets" | "reports" | "audit" | "communications";
}

export interface OutputStructure {
  format: "json" | "text" | "structured" | "file";
  requiredFields: string[];
  schema?: string;
}

export interface EnhancedAgentDefinition {
  id: string;
  purpose: string;
  trigger: { type: TriggerType; event?: string; schedule?: string; threshold?: string };
  domain: string;
  toolAccess: string[];
  confidenceModel: ConfidenceModel;
  outputStructure: OutputStructure;
  walletBehavior: WalletBehavior;
  fallbackBehavior: FallbackBehavior;
  archiveBehavior: ArchiveBehavior;
}

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
  // OUTREACH — 6 agents
  { id: "prospect-intelligence", name: "Prospect Intelligence", domain: "outreach", domainIndex: 1, description: "Researches and discovers cybersecurity companies matching ICP. Scores by fit, timing, and pain urgency. Outputs ranked prospect lists with enriched data.", capabilities: ["discovery", "research", "scoring", "enrichment"] },
  { id: "social-monitor", name: "Social Command Center", domain: "outreach", domainIndex: 1, description: "Monitors LinkedIn, Email, Facebook, X, YouTube across unified inbox. Classifies messages, detects signals, drafts responses for human review.", capabilities: ["monitoring", "classification", "drafting", "signal_detection"] },
  { id: "outreach-strategist", name: "Outreach Strategist", domain: "outreach", domainIndex: 1, description: "Builds personalized multi-channel approach plans per prospect. Determines channel priority, timing, messaging angle, and sequence cadence.", capabilities: ["strategy", "personalization", "sequencing", "channel_selection"] },
  { id: "message-composer", name: "Message Composer", domain: "outreach", domainIndex: 1, description: "Writes personalized outreach messages in human tone. LinkedIn DMs, emails, connection requests. Always previewed before sending.", capabilities: ["content_generation", "personalization", "tone_matching"] },
  { id: "followup-engine", name: "Follow-up Engine", domain: "outreach", domainIndex: 1, description: "Auto-schedules follow-ups based on response signals. Detects opens, clicks, replies. Escalates overdue items. Never auto-sends.", capabilities: ["scheduling", "signal_detection", "escalation", "tracking"] },
  { id: "outreach-analytics", name: "Outreach Analytics", domain: "outreach", domainIndex: 1, description: "Tracks response rates, meetings booked, pipeline generated per channel. Weekly performance reports and optimization recommendations.", capabilities: ["analytics", "reporting", "optimization"] },

  // CRM — 5 agents
  { id: "lead-qualification", name: "Lead Qualification", domain: "crm", domainIndex: 2, description: "Scores leads across 5 dimensions: authority, budget, need, timeline, fit. Auto-qualifies or flags for human review based on confidence.", capabilities: ["scoring", "qualification", "routing"] },
  { id: "deal-intelligence", name: "Deal Intelligence", domain: "crm", domainIndex: 2, description: "Pipeline management with health scoring. Tracks stage progression, identifies stuck deals, recommends next best actions per deal.", capabilities: ["pipeline_management", "health_scoring", "recommendations"] },
  { id: "call-intelligence", name: "Call Intelligence", domain: "crm", domainIndex: 2, description: "Pre-call briefing cards, during-call coaching prompts, post-call Zoom transcript analysis. Extracts action items and objections.", capabilities: ["briefing", "coaching", "transcript_analysis", "extraction"] },
  { id: "proposal-contract", name: "Proposal & Contract", domain: "crm", domainIndex: 2, description: "Generates custom proposals as downloadable PDFs. Tracks proposal lifecycle from draft to signed. Contract management.", capabilities: ["document_generation", "lifecycle_tracking", "contract_management"] },
  { id: "crm-sync", name: "CRM Sync", domain: "crm", domainIndex: 2, description: "Bidirectional sync with GHL main account, GHL sub-account for partner closers, and HubSpot. Deduplication and conflict resolution.", capabilities: ["sync", "integration", "deduplication"] },

  // MARKETING — 5 agents
  { id: "content-strategist", name: "Content Strategist", domain: "marketing", domainIndex: 3, description: "Content calendar management. Creates blog posts, social content, email sequences. All content in human tone targeting cybersecurity buyers.", capabilities: ["content_creation", "calendar_management", "strategy"] },
  { id: "advertising-agent", name: "Advertising Agent", domain: "marketing", domainIndex: 3, description: "Builds ad campaigns with targeting, copy, and budget allocation. Google Ads, LinkedIn Ads, Facebook Ads. A/B testing recommendations.", capabilities: ["campaign_creation", "targeting", "optimization"] },
  { id: "seo-growth", name: "SEO & Growth", domain: "marketing", domainIndex: 3, description: "Technical SEO audits, keyword research for cybersecurity niche, backlink analysis. Actionable growth plans with priority ranking.", capabilities: ["seo_audit", "keyword_research", "growth_planning"] },
  { id: "campaign-orchestrator", name: "Campaign Orchestrator", domain: "marketing", domainIndex: 3, description: "Coordinates multi-channel campaigns across email, social, ads, and content. Ensures consistent messaging and timing across all touchpoints.", capabilities: ["coordination", "scheduling", "campaign_management"] },
  { id: "competitor-intel", name: "Competitor Intelligence", domain: "marketing", domainIndex: 3, description: "Monitors competitor marketing activities. Generates battle cards, identifies positioning gaps, tracks market share trends.", capabilities: ["monitoring", "analysis", "battle_cards"] },

  // PRODUCTION — 8 agents
  { id: "client-onboarding", name: "Client Onboarding", domain: "production", domainIndex: 4, description: "Step-by-step onboarding checklist when deals close. Intake forms, kickoff scheduling, access setup, brand asset collection.", capabilities: ["workflow", "checklist", "scheduling"] },
  { id: "creative-director", name: "Creative Director", domain: "production", domainIndex: 4, description: "Brand guidelines enforcement, design brief creation, visual direction for all creative assets. Ensures consistency.", capabilities: ["creative_direction", "brand_management", "review"] },
  { id: "image-generator", name: "Image Generator", domain: "production", domainIndex: 4, description: "Text-to-image generation via DALL-E 3. Social graphics, ad creatives, thumbnails, infographics. Preview and download.", capabilities: ["image_generation", "creative_production"] },
  { id: "video-producer", name: "Video Producer", domain: "production", domainIndex: 4, description: "Text-to-video via Runway ML. Marketing clips, product demos, social reels, explainer videos. Preview and download.", capabilities: ["video_generation", "creative_production"] },
  { id: "document-creator", name: "Document Creator", domain: "production", domainIndex: 4, description: "Proposals, case studies, white papers, one-pagers. All generated as downloadable PDFs with brand-consistent formatting.", capabilities: ["document_generation", "formatting"] },
  { id: "brand-kit-manager", name: "Brand Kit Manager", domain: "production", domainIndex: 4, description: "Central source of truth for logos, colors, fonts, tone of voice. Accessible by all other agents for brand consistency.", capabilities: ["brand_management", "asset_storage"] },
  { id: "content-library", name: "Content Library", domain: "production", domainIndex: 4, description: "All created assets organized with status tracking, versioning, search, and tagging. Download center for the team.", capabilities: ["asset_management", "search", "versioning"] },
  { id: "quality-reviewer", name: "Quality Reviewer", domain: "production", domainIndex: 4, description: "AI reviews all content for brand consistency, factual accuracy, tone compliance, and formatting. Flags issues before publishing.", capabilities: ["review", "validation", "quality_assurance"] },

  // ADMIN — 4 agents
  { id: "operations-manager", name: "Operations Manager", domain: "admin", domainIndex: 5, description: "Task assignment engine, daily action plans, team workload balancing. Dashboard showing who's doing what and what's overdue.", capabilities: ["task_management", "workload_balancing", "reporting"] },
  { id: "knowledge-docs", name: "Knowledge & Documents", domain: "admin", domainIndex: 5, description: "Searchable knowledge base with SOPs, playbooks, and training materials. Auto-learns from operations and agent outputs.", capabilities: ["knowledge_management", "search", "auto_learning"] },
  { id: "executive-briefing", name: "Executive Briefing", domain: "admin", domainIndex: 5, description: "Morning briefing dashboard with key metrics, risk alerts, and priority items. Customizable per user role.", capabilities: ["reporting", "alerting", "summarization"] },
  { id: "system-evolution", name: "System Evolution", domain: "admin", domainIndex: 5, description: "Weekly market scan, monthly 'What's New' report, quarterly roadmap suggestions. User approves before system updates.", capabilities: ["market_scanning", "reporting", "recommendation"] },

  // FINANCE — 2 agents
  { id: "billing-revenue", name: "Billing & Revenue", domain: "finance", domainIndex: 6, description: "Invoice creation, payment tracking, wallet management. Revenue dashboard with MRR, ARR, and growth metrics.", capabilities: ["invoicing", "payment_tracking", "reporting"] },
  { id: "contract-expense", name: "Contract & Expense", domain: "finance", domainIndex: 6, description: "Contract lifecycle management, expense tracking, revenue forecasting. Budget vs actual reporting.", capabilities: ["contract_management", "expense_tracking", "forecasting"] },

  // CROSS-SYSTEM — 2 agents
  { id: "legal-compliance", name: "Legal & Compliance", domain: "system", domainIndex: 7, description: "Anti-spam verification on all outbound comms. GDPR compliance checks. Rate limiting enforcement. CAN-SPAM, TCPA, CCPA compliance.", capabilities: ["compliance", "verification", "rate_limiting", "legal_review"] },
  { id: "video-guide", name: "Video Guide System", domain: "system", domainIndex: 7, description: "Interactive video guides embedded in each section. Context-aware help. New feature walkthroughs. Training material generation.", capabilities: ["guide_generation", "training", "help_system"] },
];

const agents: Map<string, AgentDefinition> = new Map();

function initAgents() {
  if (agents.size > 0) return;
  for (const def of agentDefinitions) {
    agents.set(def.id, {
      ...def,
      status: "idle",
      totalRuns: 0,
      successRate: 100,
      avgDuration: 0,
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
  };
}

export const domainLabels: Record<string, string> = {
  outreach: "Outreach",
  crm: "CRM",
  marketing: "Marketing",
  production: "Production",
  admin: "Admin",
  finance: "Finance",
  system: "System",
};

const enhancedDefinitions: Map<string, EnhancedAgentDefinition> = new Map();

function initEnhanced() {
  if (enhancedDefinitions.size > 0) return;
  initAgents();
  for (const def of agentDefinitions) {
    enhancedDefinitions.set(def.id, {
      id: def.id,
      purpose: def.description,
      trigger: { type: "manual" as TriggerType },
      domain: def.domain,
      toolAccess: def.capabilities,
      confidenceModel: { minConfidence: 60, escalateBelow: 40, autoApproveAbove: 85, method: "hybrid" },
      outputStructure: { format: "json", requiredFields: ["result", "summary"] },
      walletBehavior: { maxChargePerRun: 5, budgetPool: def.domain === "production" ? "creative" : "standard", chargeOnFailure: false },
      fallbackBehavior: { strategy: "degrade_gracefully", maxRetries: 2 },
      archiveBehavior: { autoArchive: true, retentionDays: 90, archiveCategory: "knowledge" },
    });
  }
}

export function getEnhancedAgent(id: string): EnhancedAgentDefinition | undefined {
  initEnhanced();
  return enhancedDefinitions.get(id);
}

export function getAllEnhancedAgents(): EnhancedAgentDefinition[] {
  initEnhanced();
  return Array.from(enhancedDefinitions.values());
}

export function getFullAgentProfile(id: string) {
  initAgents();
  initEnhanced();
  const base = agents.get(id);
  const enhanced = enhancedDefinitions.get(id);
  if (!base) return undefined;
  return { ...base, enhanced: enhanced ?? null };
}

export function getAllFullAgentProfiles() {
  initAgents();
  initEnhanced();
  return Array.from(agents.values()).map(a => ({
    ...a,
    enhanced: enhancedDefinitions.get(a.id) ?? null,
  }));
}
