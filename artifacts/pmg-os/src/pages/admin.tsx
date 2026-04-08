import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { AiResultPanel } from "@/components/ai-result-panel";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
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
  Bell, Sun, Moon, ArrowUpRight, ArrowDownRight, Plus
} from "lucide-react";

const tabs = [
  { id: "operations", label: "Operations", icon: <ClipboardList className="h-4 w-4" /> },
  { id: "knowledge", label: "Knowledge Base", icon: <BookOpen className="h-4 w-4" /> },
  { id: "briefing", label: "Executive Briefing", icon: <BarChart3 className="h-4 w-4" /> },
  { id: "evolution", label: "System Evolution", icon: <RefreshCw className="h-4 w-4" /> },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState("operations");
  const [aiResult, setAiResult] = useState<any>(null);
  const { isHuman } = useAiModeContext();
  const assignTasks = useAiAssignTasks();
  const manageKnowledge = useAiManageKnowledge();
  const executiveBriefing = useAiExecutiveBriefing();
  const systemEvolution = useAiSystemEvolution();

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
                onSuccess: (data) => setAiResult({ type: "briefing", data }),
              })}>
              {executiveBriefing.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Generate Morning Briefing
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active Tasks" value={0} icon={<ClipboardList className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Overdue" value={0} icon={<AlertTriangle className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Knowledge Docs" value={0} icon={<BookOpen className="h-4 w-4" />} accent="blue" />
        <KpiCard label="System Health" value="—" icon={<Shield className="h-4 w-4" />} accent="success" />
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
          {activeTab === "operations" && <OperationsTab isHuman={isHuman} />}
          {activeTab === "knowledge" && <KnowledgeTab isHuman={isHuman} />}
          {activeTab === "briefing" && <BriefingTab isHuman={isHuman} />}
          {activeTab === "evolution" && <EvolutionTab isHuman={isHuman} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function OperationsTab({ isHuman }: { isHuman: boolean }) {
  const assignTasks = useAiAssignTasks();
  const [aiResult, setAiResult] = useState<any>(null);
  const teamMembers: {name:string;role:string;tasks:number;completed:number;overdue:number}[] = [];

  const tasks: {task:string;assignee:string;due:string;priority:string;source:string;status:string}[] = [];

  return (
    <div className="space-y-4">
      {aiResult && <AiResultPanel result={aiResult} onClose={() => setAiResult(null)} title="Task Assignment" />}
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
                          <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson"
                disabled={assignTasks.isPending}
                onClick={() => assignTasks.mutate({ teamMembers: ["Shershah"] }, {
                  onSuccess: (data) => setAiResult({ type: "tasks", data }),
                })}>
                {assignTasks.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Auto-Assign
              </Button>
            
            <Button size="sm" variant="outline" className="text-xs">
              <Plus className="h-3 w-3 mr-1" />Add Task
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          {tasks.map((task, idx) => (
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
              <Button size="sm" variant="ghost" className="h-6 px-1.5">
                <CheckCircle2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function KnowledgeTab({ isHuman }: { isHuman: boolean }) {
  const [searchQuery, setSearchQuery] = useState("");

  const categories = [
    { name: "SOPs", count: 0, icon: <FileText className="h-4 w-4" />, color: "text-crimson" },
    { name: "Playbooks", count: 0, icon: <BookOpen className="h-4 w-4" />, color: "text-blue-400" },
    { name: "Templates", count: 0, icon: <Layers className="h-4 w-4" />, color: "text-gold" },
    { name: "Win/Loss Analysis", count: 0, icon: <Target className="h-4 w-4" />, color: "text-success" },
  ];

  const documents: {title:string;category:string;updated:string;version:string;autoGenerated:boolean}[] = [];

  const filtered = documents.filter((d) =>
    !searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search knowledge base..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-white/5 border-white/10" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map((cat) => (
          <div key={cat.name} className="rounded-lg glass-surface p-3 text-center cursor-pointer hover:ring-1 hover:ring-crimson/20 transition-all">
            <div className={`mx-auto mb-1.5 ${cat.color}`}>{cat.icon}</div>
            <p className="text-xs font-semibold">{cat.name}</p>
            <p className="text-[10px] text-muted-foreground">{cat.count} docs</p>
          </div>
        ))}
      </div>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Documents</h3>
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
              <Button size="sm" variant="ghost" className="h-6 px-1.5"><Eye className="h-3 w-3" /></Button>
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

function BriefingTab({ isHuman }: { isHuman: boolean }) {
  const executiveBriefing = useAiExecutiveBriefing();
  const [aiResult, setAiResult] = useState<any>(null);
  const morningBriefing = {
    date: new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    urgent: [] as { item: string; section: string; action: string }[],
    priorities: [] as { item: string; section: string }[],
    wins: [] as { item: string; section: string }[],
  };

  const weeklyMetrics = [
    { metric: "Pipeline Value", value: "$0", change: "—", direction: "stable" },
    { metric: "Active Deals", value: "0", change: "—", direction: "stable" },
    { metric: "Leads This Week", value: "0", change: "—", direction: "stable" },
    { metric: "Content Published", value: "0", change: "—", direction: "stable" },
    { metric: "Meetings Booked", value: "0", change: "—", direction: "stable" },
    { metric: "Revenue (MTD)", value: "$0", change: "—", direction: "stable" },
  ];

  return (
    <div className="space-y-4">
      {aiResult && <AiResultPanel result={aiResult} onClose={() => setAiResult(null)} title="Executive Briefing" />}
      <GlassCard className="border border-crimson/10">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
          <Sun className="h-5 w-5 text-gold" />
          <div>
            <p className="text-sm font-semibold">Morning Briefing</p>
            <p className="text-[10px] text-muted-foreground">{morningBriefing.date}</p>
          </div>
                      <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson ml-auto"
              disabled={executiveBriefing.isPending}
              onClick={() => executiveBriefing.mutate(undefined, {
                onSuccess: (data) => setAiResult({ type: "briefing", data }),
              })}>
              {executiveBriefing.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Regenerate
            </Button>
          
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-red-400 flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-3.5 w-3.5" />Urgent — Action Required
            </p>
            <div className="space-y-1.5">
              {morningBriefing.urgent.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 rounded-lg glass-surface ring-1 ring-red-500/10">
                  <AlertCircle className="h-3.5 w-3.5 text-red-400 flex-shrink-0" />
                  <span className="text-xs flex-1">{item.item}</span>
                  <Badge variant="outline" className="text-[9px]">{item.section}</Badge>
                  <Button size="sm" className="btn-premium text-white text-[10px] h-6 px-2">
                    <ArrowRight className="h-2.5 w-2.5 mr-1" />{item.action}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gold flex items-center gap-1.5 mb-2">
              <Target className="h-3.5 w-3.5" />Today's Priorities
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
              <Star className="h-3.5 w-3.5" />Recent Wins
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

function EvolutionTab({ isHuman }: { isHuman: boolean }) {
  const systemEvolution = useAiSystemEvolution();
  const [aiResult, setAiResult] = useState<any>(null);
  const updates: {title:string;category:string;date:string;impact:string;cost:string;benefit:string;status:string}[] = [];

  return (
    <div className="space-y-4">
      {aiResult && <AiResultPanel result={aiResult} onClose={() => setAiResult(null)} title="System Evolution" />}
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
            <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson">
              <RefreshCw className="h-3 w-3 mr-1" />Scan Now
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
                  <Button size="sm" className="btn-premium text-white text-[10px] h-6 px-2">
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />Approve
                  </Button>
                )}
                {update.status === "explore" && (
                  <Button size="sm" variant="outline" className="text-[10px] h-6 px-2">
                    <Eye className="h-2.5 w-2.5 mr-1" />Explore
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="text-[10px] h-6 px-2 text-muted-foreground">Skip</Button>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
