import { useState } from "react";
import { useListCompanies, useListContacts, useListLeads } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfidenceMeter } from "@/components/ui/confidence-meter";
import { DetailDrawer } from "@/components/ui/detail-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { ModeAwareWrapper, ModeIndicatorBanner, HumanWorkflowGuide, HybridItemBadge } from "@/components/mode-aware-wrapper";
import {
  BrainCircuit, Target, Building2, Users, Shield, Search,
  Sparkles, Globe, AlertTriangle, Plus, Eye,
  Crosshair, Lightbulb, ArrowRight, MapPin
} from "lucide-react";

const tabs = [
  { id: "companies", label: "Company Intelligence", icon: <Building2 className="h-3.5 w-3.5" /> },
  { id: "contacts", label: "Decision Maker Map", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "icp", label: "ICP Analysis", icon: <Crosshair className="h-3.5 w-3.5" /> },
  { id: "competitors", label: "Competitor Watch", icon: <Eye className="h-3.5 w-3.5" /> },
  { id: "pain", label: "Pain Analysis", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  { id: "positioning", label: "Positioning", icon: <Lightbulb className="h-3.5 w-3.5" /> },
];

const competitors = [
  { name: "Accenture Security", strength: "Global brand, enterprise relationships", weakness: "Expensive, slow engagement", threat: 85, segments: ["Enterprise", "Government"] },
  { name: "Deloitte Cyber", strength: "Compliance expertise, audit integration", weakness: "Complex procurement, long timelines", threat: 65, segments: ["Financial Services", "Healthcare"] },
  { name: "CrowdStrike Services", strength: "Tech-first, strong detection platform", weakness: "Limited managed services depth", threat: 55, segments: ["Technology", "SaaS"] },
  { name: "Boutique IT Firms", strength: "Price competitive, local presence", weakness: "Limited scale, narrow expertise", threat: 30, segments: ["SMB", "Local"] },
];

const painThemes = [
  { theme: "Compliance & Regulatory Pressure", urgency: 95, frequency: "Very High", segments: ["MSPs", "Healthcare IT"], opportunity: "Position as compliance-first security partner" },
  { theme: "Talent Shortage in Security", urgency: 88, frequency: "High", segments: ["All Cybersecurity"], opportunity: "AI-augmented security services" },
  { theme: "Lead Generation Struggles", urgency: 82, frequency: "High", segments: ["Small MSPs", "Startups"], opportunity: "Done-for-you pipeline building" },
  { theme: "Brand Trust & Authority", urgency: 75, frequency: "Medium", segments: ["New Entrants", "Regional Firms"], opportunity: "Authority content & positioning" },
  { theme: "Client Retention Risk", urgency: 70, frequency: "Medium", segments: ["Growing MSPs"], opportunity: "Client success frameworks" },
];

export default function Intelligence() {
  const [activeTab, setActiveTab] = useState("companies");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const { data: companies } = useListCompanies();
  const { data: contacts } = useListContacts();
  const { data: leads } = useListLeads();
  const { isHuman, isHybrid, isAuto } = useAiModeContext();

  const companyList = (companies ?? []) as any[];
  const contactList = (contacts ?? []) as any[];
  const leadList = (leads ?? []) as any[];

  const avgFitScore = leadList.length
    ? Math.round(leadList.reduce((sum: number, l: any) => sum + (l.fitScore ?? l.fit_score ?? 0), 0) / leadList.length)
    : 0;
  const decisionMakers = contactList.filter((c: any) => c.isDecisionMaker ?? c.is_decision_maker);

  const humanWorkflowSteps = [
    { id: "1", title: "Identify Target Industries", description: "Review your ICP criteria and select 3-5 target verticals for research", status: "current" as const, action: "Start Research" },
    { id: "2", title: "Map Decision Makers", description: "For each target company, identify the key decision makers and their roles", status: "upcoming" as const },
    { id: "3", title: "Analyze Competitor Positioning", description: "Review competitor offerings, pricing, and market positioning", status: "upcoming" as const },
    { id: "4", title: "Build Pain Point Matrix", description: "Document prospect pain points mapped to your solutions", status: "upcoming" as const },
    { id: "5", title: "Create Intelligence Brief", description: "Compile findings into an actionable intelligence report for the team", status: "upcoming" as const },
  ];

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Intelligence Engine"
        subtitle={isHuman ? "Manual market research, ICP modeling, and strategic intelligence" : "Market research, ICP modeling, competitor analysis, and strategic intelligence"}
        icon={<BrainCircuit className="h-5 w-5" />}
        actions={
          isHuman ? (
            <Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg">
              <Plus className="h-4 w-4 mr-2" />Add Company
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg">
                <Plus className="h-4 w-4 mr-2" />Build ICP
              </Button>
              <Button className="btn-glass text-foreground text-sm px-4 py-2 rounded-lg">
                <Sparkles className="h-4 w-4 mr-2" />AI Enrich
              </Button>
            </div>
          )
        }
      />

      <ModeIndicatorBanner />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Companies Tracked" value={companyList.length} icon={<Building2 className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Contacts Mapped" value={contactList.length} icon={<Users className="h-4 w-4" />} />
        <KpiCard label="Decision Makers" value={decisionMakers.length} icon={<Shield className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Avg Fit Score" value={`${avgFitScore}%`} icon={<Target className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Active Leads" value={leadList.length} icon={<Crosshair className="h-4 w-4" />} accent="success" />
      </div>

      <ModeAwareWrapper
        domain="intelligence"
        humanContent={
          <div className="space-y-6">
            <HumanWorkflowGuide title="Intelligence Research Workflow" steps={humanWorkflowSteps} icon={<BrainCircuit className="h-5 w-5 text-blue-400" />} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassCard>
                <h3 className="text-sm font-semibold mb-3">Manual Research Checklist</h3>
                <div className="space-y-2">
                  {["Review LinkedIn for decision makers", "Check company website for tech stack", "Research recent news & press releases", "Identify compliance requirements", "Map organizational structure"].map((item, i) => (
                    <label key={i} className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input type="checkbox" className="rounded border-slate-600" />
                      {item}
                    </label>
                  ))}
                </div>
              </GlassCard>
              <GlassCard>
                <h3 className="text-sm font-semibold mb-3">Quick Add Company</h3>
                <div className="space-y-3">
                  <input placeholder="Company name..." className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-sm" />
                  <input placeholder="Industry..." className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-sm" />
                  <input placeholder="Website URL..." className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-sm" />
                  <textarea placeholder="Notes about this prospect..." className="w-full px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-sm h-20 resize-none" />
                  <Button className="btn-premium text-white text-sm w-full">Save Company</Button>
                </div>
              </GlassCard>
            </div>
            <GlassCard>
              <h3 className="text-sm font-semibold mb-3">Companies ({companyList.length})</h3>
              <div className="space-y-2">
                {companyList.slice(0, 10).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.industry} · {c.website}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs">View Details</Button>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        }
      >
      <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeTab === "companies" && (
          <div className="space-y-3">
            {companyList.map((company: any) => (
              <GlassCard key={company.id} variant="interactive" className="cursor-pointer" onClick={() => setSelectedCompany(company)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-crimson/10 flex items-center justify-center text-crimson font-bold text-sm shrink-0">
                      {company.name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm">{company.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Globe className="h-3 w-3" />{company.industry}
                        <MapPin className="h-3 w-3 ml-1" />{company.location}
                        <span className="ml-1">{company.size} employees</span>
                      </div>
                      {(company.painPoints ?? company.pain_points) && (
                        <p className="text-xs text-warning mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {company.painPoints ?? company.pain_points}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className="text-center">
                      <ConfidenceMeter score={company.fitScore ?? company.fit_score ?? 0} className="w-20" />
                    </div>
                    <StatusBadge variant={company.status === "active_client" ? "active" : "pending"} label={company.status?.replace(/_/g, " ")} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </GlassCard>
            ))}
            {companyList.length === 0 && (
              <GlassCard className="py-12 flex flex-col items-center gap-3">
                <Building2 className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No companies tracked yet</p>
              </GlassCard>
            )}
          </div>
        )}

        {activeTab === "contacts" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {contactList.map((contact: any) => {
              const company = companyList.find((c: any) => c.id === contact.companyId || c.id === contact.company_id);
              const authorityLevel = contact.authorityLevel ?? contact.authority_level ?? "unknown";
              return (
                <GlassCard key={contact.id} variant="interactive" className="cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-crimson/40 to-crimson/10 flex items-center justify-center text-crimson font-bold shrink-0">
                      {(contact.firstName ?? contact.first_name ?? "?").charAt(0)}{(contact.lastName ?? contact.last_name ?? "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm">{contact.firstName ?? contact.first_name} {contact.lastName ?? contact.last_name}</h3>
                        {(contact.isDecisionMaker ?? contact.is_decision_maker) && (
                          <StatusBadge variant="ai-recommended" label="Decision Maker" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{contact.title}</p>
                      <p className="text-[10px] text-muted-foreground">{company?.name ?? "Unknown Company"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold capitalize">{authorityLevel?.replace(/_/g, " ")}</p>
                      <div className="flex gap-1 mt-1">
                        {contact.email && <Badge variant="outline" className="text-[9px] px-1">Email</Badge>}
                        {contact.phone && <Badge variant="outline" className="text-[9px] px-1">Phone</Badge>}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {activeTab === "icp" && (
          <div className="space-y-6">
            <GlassCard glow="crimson" className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Ideal Customer Profile — PMG Group</h3>
                </div>
                <StatusBadge variant="ai-executed" label="AI Analyzed" />
              </div>
              <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-crimson uppercase tracking-wider">Firmographics</h4>
                  <IcpItem label="Industry" value="IT Services, Financial Services, Healthcare, SaaS" />
                  <IcpItem label="Company Size" value="50-500 employees" />
                  <IcpItem label="Revenue" value="$5M - $100M ARR" />
                  <IcpItem label="Geography" value="United States, Canada" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-crimson uppercase tracking-wider">Pain Signals</h4>
                  <IcpItem label="Primary" value="Cybersecurity compliance gaps" />
                  <IcpItem label="Secondary" value="IT infrastructure scaling challenges" />
                  <IcpItem label="Trigger" value="Recent breach, audit finding, growth phase" />
                  <IcpItem label="Urgency" value="Regulatory deadline or board mandate" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-crimson uppercase tracking-wider">Decision Criteria</h4>
                  <IcpItem label="Buyer" value="CTO, CISO, VP Engineering" />
                  <IcpItem label="Budget" value="$50K - $500K annually" />
                  <IcpItem label="Timeline" value="30-90 day decision cycle" />
                  <IcpItem label="Competition" value="Accenture, Deloitte, boutique firms" />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3">
                <h3 className="text-sm font-semibold">ICP Fit Analysis</h3>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {companyList.map((c: any) => {
                  const fit = c.fitScore ?? c.fit_score ?? 0;
                  return (
                    <div key={c.id} className="flex items-center gap-4 p-3 rounded-lg glass-surface">
                      <div className="w-8 h-8 rounded-lg bg-crimson/10 flex items-center justify-center text-crimson font-bold text-xs shrink-0">{c.name?.charAt(0)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{c.name}</p>
                        <p className="text-[10px] text-muted-foreground">{c.industry} &bull; {c.size} employees</p>
                      </div>
                      <ConfidenceMeter score={fit} className="w-28" />
                      <StatusBadge variant={fit >= 80 ? "success" : fit >= 60 ? "warning" : "critical"} label={fit >= 80 ? "Strong Fit" : fit >= 60 ? "Moderate" : "Weak"} />
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "competitors" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competitors.map((comp) => (
              <GlassCard key={comp.name} variant="interactive" className="cursor-pointer">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg glass-surface flex items-center justify-center font-bold text-sm">{comp.name.charAt(0)}</div>
                    <div>
                      <h3 className="font-semibold text-sm">{comp.name}</h3>
                      <div className="flex gap-1 mt-0.5">
                        {comp.segments.map((s) => <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>)}
                      </div>
                    </div>
                  </div>
                  <StatusBadge variant={comp.threat > 70 ? "critical" : comp.threat > 50 ? "warning" : "active"} label={`Threat: ${comp.threat}%`} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded-lg glass-surface">
                    <p className="text-[10px] font-semibold text-success mb-0.5">Strength</p>
                    <p className="text-xs text-muted-foreground">{comp.strength}</p>
                  </div>
                  <div className="p-2 rounded-lg glass-surface">
                    <p className="text-[10px] font-semibold text-crimson mb-0.5">Weakness</p>
                    <p className="text-xs text-muted-foreground">{comp.weakness}</p>
                  </div>
                </div>
                <ConfidenceMeter score={comp.threat} className="mt-3" />
              </GlassCard>
            ))}
          </div>
        )}

        {activeTab === "pain" && (
          <div className="space-y-3">
            {painThemes.map((pain, i) => (
              <GlassCard key={i} variant="interactive" className="cursor-pointer">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold mb-1">{pain.theme}</h3>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs text-muted-foreground">Urgency: {pain.urgency}%</span>
                      <span className="text-xs text-muted-foreground">Frequency: {pain.frequency}</span>
                    </div>
                    <ConfidenceMeter score={pain.urgency} className="mb-2" />
                    <div className="flex flex-wrap gap-1 mb-2">
                      {pain.segments.map((seg) => (
                        <span key={seg} className="text-[10px] px-2 py-0.5 rounded-full glass-surface">{seg}</span>
                      ))}
                    </div>
                    <div className="p-2 rounded-lg glass-surface">
                      <p className="text-[10px] uppercase tracking-wider text-gold mb-0.5">PMG Opportunity</p>
                      <p className="text-xs">{pain.opportunity}</p>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {activeTab === "positioning" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Competitive Advantages</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "AI-Native Operations", desc: "Fully autonomous cybersecurity workflows" },
                    { label: "Speed-to-Deploy", desc: "72-hour onboarding vs 30-day industry avg" },
                    { label: "Proactive Threat Intel", desc: "Continuous monitoring with AI escalation" },
                    { label: "SMB Specialist", desc: "Enterprise-grade security at SMB pricing" },
                  ].map((adv) => (
                    <div key={adv.label} className="p-2 rounded glass-surface">
                      <p className="text-xs font-medium text-white">{adv.label}</p>
                      <p className="text-[10px] text-muted-foreground">{adv.desc}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-gold" />
                  <h3 className="text-sm font-semibold">Identified Gaps</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Brand Awareness", severity: 75, note: "Low recognition outside DFW region" },
                    { label: "Enterprise Case Studies", severity: 60, note: "Need 3+ logo-worthy references" },
                    { label: "Compliance Certifications", severity: 45, note: "SOC2 Type II in progress" },
                    { label: "Partner Ecosystem", severity: 55, note: "Limited reseller channel" },
                  ].map((gap) => (
                    <div key={gap.label} className="p-2 rounded glass-surface">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-white">{gap.label}</p>
                        <span className="text-[10px] text-muted-foreground">{gap.severity}% impact</span>
                      </div>
                      <div className="w-full h-1 bg-muted rounded-full mb-1"><div className="h-1 rounded-full bg-gold" style={{ width: `${gap.severity}%` }} /></div>
                      <p className="text-[10px] text-muted-foreground">{gap.note}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-green-400" />
                  <h3 className="text-sm font-semibold">Message-Market Fit</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { segment: "Healthcare SMB", fit: 92, message: "HIPAA compliance without the enterprise price tag" },
                    { segment: "Financial Services", fit: 78, message: "Continuous compliance monitoring & reporting" },
                    { segment: "Legal Firms", fit: 85, message: "Client data protection with audit trails" },
                    { segment: "Manufacturing", fit: 64, message: "OT/IT convergence security" },
                  ].map((seg) => (
                    <div key={seg.segment} className="p-2 rounded glass-surface">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-white">{seg.segment}</p>
                        <ConfidenceMeter score={seg.fit} size="sm" className="w-16" />
                      </div>
                      <p className="text-[10px] text-muted-foreground italic">"{seg.message}"</p>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            <GlassCard>
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-4 w-4 text-gold" />
                <h3 className="text-sm font-semibold">Strategic Differentiation Matrix</h3>
                <StatusBadge variant="ai-executed" label="AI Generated" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-white/5">
                      <th className="text-left py-2 px-3">Dimension</th>
                      <th className="text-left py-2 px-3">PMG Group</th>
                      <th className="text-left py-2 px-3">Traditional MSSPs</th>
                      <th className="text-left py-2 px-3">Big 4 Cyber</th>
                      <th className="text-left py-2 px-3">Edge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { dim: "Response Time", pmg: "< 15 min", trad: "1-4 hours", big4: "24-48 hours", edge: "Strong" },
                      { dim: "AI Integration", pmg: "Native", trad: "Bolt-on", big4: "In development", edge: "Strong" },
                      { dim: "Pricing Model", pmg: "Per-seat flat", trad: "Tiered", big4: "Project-based", edge: "Strong" },
                      { dim: "Customization", pmg: "High", trad: "Medium", big4: "Low", edge: "Moderate" },
                      { dim: "Compliance", pmg: "Automated", trad: "Manual", big4: "Comprehensive", edge: "Moderate" },
                    ].map((row) => (
                      <tr key={row.dim} className="border-b border-white/5">
                        <td className="py-2 px-3 font-medium">{row.dim}</td>
                        <td className="py-2 px-3 text-green-400">{row.pmg}</td>
                        <td className="py-2 px-3 text-muted-foreground">{row.trad}</td>
                        <td className="py-2 px-3 text-muted-foreground">{row.big4}</td>
                        <td className="py-2 px-3"><Badge variant="outline" className={`text-[9px] ${row.edge === "Strong" ? "border-green-500/50 text-green-400" : "border-gold/50 text-gold"}`}>{row.edge}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}
      </motion.div>
      </ModeAwareWrapper>

      <DetailDrawer
        open={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
        title={selectedCompany?.name}
        subtitle={`${selectedCompany?.industry} • ${selectedCompany?.location}`}
        badge={selectedCompany ? <ConfidenceMeter score={selectedCompany.fitScore ?? selectedCompany.fit_score ?? 0} className="w-24" /> : undefined}
      >
        {selectedCompany && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold gradient-text-crimson">{selectedCompany.fitScore ?? selectedCompany.fit_score}%</p>
                <p className="text-[10px] text-muted-foreground">Fit Score</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <p className="text-lg font-bold">{selectedCompany.size}</p>
                <p className="text-[10px] text-muted-foreground">Employees</p>
              </div>
              <div className="p-3 rounded-lg glass-surface text-center">
                <StatusBadge variant={selectedCompany.status === "active_client" ? "active" : "pending"} label={selectedCompany.status?.replace(/_/g, " ")} />
              </div>
            </div>
            {(selectedCompany.painPoints ?? selectedCompany.pain_points) && (
              <GlassCard variant="alert-warning">
                <p className="text-xs font-semibold text-warning mb-1">Identified Pain Points</p>
                <p className="text-sm">{selectedCompany.painPoints ?? selectedCompany.pain_points}</p>
              </GlassCard>
            )}
            {contactList.filter((c: any) => (c.companyId ?? c.company_id) === selectedCompany.id).length > 0 && (
              <div>
                <h4 className="section-header mb-2">Key Contacts</h4>
                {contactList.filter((c: any) => (c.companyId ?? c.company_id) === selectedCompany.id).map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between p-2 rounded-lg glass-surface mb-1">
                    <div>
                      <p className="text-sm font-medium">{c.firstName ?? c.first_name} {c.lastName ?? c.last_name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.title}</p>
                    </div>
                    <div className="flex gap-1">
                      {(c.isDecisionMaker ?? c.is_decision_maker) && <StatusBadge variant="ai-recommended" label="DM" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Button className="btn-glass text-foreground flex-1 text-sm rounded-lg"><Sparkles className="h-4 w-4 mr-2" />AI Enrich</Button>
              <Button className="btn-premium text-white flex-1 text-sm rounded-lg"><ArrowRight className="h-4 w-4 mr-2" />Create Outreach</Button>
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
}

function IcpItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg glass-surface">
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      <p className="text-xs">{value}</p>
    </div>
  );
}
