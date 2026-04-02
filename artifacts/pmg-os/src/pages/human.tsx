import { useState } from "react";
import { User, BookOpen, CheckSquare, ListChecks, FileText, Building2, Phone, Mail, BarChart3, Shield, CircleDot, ChevronRight, ArrowLeftRight, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useListTasks, useListLeads, useListOpportunities, useListActivities, useSetAiMode } from "@/hooks/use-api";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";

const DOMAIN_GUIDES: { domain: string; icon: any; steps: string[]; description: string }[] = [
  {
    domain: "CRM",
    icon: Building2,
    description: "Manage leads, contacts, and deals manually",
    steps: [
      "Review new leads in the CRM tab — check data completeness",
      "Score leads manually using the scoring criteria (budget, authority, need, timeline)",
      "Qualify leads and update their status in the pipeline",
      "Create opportunities for qualified leads with value and close date",
      "Move deals through stages: Discovery → Qualification → Proposal → Negotiation → Closing",
      "Log all interactions as activities (calls, emails, meetings)",
    ],
  },
  {
    domain: "Outreach",
    icon: Mail,
    description: "Run outreach sequences step by step",
    steps: [
      "Navigate to Outreach and select an active sequence",
      "Review each contact's enrollment status and last step completed",
      "Compose and send the next message in the sequence manually",
      "Log the communication in the activity timeline",
      "Check for replies and update sequence status accordingly",
      "Pause sequences for contacts who respond or opt out",
    ],
  },
  {
    domain: "Communications",
    icon: Phone,
    description: "Handle all communications directly",
    steps: [
      "Check the communications inbox for new messages",
      "Review any call transcripts or email threads",
      "Draft and send follow-up messages",
      "Log sentiment and key takeaways from conversations",
      "Flag any objections or concerns for deal notes",
    ],
  },
  {
    domain: "Finance & Legal",
    icon: FileText,
    description: "Process invoices, expenses, and contracts",
    steps: [
      "Create invoices from the Finance tab with line items",
      "Submit expenses with receipts and approval justification",
      "Draft contracts using templates and fill in terms",
      "Route contracts through the review workflow: Draft → Review → Approved",
      "Track payment status and follow up on overdue invoices",
    ],
  },
  {
    domain: "Intelligence",
    icon: BarChart3,
    description: "Research and analyze data manually",
    steps: [
      "Use the Knowledge Library to search for relevant information",
      "Document new findings and insights as knowledge entries",
      "Research companies and contacts using external sources",
      "Create reports from the Reports tab with manual data selection",
      "Archive completed reports for future reference",
    ],
  },
  {
    domain: "Execution",
    icon: CheckSquare,
    description: "Manage tasks and workflows hands-on",
    steps: [
      "Review all active tasks in the Execution tab",
      "Assign tasks to team members or claim them yourself",
      "Update task status as work progresses: Pending → In Progress → Completed",
      "Check approval queues and process any waiting items",
      "Review automation rules — they remain active but require confirmation in Manual mode",
    ],
  },
];

