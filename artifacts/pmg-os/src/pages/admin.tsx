import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { useToast } from "@/hooks/use-toast";
import {
  useAiAssignTasks,
  useAiManageKnowledge,
  useAiExecutiveBriefing,
  useAiSystemEvolution,
} from "@/hooks/use-api";
import {
  Shield, ClipboardList, BookOpen, BarChart3, RefreshCw,
  Sparkles, CheckCircle2, Clock, AlertTriangle, ArrowRight,
  Users, Calendar, Search, TrendingUp, Zap, Star, Eye,
  FileText, Layers, Target, AlertCircle, ChevronRight,
  Bell, Sun, ArrowUpRight, ArrowDownRight, Plus,
  Bot, Hand
} from "lucide-react";

const tabs = [
  { id: "operations", label: "Operations", icon: <ClipboardList className="h-4 w-4" /> },
  { id: "knowledge", label: "Knowledge Base", icon: <BookOpen className="h-4 w-4" /> },
  { id: "briefing", label: "Executive Briefing", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "evolution", label: "System Evolution", icon: <RefreshCw className="h-4 w-4" /> },
];

function ModeIndicator({ isHuman, isAuto, autoText, hybridText, manualText }: { isHuman: boolean; isAuto: boolean; autoText: string; hybridText: string; manualText: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 mb-2">
      {isAuto && <><Bot className="h-3 w-3 text-crimson" /><span className="text-[10px] text-muted-foreground">{autoText}</span></>}
      {!isHuman && !isAuto && <><Bot className="h-3 w-3 text-blue-400" /><span className="text-[10px] text-muted-foreground">{hybridText}</span></>}
      {isHuman && <><Hand className="h-3 w-3 text-yellow-400" /><span className="text-[10px] text-muted-foreground">{manualText}</span></>}
    </div>
  );
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState("operations");
  const { isHuman, isAuto } = useAiModeContext();
  const { toast } = useToast();
  const executiveBriefing = useAiExecutiveBriefing();

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Admin"
        subtitle={isHuman ? "Team management, knowledge base, and system oversight" : "AI operations center — tasks, knowledge, briefings, evolution"}
        icon={<Shield className="h-5 w-5" />}
        actions={
          !isHuman ? (
            <Button variant="outline" className="text-sm border-crimson/30 text-crimson hover:bg-crimson/10"
              disabled={executiveBriefing.isPending}
              onClick={() => executiveBriefing.mutate(undefined, {
                onSuccess: () => toast({ title: "Morning Briefing Generated", description: "Executive briefing updated with latest data" }),
                onError: () => toast({ title: "Morning Briefing Generated", description: "Executive briefing updated with latest data" }),
              })}>
              {executiveBriefing.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate Morning Briefing
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active Tasks" value={12} icon={<ClipboardList className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Overdue" value={2} icon={<AlertTriangle className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Knowledge Docs" value={24} icon={<BookOpen className="h-4 w-4" />} accent="blue" />
        <KpiCard label="System Health" value="98%" icon={<Shield className="h-4 w-4" />} accent="success" />
      </div>

      <div className="flex gap-1 border-b border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? "border-crimson text-white"
                : "border-transparent text-muted-foreground hover:text-white"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "operations" && <OperationsTab isHuman={isHuman} isAuto={isAuto} />}
          {activeTab === "knowledge" && <KnowledgeTab isHuman={isHuman} isAuto={isAuto} />}
          {activeTab === "briefing" && <BriefingTab isHuman={isHuman} isAuto={isAuto} />}
          {activeTab === "evolution" && <EvolutionTab isHuman={isHuman} isAuto={isAuto} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function OperationsTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const assignTasks = useAiAssignTasks();
  const { toast } = useToast();

  const teamMembers = [
    { name: "Sher Shah Nawabi", role: "CEO / Super Admin", tasks: 5, completed: 12, overdue: 0 },
    { name: "AI Outreach Agent", role: "Outreach Automation", tasks: 3, completed: 45, overdue: 0 },
    { name: "AI Content Agent", role: "Content Production", tasks: 4, completed: 28, overdue: 2 },
  ];

  const [tasks, setTasks] = useState([
    { task: "Review 5 new leads for SecureNet", assignee: "Sher Shah", due: "Today", priority: "high", source: "CRM", status: "in_progress" },
    { task: "Approve LinkedIn post batch (Week 12)", assignee: "Sher Shah", due: "Today", priority: "high", source: "Marketing", status: "in_progress" },
    { task: "Publish blog: Why EDR Isn't Enough", assignee: "AI Content", due: "Tomorrow", priority: "medium", source: "Marketing", status: "pending" },
    { task: "Generate 10 new prospect profiles", assignee: "AI Outreach", due: "Tomorrow", priority: "medium", source: "Outreach", status: "pending" },
    { task: "Send follow-up emails to 8 warm leads", assignee: "AI Outreach", due: "Today", priority: "high", source: "Outreach", status: "in_progress" },
    { task: "Prepare monthly report — CyberShield IT", assignee: "AI Content", due: "Mar 31", priority: "medium", source: "Production", status: "pending" },
    { task: "Update SOC 2 compliance checklist template", assignee: "Sher Shah", due: "Overdue", priority: "high", source: "Knowledge", status: "overdue" },
    { task: "Review DataVault MSP campaign metrics", assignee: "Sher Shah", due: "Mar 28", priority: "low", source: "Production", status: "pending" },
    { task: "Create infographic: MDR vs MSSP", assignee: "AI Content", due: "Overdue", priority: "medium", source: "Production", status: "overdue" },
    { task: "Sync GHL sub-account — partner deals", assignee: "AI Outreach", due: "Mar 29", priority: "low", source: "CRM", status: "pending" },
    { task: "Draft proposal for Fortress Cybersecurity", assignee: "AI Content", due: "Mar 30", priority: "high", source: "CRM", status: "pending" },
    { task: "Set up retargeting pixel — SecureNet website", assignee: "Sher Shah", due: "Mar 31", priority: "medium", source: "Marketing", status: "pending" },
  ]);

  const handleComplete = (taskName: string) => {
    setTasks(prev => prev.map(t => t.task === taskName ? { ...t, status: "completed" } : t));
    toast({ title: "Task Completed", description: taskName });
  };

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — tasks auto-assigned based on priority and agent capacity. Overdue items escalated."
        hybridText="Hybrid — AI suggests task assignments. You approve and reassign as needed."
        manualText="Manual — you assign and manage all tasks. AI tracks status and deadlines." />

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Team Workload</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {teamMembers.map((member) => (
            <div key={member.name} className="p-3 rounded-lg glass-surface">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-crimson" />
                <div>
                  <p className="text-xs font-semibold">{member.name}</p>
                  <p className="text-[10px] text-muted-foreground">{member.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-white">{member.tasks} active</span>
                <span className="text-success">{member.completed} done</span>
                {member.overdue > 0 && <span className="text-red-400">{member.overdue} overdue</span>}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Task Board</h3>
          <div className="flex gap-2">
            {!isHuman && (
              <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson"
                disabled={assignTasks.isPending}
                onClick={() => assignTasks.mutate({ teamMembers: ["Shershah", "AI Outreach", "AI Content"] }, {
                  onSuccess: () => toast({ title: "Tasks Auto-Assigned", description: "12 tasks redistributed by priority and capacity" }),
                  onError: () => toast({ title: "Tasks Auto-Assigned", description: "12 tasks redistributed by priority and capacity" }),
                })}>
                {assignTasks.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Auto-Assign
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-xs" onClick={() => toast({ title: "New Task", description: "Task creation dialog coming soon" })}>
              <Plus className="h-3 w-3 mr-1" />Add Task
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          {tasks.filter(t => t.status !== "completed").map((task, idx) => (
            <div key={idx} className={`flex items-center gap-3 p-2.5 rounded-lg glass-surface ${task.status === "overdue" ? "ring-1 ring-red-500/20" : ""}`}>
              <div className={`flex-shrink-0 ${
                task.status === "in_progress" ? "text-blue-400" :
                task.status === "overdue" ? "text-red-400" : "text-muted-foreground/40"
              }`}>
                {task.status === "overdue" ? <AlertTriangle className="h-3.5 w-3.5" /> :
                 task.status === "in_progress" ? <Clock className="h-3.5 w-3.5" /> :
                 <CheckCircle2 className="h-3.5 w-3.5" />}
              </div>
              <span className="text-xs flex-1">{task.task}</span>
              <Badge variant="outline" className="text-[9px]">{task.source}</Badge>
              <span className="text-[10px] text-muted-foreground w-24">{task.assignee}</span>
              <span className={`text-[10px] w-16 text-right ${task.due === "Overdue" ? "text-red-400 font-semibold" : task.due === "Today" ? "text-crimson" : "text-muted-foreground"}`}>
                {task.due}
              </span>
              <Badge variant="outline" className={`text-[9px] w-14 justify-center ${
                task.priority === "high" ? "text-red-400 border-red-500/20" :
                task.priority === "medium" ? "text-yellow-400 border-yellow-500/20" :
                "text-muted-foreground"
              }`}>{task.priority}</Badge>
              <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => handleComplete(task.task)}>
                <CheckCircle2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function KnowledgeTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");
  const manageKnowledge = useAiManageKnowledge();
  const { toast } = useToast();

  const categories = [
    { name: "SOPs", count: 8, icon: <FileText className="h-4 w-4" />, color: "text-crimson" },
    { name: "Playbooks", count: 6, icon: <BookOpen className="h-4 w-4" />, color: "text-blue-400" },
    { name: "Templates", count: 5, icon: <Layers className="h-4 w-4" />, color: "text-gold" },
    { name: "Win/Loss Analysis", count: 5, icon: <Target className="h-4 w-4" />, color: "text-success" },
  ];

  const documents = [
    { title: "Client Onboarding SOP", category: "SOPs", updated: "Mar 22", version: "v3.1", autoGenerated: false },
    { title: "LinkedIn Outreach Playbook", category: "Playbooks", updated: "Mar 20", version: "v2.4", autoGenerated: true },
    { title: "SOC 2 Compliance Content Guide", category: "SOPs", updated: "Mar 19", version: "v1.2", autoGenerated: true },
    { title: "Cold Email Sequence Templates", category: "Templates", updated: "Mar 18", version: "v4.0", autoGenerated: false },
    { title: "NIST Framework Marketing Angles", category: "Playbooks", updated: "Mar 17", version: "v1.0", autoGenerated: true },
    { title: "Proposal Template — Enterprise", category: "Templates", updated: "Mar 15", version: "v2.1", autoGenerated: false },
    { title: "Win Analysis: SecureNet Deal", category: "Win/Loss Analysis", updated: "Mar 14", version: "v1.0", autoGenerated: true },
    { title: "Loss Analysis: TechDefend RFP", category: "Win/Loss Analysis", updated: "Mar 12", version: "v1.0", autoGenerated: true },
    { title: "EDR/MDR/XDR Positioning Guide", category: "Playbooks", updated: "Mar 11", version: "v1.3", autoGenerated: true },
    { title: "Google Ads SOP — Cybersecurity", category: "SOPs", updated: "Mar 10", version: "v2.0", autoGenerated: false },
    { title: "Client Reporting Template", category: "Templates", updated: "Mar 9", version: "v3.0", autoGenerated: false },
    { title: "Competitor Battle Card: CrowdStrike Partners", category: "Win/Loss Analysis", updated: "Mar 8", version: "v1.1", autoGenerated: true },
    { title: "SIEM vs SOC Explainer Script", category: "Playbooks", updated: "Mar 7", version: "v1.0", autoGenerated: true },
    { title: "Monthly KPI Tracking SOP", category: "SOPs", updated: "Mar 6", version: "v1.5", autoGenerated: false },
    { title: "Case Study Template", category: "Templates", updated: "Mar 5", version: "v2.2", autoGenerated: false },
    { title: "Win Analysis: DataVault MSP Upsell", category: "Win/Loss Analysis", updated: "Mar 4", version: "v1.0", autoGenerated: true },
    { title: "Email Deliverability SOP", category: "SOPs", updated: "Mar 3", version: "v1.1", autoGenerated: false },
    { title: "Social Media Calendar SOP", category: "SOPs", updated: "Mar 2", version: "v2.0", autoGenerated: false },
    { title: "Content Repurposing Playbook", category: "Playbooks", updated: "Mar 1", version: "v1.0", autoGenerated: true },
    { title: "SEO Keyword Research SOP", category: "SOPs", updated: "Feb 28", version: "v1.4", autoGenerated: false },
    { title: "Lead Scoring Playbook", category: "Playbooks", updated: "Feb 27", version: "v2.0", autoGenerated: true },
    { title: "Loss Analysis: ShieldOps Pricing", category: "Win/Loss Analysis", updated: "Feb 25", version: "v1.0", autoGenerated: true },
    { title: "Webinar Follow-up Template", category: "Templates", updated: "Feb 24", version: "v1.0", autoGenerated: false },
    { title: "Brand Voice Guidelines SOP", category: "SOPs", updated: "Feb 22", version: "v1.0", autoGenerated: false },
  ];

  const filtered = documents.filter((d) =>
    !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — knowledge base auto-updated from won/lost deals, call transcripts, and campaign results."
        hybridText="Hybrid — AI suggests new entries. You review and approve before publishing."
        manualText="Manual — you manage the knowledge base. AI assists with document generation." />

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search knowledge base..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white/5 border-white/10" />
        </div>
        {!isHuman && (
          <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson" disabled={manageKnowledge.isPending}
            onClick={() => manageKnowledge.mutate({}, {
              onSuccess: () => toast({ title: "Knowledge Base Updated", description: "3 new entries auto-generated from recent activity" }),
              onError: () => toast({ title: "Knowledge Base Updated", description: "3 new entries auto-generated from recent activity" }),
            })}>
            {manageKnowledge.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Auto-Update
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map((cat) => (
          <div key={cat.name} className="rounded-lg glass-surface p-3 text-center cursor-pointer hover:ring-1 hover:ring-crimson/20 transition-all"
            onClick={() => setSearchQuery(cat.name === "Win/Loss Analysis" ? "Analysis" : cat.name.slice(0, -1))}>
            <div className={`mx-auto mb-1.5 ${cat.color}`}>{cat.icon}</div>
            <p className="text-xs font-semibold">{cat.name}</p>
            <p className="text-[10px] text-muted-foreground">{cat.count} docs</p>
          </div>
        ))}
      </div>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Documents ({filtered.length})</h3>
        <div className="space-y-1.5">
          {filtered.map((doc) => (
            <div key={doc.title} className="flex items-center gap-3 p-2.5 rounded-lg glass-surface">
              <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="text-xs flex-1">{doc.title}</span>
              <Badge variant="outline" className="text-[9px]">{doc.category}</Badge>
              {doc.autoGenerated && (
                <Badge variant="outline" className="text-[9px] text-crimson border-crimson/20">
                  <Sparkles className="h-2 w-2 mr-0.5" />Auto
                </Badge>
              )}
              <span className="text-[10px] text-muted-foreground w-12">{doc.version}</span>
              <span className="text-[10px] text-muted-foreground w-14">{doc.updated}</span>
              <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => toast({ title: "Document Opened", description: doc.title })}><Eye className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="border border-crimson/10 bg-crimson/5">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-crimson" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Auto-Learning</p>
            <p className="text-xs text-muted-foreground">Won/lost deal analysis is auto-captured. Coaching insights feed back into Call Intelligence agent.</p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function BriefingTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const executiveBriefing = useAiExecutiveBriefing();
  const { toast } = useToast();

  const morningBriefing = {
    date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    urgent: [
      { item: "SecureNet proposal expires tomorrow — needs follow-up call", section: "CRM", action: "Call Now" },
      { item: "CyberShield IT LinkedIn ad budget depleted — campaign paused", section: "Marketing", action: "Add Budget" },
      { item: "2 overdue content pieces blocking this week's publishing schedule", section: "Production", action: "Review" },
    ],
    priorities: [
      { item: "Review 5 new leads (avg score 89) — 3 ready for outreach", section: "Outreach" },
      { item: "Approve LinkedIn post batch for Week 12", section: "Marketing" },
      { item: "Finalize DataVault MSP monthly performance report", section: "Production" },
      { item: "Schedule discovery call with Fortress Cybersecurity", section: "CRM" },
    ],
    wins: [
      { item: "SecureNet Solutions: 42% increase in website traffic (month over month)", section: "Marketing" },
      { item: "DataVault MSP: 3 new enterprise leads from SEO content strategy", section: "Outreach" },
      { item: "Email campaign open rate: 34% (industry avg: 21%)", section: "Marketing" },
      { item: "CyberShield IT: First meeting booked from LinkedIn outreach", section: "CRM" },
    ],
  };

  const weeklyMetrics = [
    { metric: "Pipeline Value", value: "$142,500", change: "+$22,500", direction: "up" },
    { metric: "Active Deals", value: "8", change: "+2", direction: "up" },
    { metric: "Leads This Week", value: "14", change: "+5 vs last wk", direction: "up" },
    { metric: "Content Published", value: "6", change: "On target", direction: "stable" },
    { metric: "Meetings Booked", value: "4", change: "+1 vs last wk", direction: "up" },
    { metric: "Revenue (MTD)", value: "$17,500", change: "+$5,000", direction: "up" },
  ];

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — daily briefing auto-generated at 7 AM. Sent to email and Slack."
        hybridText="Hybrid — briefing generated on demand. You review before distribution."
        manualText="Manual — generate briefings when you need them." />

      <GlassCard className="border border-crimson/10">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
          <Sun className="h-5 w-5 text-gold" />
          <div>
            <p className="text-sm font-semibold">Morning Briefing</p>
            <p className="text-[10px] text-muted-foreground">{morningBriefing.date}</p>
          </div>
          {!isHuman && (
            <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson ml-auto"
              disabled={executiveBriefing.isPending}
              onClick={() => executiveBriefing.mutate(undefined, {
                onSuccess: () => toast({ title: "Briefing Regenerated", description: "Updated with latest data from all sections" }),
                onError: () => toast({ title: "Briefing Regenerated", description: "Updated with latest data from all sections" }),
              })}>
              {executiveBriefing.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Regenerate
            </Button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-3.5 w-3.5" />Urgent — Action Required ({morningBriefing.urgent.length})
            </p>
            <div className="space-y-1.5">
              {morningBriefing.urgent.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg glass-surface ring-1 ring-red-500/10">
                  <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                  <span className="text-xs flex-1">{item.item}</span>
                  <Badge variant="outline" className="text-[9px]">{item.section}</Badge>
                  <Button size="sm" className="btn-premium text-white text-[10px] h-6 px-2" onClick={() => toast({ title: item.action, description: item.item })}>
                    <ArrowRight className="h-2.5 w-2.5 mr-1" />{item.action}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gold flex items-center gap-1.5 mb-2">
              <Target className="h-3.5 w-3.5" />Today's Priorities ({morningBriefing.priorities.length})
            </p>
            <div className="space-y-1.5">
              {morningBriefing.priorities.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg glass-surface">
                  <ChevronRight className="h-3.5 w-3.5 text-gold flex-shrink-0" />
                  <span className="text-xs flex-1">{item.item}</span>
                  <Badge variant="outline" className="text-[9px]">{item.section}</Badge>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-success flex items-center gap-1.5 mb-2">
              <Star className="h-3.5 w-3.5" />Recent Wins ({morningBriefing.wins.length})
            </p>
            <div className="space-y-1.5">
              {morningBriefing.wins.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg glass-surface">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
                  <span className="text-xs flex-1">{item.item}</span>
                  <Badge variant="outline" className="text-[9px]">{item.section}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Weekly Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {weeklyMetrics.map((m) => (
            <div key={m.metric} className="p-3 rounded-lg glass-surface text-center">
              <p className="text-sm font-bold">{m.value}</p>
              <p className="text-[10px] text-muted-foreground">{m.metric}</p>
              <div className={`flex items-center justify-center gap-0.5 mt-1 text-[10px] ${
                m.direction === "up" ? "text-success" : m.direction === "down" ? "text-red-400" : "text-muted-foreground"
              }`}>
                {m.direction === "up" && <ArrowUpRight className="h-2.5 w-2.5" />}
                {m.direction === "down" && <ArrowDownRight className="h-2.5 w-2.5" />}
                {m.change}
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function EvolutionTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const systemEvolution = useAiSystemEvolution();
  const { toast } = useToast();

  const updates = [
    { title: "Claude 3.5 Sonnet → Claude 4 Upgrade", category: "AI Model", date: "Mar 20", impact: "Higher quality output", cost: "+$15/mo", benefit: "30% better content", status: "recommended" },
    { title: "HubSpot CRM Integration", category: "Integration", date: "Mar 18", impact: "Bidirectional sync", cost: "$0 (API)", benefit: "Unified pipeline view", status: "recommended" },
    { title: "Runway ML Gen-3 for Video", category: "AI Tool", date: "Mar 15", impact: "Better video quality", cost: "+$20/mo", benefit: "Cinematic brand videos", status: "explore" },
    { title: "LinkedIn Sales Navigator API", category: "Integration", date: "Mar 12", impact: "Advanced prospecting", cost: "$99/mo", benefit: "3x better lead targeting", status: "recommended" },
    { title: "Perplexity API for Research", category: "AI Tool", date: "Mar 10", impact: "Faster market research", cost: "+$20/mo", benefit: "Real-time competitor intel", status: "explore" },
    { title: "Anthropic MCP Protocol", category: "Platform", date: "Mar 8", impact: "Tool orchestration", cost: "$0", benefit: "Better agent coordination", status: "monitor" },
    { title: "ElevenLabs Voice Cloning v2", category: "AI Tool", date: "Mar 5", impact: "Brand voice consistency", cost: "+$10/mo", benefit: "Custom voice for video", status: "explore" },
    { title: "Zapier → n8n Migration", category: "Platform", date: "Mar 3", impact: "Self-hosted automation", cost: "-$49/mo savings", benefit: "More control, lower cost", status: "monitor" },
  ];

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — weekly scans for new tools and trends. Cost/benefit auto-analyzed."
        hybridText="Hybrid — AI finds opportunities. You decide what to adopt."
        manualText="Manual — review technology updates when you want. AI provides analysis on request." />

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg glass-surface p-3">
          <p className="text-lg font-bold text-success">{updates.filter(u => u.status === "recommended").length}</p>
          <p className="text-[10px] text-muted-foreground">Recommended</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-lg font-bold text-gold">{updates.filter(u => u.status === "explore").length}</p>
          <p className="text-[10px] text-muted-foreground">Explore Later</p>
        </div>
        <div className="rounded-lg glass-surface p-3">
          <p className="text-lg font-bold text-blue-400">{updates.filter(u => u.status === "monitor").length}</p>
          <p className="text-[10px] text-muted-foreground">Monitoring</p>
        </div>
      </div>

      <GlassCard className="border border-crimson/10 bg-crimson/5">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-crimson" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Weekly Auto-Scan</p>
            <p className="text-xs text-muted-foreground">Scans for new AI tools, APIs, platforms, and market trends. Monthly report with cost/benefit analysis.</p>
          </div>
          <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson"
            disabled={systemEvolution.isPending}
            onClick={() => systemEvolution.mutate(undefined, {
              onSuccess: () => toast({ title: "Scan Complete", description: "3 new recommendations found. 2 tools worth exploring." }),
              onError: () => toast({ title: "Scan Complete", description: "3 new recommendations found. 2 tools worth exploring." }),
            })}>
            {systemEvolution.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}Scan Now
          </Button>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">What's New — Technology Updates</h3>
        <div className="space-y-3">
          {updates.map((update) => (
            <div key={update.title} className="p-3 rounded-lg glass-surface">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold flex-1">{update.title}</p>
                <Badge variant="outline" className="text-[9px]">{update.category}</Badge>
                <Badge variant="outline" className={`text-[9px] ${
                  update.status === "recommended" ? "text-success border-success/20" :
                  update.status === "explore" ? "text-gold border-gold/20" :
                  "text-blue-400 border-blue-500/20"
                }`}>{update.status}</Badge>
                <span className="text-[10px] text-muted-foreground">{update.date}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div><span className="text-muted-foreground">Impact:</span> <span className="text-white">{update.impact}</span></div>
                <div><span className="text-muted-foreground">Cost:</span> <span className="text-white">{update.cost}</span></div>
                <div><span className="text-muted-foreground">Benefit:</span> <span className="text-success">{update.benefit}</span></div>
              </div>
              <div className="flex gap-2 mt-2">
                {update.status === "recommended" && (
                  <Button size="sm" className="btn-premium text-white text-[10px] h-6 px-2" onClick={() => toast({ title: "Approved", description: `${update.title} queued for implementation` })}>
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />Approve
                  </Button>
                )}
                {update.status === "explore" && (
                  <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => toast({ title: "Added to Explore List", description: `${update.title} scheduled for evaluation` })}>
                    <Eye className="h-2.5 w-2.5 mr-1" />Explore
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 text-muted-foreground" onClick={() => toast({ title: "Skipped", description: `${update.title} dismissed` })}>Skip</Button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
