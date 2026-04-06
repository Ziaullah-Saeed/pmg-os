import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
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
  const { isHuman } = useAiModeContext();

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Admin"
        subtitle={isHuman ? "Team management, knowledge base, and system oversight" : "AI operations center — tasks, knowledge, briefings, evolution"}
        icon={<Shield className="h-5 w-5" />}
        actions={
          !isHuman ? (
            <Button variant="outline" className="text-sm border-crimson/30 text-crimson hover:bg-crimson/10">
              <Sparkles className="h-4 w-4 mr-2" />Generate Morning Briefing
            </Button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active Tasks" value={12} icon={<ClipboardList className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Overdue" value={2} icon={<AlertTriangle className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Knowledge Docs" value={34} icon={<BookOpen className="h-4 w-4" />} accent="blue" />
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
  const teamMembers = [
    { name: "Sher Shah", role: "CEO / Strategy", tasks: 3, completed: 8, overdue: 0 },
    { name: "Marketing Lead", role: "Content & Campaigns", tasks: 5, completed: 12, overdue: 1 },
    { name: "Sales Rep", role: "Outreach & Closing", tasks: 4, completed: 6, overdue: 1 },
  ];

  const tasks = [
    { task: "Follow up with Fortress Cybersecurity", assignee: "Sales Rep", due: "Today", priority: "high", source: "CRM", status: "in_progress" },
    { task: "Publish LinkedIn article — NIST Framework", assignee: "Marketing Lead", due: "Today", priority: "high", source: "Marketing", status: "pending" },
    { task: "Send proposal to DataVault MSP", assignee: "Sher Shah", due: "Tomorrow", priority: "high", source: "CRM", status: "pending" },
    { task: "Review ad campaign performance", assignee: "Marketing Lead", due: "Tomorrow", priority: "medium", source: "Marketing", status: "pending" },
    { task: "Onboard ShieldTech IT — Step 2", assignee: "Sales Rep", due: "Mar 30", priority: "medium", source: "Production", status: "pending" },
    { task: "Prepare monthly client report", assignee: "Sher Shah", due: "Mar 31", priority: "medium", source: "Production", status: "pending" },
    { task: "Update competitor battle cards", assignee: "Marketing Lead", due: "Overdue", priority: "low", source: "Marketing", status: "overdue" },
    { task: "Schedule Q2 planning meeting", assignee: "Sher Shah", due: "Overdue", priority: "low", source: "Admin", status: "overdue" },
  ];

  return (
    <div className="space-y-4">
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
              <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson">
                <Sparkles className="h-3 w-3 mr-1" />Auto-Assign
              </Button>
            )}
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
    { name: "SOPs", count: 12, icon: <FileText className="h-4 w-4" />, color: "text-crimson" },
    { name: "Playbooks", count: 5, icon: <BookOpen className="h-4 w-4" />, color: "text-blue-400" },
    { name: "Templates", count: 8, icon: <Layers className="h-4 w-4" />, color: "text-gold" },
    { name: "Win/Loss Analysis", count: 9, icon: <Target className="h-4 w-4" />, color: "text-success" },
  ];

  const documents = [
    { title: "Client Onboarding SOP", category: "SOPs", updated: "Mar 25", version: "v3.2", autoGenerated: false },
    { title: "Cold Email Playbook", category: "Playbooks", updated: "Mar 20", version: "v2.1", autoGenerated: false },
    { title: "Proposal Template — Growth Tier", category: "Templates", updated: "Mar 18", version: "v1.4", autoGenerated: false },
    { title: "Won: SecureNet — what worked", category: "Win/Loss Analysis", updated: "Mar 15", version: "v1.0", autoGenerated: true },
    { title: "Lost: TechGuard — pricing too high", category: "Win/Loss Analysis", updated: "Mar 12", version: "v1.0", autoGenerated: true },
    { title: "LinkedIn Outreach SOP", category: "SOPs", updated: "Mar 10", version: "v2.0", autoGenerated: false },
    { title: "Call Coaching Framework", category: "Playbooks", updated: "Mar 8", version: "v1.3", autoGenerated: false },
    { title: "Won: CyberGuard — speed mattered", category: "Win/Loss Analysis", updated: "Mar 5", version: "v1.0", autoGenerated: true },
  ];

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

      {!isHuman && (
        <GlassCard className="border border-crimson/10 bg-crimson/5">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-crimson" />
            <div className="flex-1">
              <p className="text-sm font-semibold">Auto-Learning</p>
              <p className="text-xs text-muted-foreground">Won/lost deal analysis is auto-captured. Coaching insights feed back into Call Intelligence agent.</p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function BriefingTab({ isHuman }: { isHuman: boolean }) {
  const morningBriefing = {
    date: "Monday, March 28, 2024",
    urgent: [
      { item: "Fortress Cybersecurity follow-up overdue — last contact 3 days ago", section: "CRM", action: "Call today" },
      { item: "LinkedIn ad campaign budget 90% spent with 2 weeks remaining", section: "Marketing", action: "Review & adjust" },
    ],
    priorities: [
      { item: "3 proposals pending response — follow up today", section: "CRM" },
      { item: "ShieldTech IT onboarding stuck at Step 2 — needs brand assets", section: "Production" },
      { item: "Monthly client report due for SecureNet — March data ready", section: "Production" },
    ],
    wins: [
      { item: "CyberGuard MSP onboarding complete — marketing audit scheduled", section: "Production" },
      { item: "14 leads delivered this month — 70% of target", section: "Production" },
      { item: "LinkedIn engagement up 45% week-over-week", section: "Marketing" },
    ],
  };

  const weeklyMetrics = [
    { metric: "Pipeline Value", value: "$127,500", change: "+12%", direction: "up" },
    { metric: "Active Deals", value: "8", change: "+2", direction: "up" },
    { metric: "Leads This Week", value: "6", change: "-1", direction: "down" },
    { metric: "Content Published", value: "9", change: "+3", direction: "up" },
    { metric: "Meetings Booked", value: "4", change: "same", direction: "stable" },
    { metric: "Revenue (MTD)", value: "$12,500", change: "+$5K", direction: "up" },
  ];

  return (
    <div className="space-y-4">
      <GlassCard className="border border-crimson/10">
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-white/5">
          <Sun className="h-5 w-5 text-gold" />
          <div>
            <p className="text-sm font-semibold">Morning Briefing</p>
            <p className="text-[10px] text-muted-foreground">{morningBriefing.date}</p>
          </div>
          {!isHuman && (
            <Button size="sm" variant="outline" className="text-xs border-crimson/30 text-crimson ml-auto">
              <Sparkles className="h-3 w-3 mr-1" />Regenerate
            </Button>
          )}
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
  const updates = [
    {
      title: "Claude 4 Released — All Agents Upgrade",
      category: "AI Model",
      date: "This Week",
      impact: "All 32 agents get faster, cheaper, better reasoning",
      cost: "No additional cost",
      benefit: "30% faster responses, improved accuracy",
      status: "recommended",
    },
    {
      title: "Runway ML v4 — 40% Better Video Quality",
      category: "Creative Tool",
      date: "This Week",
      impact: "Video production quality improvement",
      cost: "Same pricing",
      benefit: "Higher quality social clips and ad videos",
      status: "recommended",
    },
    {
      title: "New Platform: Threads by Meta",
      category: "Channel",
      date: "Last Week",
      impact: "New channel for cybersecurity content distribution",
      cost: "2 days development",
      benefit: "Access to 200M+ users, growing B2B presence",
      status: "explore",
    },
    {
      title: "ElevenLabs Turbo v3 — Real-Time Voice",
      category: "Voice AI",
      date: "Last Week",
      impact: "Faster voiceover generation for videos",
      cost: "$20/mo additional",
      benefit: "Real-time voice generation, more natural tone",
      status: "explore",
    },
    {
      title: "HubSpot API v4 — Breaking Changes",
      category: "Integration",
      date: "2 Weeks Ago",
      impact: "HubSpot sync may need updates by Q2",
      cost: "1 day development",
      benefit: "Better data sync, new custom properties support",
      status: "monitor",
    },
  ];

  return (
    <div className="space-y-4">
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

      {!isHuman && (
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
      )}

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