export default function HumanPage() {
  const { isHuman } = useAiModeContext();
  const setMode = useSetAiMode();
  const { data: tasks } = useListTasks();
  const { data: leads } = useListLeads();
  const { data: opportunities } = useListOpportunities();
  const { data: activities } = useListActivities();
  const [activeTab, setActiveTab] = useState("guides");
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);

  const activeTasks = Array.isArray(tasks) ? tasks.filter((t: any) => t.status !== "completed" && t.status !== "cancelled") : [];
  const activeLeads = Array.isArray(leads) ? leads.filter((l: any) => l.status !== "closed_won" && l.status !== "closed_lost" && l.status !== "disqualified") : [];
  const activeDeals = Array.isArray(opportunities) ? opportunities.filter((o: any) => o.stage !== "won" && o.stage !== "lost") : [];
  const recentActivity = Array.isArray(activities) ? activities.slice(0, 10) : [];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6 text-blue-500" />
            Human Control Mode
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Full manual control — AI provides guidance only, no autonomous actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isHuman && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => setMode.mutate("human_controlled")}>
              <User className="h-4 w-4 mr-1" /> Switch to Manual
            </Button>
          )}
          {isHuman && (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              <Shield className="h-3 w-3 mr-1" /> Manual Mode Active
            </Badge>
          )}
        </div>
      </div>

      {isHuman && (
        <Card className="glass-card border-blue-500/20 bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-400">AI Safety Lock Engaged</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All AI agents are paused. No autonomous actions will be taken. AI remains available as an advisor — you can ask questions and get recommendations, but all actions require your manual execution.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CheckSquare className="h-4 w-4" /> Active Tasks
            </div>
            <p className="text-2xl font-bold">{activeTasks.length}</p>
            <p className="text-xs text-muted-foreground">Requiring your action</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <CircleDot className="h-4 w-4" /> Active Leads
            </div>
            <p className="text-2xl font-bold">{activeLeads.length}</p>
            <p className="text-xs text-muted-foreground">In pipeline</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <BarChart3 className="h-4 w-4" /> Active Deals
            </div>
            <p className="text-2xl font-bold">{activeDeals.length}</p>
            <p className="text-xs text-muted-foreground">Open opportunities</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <ListChecks className="h-4 w-4" /> Recent Actions
            </div>
            <p className="text-2xl font-bold">{recentActivity.length}</p>
            <p className="text-xs text-muted-foreground">Logged activities</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="guides">Workflow Guides</TabsTrigger>
          <TabsTrigger value="tasks">My Tasks</TabsTrigger>
          <TabsTrigger value="controls">Direct Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="guides" className="space-y-3">
          {DOMAIN_GUIDES.map((guide) => {
            const Icon = guide.icon;
            const isExpanded = expandedGuide === guide.domain;
            return (
              <Card
                key={guide.domain}
                className={`glass-card border-white/10 cursor-pointer transition-all ${isExpanded ? "border-blue-500/30" : "hover:border-white/20"}`}
                onClick={() => setExpandedGuide(isExpanded ? null : guide.domain)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-white/5 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{guide.domain}</p>
                        <p className="text-xs text-muted-foreground">{guide.description}</p>
                      </div>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                  </div>
                  {isExpanded && (
                    <div className="mt-4 pl-13 space-y-2">
                      {guide.steps.map((step, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-xs bg-blue-500/20 text-blue-400 rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                          <p className="text-sm text-muted-foreground">{step}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-3">
          {activeTasks.length === 0 ? (
            <Card className="glass-card border-white/10">
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No active tasks — create tasks from domain pages
              </CardContent>
            </Card>
          ) : (
            activeTasks.slice(0, 20).map((task: any) => (
              <Card key={task.id} className="glass-card border-white/10">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{task.title ?? task.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.priority && <Badge variant="outline" className="mr-1 text-xs">{task.priority}</Badge>}
                        {task.dueDate && `Due: ${new Date(task.dueDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">{task.status}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="controls" className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4" /> Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { label: "Create New Lead", path: "/crm", color: "text-green-400" },
                  { label: "Log Activity", path: "/crm", color: "text-blue-400" },
                  { label: "Create Task", path: "/execution", color: "text-yellow-400" },
                  { label: "Draft Invoice", path: "/finance", color: "text-purple-400" },
                  { label: "Write Report", path: "/reports", color: "text-cyan-400" },
                ].map(action => (
                  <a
                    key={action.label}
                    href={action.path}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <span className={`text-sm ${action.color}`}>{action.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </a>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Mode Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Switch to a different operating mode when you're ready to re-enable AI assistance.
                </p>
                <div className="space-y-2">
                  <Button
                    className="w-full justify-start bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-600/30"
                    variant="ghost"
                    onClick={() => setMode.mutate("hybrid")}
                  >
                    <ArrowLeftRight className="h-4 w-4 mr-2" /> Switch to Hybrid — AI assists, you approve
                  </Button>
                  <Button
                    className="w-full justify-start bg-crimson/20 hover:bg-crimson/30 text-crimson border border-crimson/30"
                    variant="ghost"
                    onClick={() => setMode.mutate("ai_autonomous")}
                  >
                    <Zap className="h-4 w-4 mr-2" /> Switch to AI Auto — Full autonomous operation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

