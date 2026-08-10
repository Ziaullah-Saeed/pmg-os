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
  useAdminOverview,
  useCompleteTask,
  useAiOutputs,
  useSaveAiOutput,
  type AdminOverview,
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
  const saveOutput = useSaveAiOutput();
  const { data: overview } = useAdminOverview();
  const k = overview?.kpis;

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
                onSuccess: (data: any) => { const text = typeof data === "string" ? data : (data?.result ?? data?.output ?? ""); saveOutput.mutate({ domain: "admin", kind: "briefing", title: `Morning Briefing — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, summary: String(text).slice(0, 280), data: { content: String(text) } }); setActiveTab("briefing"); toast({ title: "Morning Briefing Generated", description: "Saved to briefing history" }); },
                onError: (err: any) => toast({ title: "Briefing generation failed", description: err?.message || "Request failed", variant: "destructive" }),
              })}>
              {executiveBriefing.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate Morning Briefing
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active Tasks" value={k?.activeTasks ?? 0} icon={<ClipboardList className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Overdue" value={k?.overdueTasks ?? 0} icon={<AlertTriangle className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Knowledge Docs" value={k?.docs ?? 0} icon={<BookOpen className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Team" value={k?.teamSize ?? 0} icon={<Users className="h-4 w-4" />} accent="success" />
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
          {activeTab === "operations" && <OperationsTab isHuman={isHuman} isAuto={isAuto} overview={overview} />}
          {activeTab === "knowledge" && <KnowledgeTab isHuman={isHuman} isAuto={isAuto} overview={overview} />}
          {activeTab === "briefing" && <BriefingTab isHuman={isHuman} isAuto={isAuto} />}
          {activeTab === "evolution" && <EvolutionTab isHuman={isHuman} isAuto={isAuto} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function OperationsTab({ isHuman, isAuto, overview }: { isHuman: boolean; isAuto: boolean; overview?: AdminOverview }) {
  const assignTasks = useAiAssignTasks();
  const completeTask = useCompleteTask();
  const { toast } = useToast();

  const teamMembers = overview?.team ?? [];
  const tasks = overview?.tasks ?? [];

  const handleComplete = (id: number, taskName: string) => {
    completeTask.mutate(id, {
      onSuccess: () => toast({ title: "Task Completed", description: taskName }),
      onError: (err: any) => toast({ title: "Couldn't complete task", description: err?.message || "Request failed", variant: "destructive" }),
    });
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
                  onError: (err: any) => toast({ title: "Task assignment failed", description: err?.message || "Request failed", variant: "destructive" }),
                })}>
                {assignTasks.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Auto-Assign
              </Button>
            )}
            <Button size="sm" variant="outline" className="text-xs" disabled title="Task creation UI not built yet">
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
              <Button size="sm" variant="ghost" className="h-6 px-1.5" disabled={completeTask.isPending} onClick={() => handleComplete(task.id, task.task)}>
                <CheckCircle2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function KnowledgeTab({ isHuman, isAuto, overview }: { isHuman: boolean; isAuto: boolean; overview?: AdminOverview }) {
  const [searchQuery, setSearchQuery] = useState("");
  const manageKnowledge = useAiManageKnowledge();
  const { toast } = useToast();

  const CATEGORY_STYLE: Record<string, { icon: any; color: string }> = {
    "SOPs": { icon: <FileText className="h-4 w-4" />, color: "text-crimson" },
    "Playbooks": { icon: <BookOpen className="h-4 w-4" />, color: "text-blue-400" },
    "Templates": { icon: <Layers className="h-4 w-4" />, color: "text-gold" },
    "Win/Loss Analysis": { icon: <Target className="h-4 w-4" />, color: "text-success" },
  };
  const categories = (overview?.categories ?? []).map((c) => ({
    ...c,
    icon: CATEGORY_STYLE[c.name]?.icon ?? <FileText className="h-4 w-4" />,
    color: CATEGORY_STYLE[c.name]?.color ?? "text-muted-foreground",
  }));

  const documents = overview?.documents ?? [];

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
              onError: (err: any) => toast({ title: "Knowledge update failed", description: err?.message || "Request failed", variant: "destructive" }),
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
              <span className="text-[10px] text-muted-foreground w-14">{doc.updated}</span>
              <Button size="sm" variant="ghost" className="h-6 px-1.5" disabled title="Document viewer not built yet"><Eye className="h-3 w-3" /></Button>
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
  const saveOutput = useSaveAiOutput();
  const { data: briefings } = useAiOutputs("briefing", { domain: "admin", limit: 10 });
  const { toast } = useToast();

  const persist = (data: any) => {
    const text = typeof data === "string" ? data : (data?.result ?? data?.output ?? "");
    saveOutput.mutate({ domain: "admin", kind: "briefing", title: `Morning Briefing — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, summary: String(text).slice(0, 280), data: { content: String(text) } });
  };

  const list = briefings ?? [];

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — daily briefing auto-generated at 7 AM. Sent to email and Slack."
        hybridText="Hybrid — briefing generated on demand. You review before distribution."
        manualText="Manual — generate briefings when you need them." />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Executive Briefings</h3>
          <p className="text-xs text-muted-foreground">AI-generated briefings, saved to history</p>
        </div>
        {!isHuman && (
          <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson"
            disabled={executiveBriefing.isPending}
            onClick={() => executiveBriefing.mutate(undefined, {
              onSuccess: (data: any) => { persist(data); toast({ title: "Briefing Generated", description: "Saved to history" }); },
              onError: (err: any) => toast({ title: "Briefing generation failed", description: err?.message || "Request failed", variant: "destructive" }),
            })}>
            {executiveBriefing.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Generate Briefing
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <GlassCard>
          <div className="text-center py-10">
            <Sun className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No briefing generated yet{isHuman ? "." : " — click Generate Briefing."}</p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {list.map((b) => (
            <GlassCard key={b.id} className="border border-crimson/10">
              <div className="flex items-center gap-3 mb-2 pb-2 border-b border-white/5">
                <Sun className="h-5 w-5 text-gold" />
                <p className="text-sm font-semibold flex-1">{b.title}</p>
                <span className="text-[10px] text-muted-foreground">{new Date(b.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{(b.data?.content ?? b.summary) || "—"}</p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

function EvolutionTab({ isHuman, isAuto }: { isHuman: boolean; isAuto: boolean }) {
  const systemEvolution = useAiSystemEvolution();
  const saveOutput = useSaveAiOutput();
  const { data: scans } = useAiOutputs("evolution", { domain: "admin", limit: 10 });
  const { toast } = useToast();

  const persist = (data: any) => {
    const text = typeof data === "string" ? data : (data?.result ?? data?.output ?? "");
    saveOutput.mutate({ domain: "admin", kind: "evolution", title: `System Evolution Scan — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`, summary: String(text).slice(0, 280), data: { content: String(text) } });
  };

  const list = scans ?? [];

  return (
    <div className="space-y-4">
      <ModeIndicator isHuman={isHuman} isAuto={isAuto}
        autoText="Auto — weekly scans for new tools and trends. Cost/benefit auto-analyzed."
        hybridText="Hybrid — AI finds opportunities. You decide what to adopt."
        manualText="Manual — review technology updates when you want. AI provides analysis on request." />

      <GlassCard className="border border-crimson/10 bg-crimson/5">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-crimson" />
          <div className="flex-1">
            <p className="text-sm font-semibold">Technology Evolution Scan</p>
            <p className="text-xs text-muted-foreground">AI scans for new tools, APIs, platforms, and trends. Results saved to history.</p>
          </div>
          {!isHuman && (
            <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson"
              disabled={systemEvolution.isPending}
              onClick={() => systemEvolution.mutate(undefined, {
                onSuccess: (data: any) => { persist(data); toast({ title: "Scan Complete", description: "Saved to history" }); },
                onError: (err: any) => toast({ title: "System scan failed", description: err?.message || "Request failed", variant: "destructive" }),
              })}>
              {systemEvolution.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}Scan Now
            </Button>
          )}
        </div>
      </GlassCard>

      {list.length === 0 ? (
        <GlassCard>
          <div className="text-center py-10">
            <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-xs text-muted-foreground">No scan run yet{isHuman ? "." : " — click Scan Now."}</p>
          </div>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {list.map((s) => (
            <GlassCard key={s.id}>
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                <p className="text-sm font-semibold flex-1">{s.title}</p>
                <span className="text-[10px] text-muted-foreground">{new Date(s.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{(s.data?.content ?? s.summary) || "—"}</p>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
