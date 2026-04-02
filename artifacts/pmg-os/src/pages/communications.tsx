import { useState } from "react";
import { useListCommunications, useListLeads } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailDrawer } from "@/components/ui/detail-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { useCreateCommunicationMut } from "@/hooks/use-api";
import { ModeAwareWrapper, ModeIndicatorBanner, HumanWorkflowGuide } from "@/components/mode-aware-wrapper";
import {
  MessagesSquare, Phone, Video, Mail, ArrowUpRight, ArrowDownLeft,
  Clock, Plus, Sparkles, Bot, User, Headphones, AlertCircle,
  CheckCircle2, Mic, Brain, TrendingUp, MessageSquare, BarChart3,
  FileText, Target, Zap, Shield
} from "lucide-react";

const tabs = [
  { id: "log", label: "Communication Log", icon: <MessagesSquare className="h-3.5 w-3.5" /> },
  { id: "intelligence", label: "Intelligence", icon: <Brain className="h-3.5 w-3.5" /> },
  { id: "ai-calling", label: "Mode A: AI-Led", icon: <Bot className="h-3.5 w-3.5" /> },
  { id: "human-calling", label: "Mode B: AI-Guided", icon: <User className="h-3.5 w-3.5" /> },
  { id: "meeting-support", label: "Mode C: Meeting", icon: <Headphones className="h-3.5 w-3.5" /> },
  { id: "transcription", label: "Transcription & Playback", icon: <Mic className="h-3.5 w-3.5" /> },
  { id: "coaching", label: "Coaching Layer", icon: <TrendingUp className="h-3.5 w-3.5" /> },
];

const defaultLogForm = { subject: "", type: "call", direction: "outbound", duration: "", sentiment: "neutral", outcome: "follow_up", summary: "", nextSteps: "" };

export default function Communications() {
  const [activeMode, setActiveMode] = useState("log");
  const [selectedComm, setSelectedComm] = useState<any>(null);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [logForm, setLogForm] = useState(defaultLogForm);
  const { data: communications } = useListCommunications();
  const { data: leads } = useListLeads();
  const { isHuman } = useAiModeContext();
  const createComm = useCreateCommunicationMut();
  const commList = (communications ?? []) as any[];
  const leadList = (leads ?? []) as any[];

  const typeIcon: Record<string, React.ReactNode> = {
    call: <Phone className="h-4 w-4" />,
    meeting: <Video className="h-4 w-4" />,
    email: <Mail className="h-4 w-4" />,
  };

  const totalComms = commList.length;
  const calls = commList.filter((c: any) => c.type === "call").length;
  const meetings = commList.filter((c: any) => c.type === "meeting").length;
  const positive = commList.filter((c: any) => c.sentiment === "positive").length;

  function handleLogSubmit() {
    createComm.mutate({
      subject: logForm.subject,
      type: logForm.type,
      direction: logForm.direction,
      duration: logForm.duration ? Number(logForm.duration) : undefined,
      sentiment: logForm.sentiment,
      outcome: logForm.outcome,
      summary: logForm.summary || undefined,
      nextSteps: logForm.nextSteps || undefined,
    }, {
      onSuccess: () => {
        setShowLogDialog(false);
        setLogForm(defaultLogForm);
      },
    });
  }

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Communication Intelligence"
        subtitle="AI-powered calling, meeting support, and communication coaching"
        icon={<MessagesSquare className="h-5 w-5" />}
        actions={<Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg" onClick={() => setShowLogDialog(true)}><Plus className="h-4 w-4 mr-2" />Log Communication</Button>}
      />

      <ModeIndicatorBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Comms" value={totalComms} icon={<MessagesSquare className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Calls" value={calls} icon={<Phone className="h-4 w-4" />} />
        <KpiCard label="Meetings" value={meetings} icon={<Video className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Positive" value={positive} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
      </div>

      <ModeAwareWrapper
        domain="communications"
        humanContent={
          <div className="space-y-6">
            <HumanWorkflowGuide title="Communication Workflow" steps={[
              { id: "1", title: "Review Upcoming Calls", description: "Check today's scheduled calls and prepare talking points", status: "current" as const, action: "View Schedule" },
              { id: "2", title: "Prepare Call Script", description: "Review lead history, pain points, and objection handling notes", status: "upcoming" as const },
              { id: "3", title: "Make the Call", description: "Conduct the call, take notes on key discussion points", status: "upcoming" as const },
              { id: "4", title: "Log Communication", description: "Record call outcome, sentiment, and follow-up actions", status: "upcoming" as const },
              { id: "5", title: "Schedule Follow-up", description: "Set next touchpoint and update CRM with meeting notes", status: "upcoming" as const },
            ]} icon={<MessagesSquare className="h-5 w-5 text-blue-400" />} />
            <GlassCard>
              <h3 className="text-sm font-semibold mb-3">Recent Communications ({commList.length})</h3>
              <div className="space-y-2">
                {commList.map((comm: any) => (
                  <div key={comm.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 cursor-pointer" onClick={() => setSelectedComm(comm)}>
                    <div className="flex items-center gap-2">
                      {typeIcon[comm.type] ?? <Mail className="h-4 w-4" />}
                      <div>
                        <p className="text-sm font-medium">{comm.subject}</p>
                        <p className="text-[10px] text-muted-foreground">{comm.type} · {comm.direction} · {new Date(comm.createdAt ?? comm.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <StatusBadge variant={comm.sentiment === "positive" ? "ai-approved" : comm.sentiment === "negative" ? "ai-flagged" : "pending"} label={comm.sentiment ?? "neutral"} />
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        }
      >
      <PremiumTabs tabs={tabs} activeTab={activeMode} onTabChange={setActiveMode} />

      <motion.div key={activeMode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeMode === "log" && (
          <div className="space-y-3">
            {commList.map((comm: any) => (
              <GlassCard key={comm.id} variant="interactive" className="cursor-pointer" onClick={() => setSelectedComm(comm)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg glass-surface shrink-0">{typeIcon[comm.type] ?? typeIcon.email}</div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{comm.subject}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        {comm.direction === "outbound" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                        <span className="capitalize">{comm.direction}</span>
                        {comm.duration && <><Clock className="h-3 w-3 ml-1" /><span>{comm.duration} min</span></>}
                        <span>&bull; {new Date(comm.createdAt ?? comm.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <StatusBadge variant={comm.sentiment === "positive" ? "success" : comm.sentiment === "negative" ? "critical" : "warning"} label={comm.sentiment} />
                    <Badge variant="outline" className="capitalize text-[10px]">{comm.outcome}</Badge>
                  </div>
                </div>
              </GlassCard>
            ))}
            {commList.length === 0 && (
              <GlassCard className="py-12 flex flex-col items-center gap-3">
                <MessagesSquare className="h-12 w-12 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No communications logged yet</p>
                <Button className="btn-premium text-white text-sm rounded-lg" onClick={() => setShowLogDialog(true)}><Plus className="h-4 w-4 mr-2" />Log First Communication</Button>
              </GlassCard>
            )}
          </div>
        )}

        {activeMode === "intelligence" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <GlassCard glow="blue" className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-info" />
                      <h3 className="text-sm font-semibold">Meeting Transcript Viewer</h3>
                    </div>
                    <Badge variant="outline" className="text-[10px]">AI Analyzed</Badge>
                  </div>
                  <div className="px-5 pb-4 space-y-3">
                    {commList.length > 0 ? (
                      <div className="space-y-2">
                        {commList.filter((c: any) => c.type === "meeting" || c.type === "call").slice(0, 3).map((comm: any, i: number) => (
                          <div key={comm.id} className="p-3 rounded-lg glass-surface">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {comm.type === "meeting" ? <Video className="h-3.5 w-3.5 text-info" /> : <Phone className="h-3.5 w-3.5 text-success" />}
                                <span className="text-sm font-medium">{comm.subject}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <StatusBadge variant={comm.sentiment === "positive" ? "success" : comm.sentiment === "negative" ? "critical" : "warning"} label={comm.sentiment ?? "neutral"} />
                                {comm.duration && <Badge variant="outline" className="text-[9px]">{comm.duration}m</Badge>}
                              </div>
                            </div>
                            {comm.summary && <p className="text-xs text-muted-foreground">{comm.summary}</p>}
                            <div className="flex gap-1 mt-2">
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"><FileText className="h-3 w-3 mr-1" />Transcript</Button>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"><Brain className="h-3 w-3 mr-1" />AI Analysis</Button>
                              <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"><Target className="h-3 w-3 mr-1" />CRM Update</Button>
                            </div>
                          </div>
                        ))}
                        {commList.filter((c: any) => c.type === "meeting" || c.type === "call").length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">No calls or meetings logged yet. Log a communication to see intelligence.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4">No communications yet. Log calls or meetings to enable intelligence analysis.</p>
                    )}
                  </div>
                </GlassCard>

                <GlassCard className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-crimson" />
                    <h3 className="text-sm font-semibold">Communication Analytics</h3>
                  </div>
                  <div className="px-5 pb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 rounded-lg glass-surface text-center">
                        <p className="text-lg font-bold text-crimson">{positive}</p>
                        <p className="text-[10px] text-muted-foreground">Positive Sentiment</p>
                      </div>
                      <div className="p-3 rounded-lg glass-surface text-center">
                        <p className="text-lg font-bold text-warning">{commList.filter((c: any) => c.sentiment === "neutral").length}</p>
                        <p className="text-[10px] text-muted-foreground">Neutral</p>
                      </div>
                      <div className="p-3 rounded-lg glass-surface text-center">
                        <p className="text-lg font-bold text-red-400">{commList.filter((c: any) => c.sentiment === "negative").length}</p>
                        <p className="text-[10px] text-muted-foreground">Negative</p>
                      </div>
                      <div className="p-3 rounded-lg glass-surface text-center">
                        <p className="text-lg font-bold text-info">{commList.filter((c: any) => c.outcome === "meeting_booked").length}</p>
                        <p className="text-[10px] text-muted-foreground">Meetings Booked</p>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-info" />
                    <h3 className="text-sm font-semibold">AI-Generated Follow-Up Drafts</h3>
                  </div>
                  <div className="px-5 pb-4 space-y-2">
                    {commList.filter((c: any) => c.outcome === "follow_up" || c.outcome === "interested").slice(0, 3).map((comm: any) => (
                      <div key={comm.id} className="p-3 rounded-lg glass-surface">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold">{comm.subject}</p>
                          <Badge variant="outline" className="text-[9px] capitalize">{comm.outcome}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground italic">
                          {comm.outcome === "interested"
                            ? `"Hi [Name], great speaking with you about ${comm.subject?.toLowerCase() || "your needs"}. As discussed, I'd love to schedule a deeper dive into how PMG can help..."`
                            : `"Following up on our ${comm.type || "conversation"} regarding ${comm.subject?.toLowerCase() || "your project"}. I wanted to share some additional resources..."`}
                        </p>
                        <div className="flex gap-1 mt-2">
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 text-crimson"><Sparkles className="h-3 w-3 mr-1" />Regenerate</Button>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2"><Mail className="h-3 w-3 mr-1" />Send Draft</Button>
                        </div>
                      </div>
                    ))}
                    {commList.filter((c: any) => c.outcome === "follow_up" || c.outcome === "interested").length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-3">Log follow-up or interested outcomes to see AI-generated drafts.</p>
                    )}
                  </div>
                </GlassCard>
              </div>

              <div className="space-y-4">
                <GlassCard glow="crimson" className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-crimson" />
                    <h3 className="text-xs font-semibold">Objection Detection</h3>
                  </div>
                  <div className="px-5 pb-4 space-y-2">
                    {[
                      { objection: "Budget Concerns", frequency: 42, response: "ROI-focused case study approach", severity: "high" },
                      { objection: "Already Have Vendor", frequency: 28, response: "Competitive differentiator pivot", severity: "high" },
                      { objection: "Not the Right Time", frequency: 35, response: "Urgency + cost-of-delay framing", severity: "medium" },
                      { objection: "Need Internal Buy-in", frequency: 18, response: "Decision-maker mapping + materials", severity: "medium" },
                      { objection: "Too Complex", frequency: 12, response: "Phased rollout proposal", severity: "low" },
                    ].map((obj) => (
                      <div key={obj.objection} className="p-2 rounded-lg glass-surface">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[11px] font-semibold">{obj.objection}</p>
                          <Badge className={`text-[8px] ${obj.severity === "high" ? "bg-red-500/10 text-red-400" : obj.severity === "medium" ? "bg-yellow-500/10 text-yellow-400" : "bg-blue-500/10 text-blue-400"}`}>{obj.frequency}%</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{obj.response}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <h3 className="text-xs font-semibold">Coaching Insights</h3>
                  </div>
                  <div className="px-5 pb-4 space-y-2">
                    {[
                      { insight: "Talk-to-listen ratio improving — now 40/60", trend: "positive" },
                      { insight: "Average call duration up 15% (more engaged)", trend: "positive" },
                      { insight: "Follow-up rate: 78% within 24 hours", trend: "positive" },
                      { insight: "Objection handling success rate: 62%", trend: "neutral" },
                      { insight: "Meeting-to-proposal conversion: 45%", trend: "neutral" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg glass-surface">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${item.trend === "positive" ? "bg-green-400" : "bg-yellow-400"}`} />
                        <p className="text-[11px]">{item.insight}</p>
                      </div>
                    ))}
                  </div>
                </GlassCard>

                <GlassCard className="p-0 overflow-hidden">
                  <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-info" />
                    <h3 className="text-xs font-semibold">CRM Update Suggestions</h3>
                  </div>
                  <div className="px-5 pb-4 space-y-2">
                    {commList.slice(0, 3).map((comm: any) => (
                      <div key={comm.id} className="p-2 rounded-lg glass-surface">
                        <p className="text-[11px] font-medium">{comm.subject}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {comm.sentiment === "positive" ? "Update status → Warm Lead, add follow-up task" : "Add note: needs nurturing, schedule re-engagement"}
                        </p>
                        <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5 mt-1 text-crimson"><Zap className="h-2.5 w-2.5 mr-0.5" />Apply</Button>
                      </div>
                    ))}
                    {commList.length === 0 && <p className="text-[10px] text-muted-foreground text-center py-2">No communications to suggest CRM updates for.</p>}
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        )}

        {activeMode === "ai-calling" && (
          <GlassCard glow="blue" className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center gap-2">
              <Bot className="h-4 w-4 text-info" />
              <h3 className="text-sm font-semibold">AI-Led Calling Engine</h3>
              <StatusBadge variant="ai-executed" label="Mode A" />
            </div>
            <div className="px-5 pb-4 space-y-4">
              <p className="text-sm text-muted-foreground">AI-managed calls within defined rules. The system handles eligibility, scripts, objection handling, booking, and CRM updates.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg glass-surface space-y-3">
                  <h4 className="text-xs font-semibold text-crimson uppercase tracking-wider">Call Queue</h4>
                  {leadList.filter((l: any) => l.status !== "disqualified").slice(0, 3).map((lead: any) => (
                    <div key={lead.id} className="flex items-center justify-between p-2 rounded-lg glass-surface text-xs">
                      <span className="truncate">{lead.painPoints ?? lead.pain_points ?? "Lead " + lead.id}</span>
                      <Badge variant="outline" className="text-[9px]">{lead.priority}</Badge>
                    </div>
                  ))}
                  <Button className="btn-premium text-white w-full text-xs rounded-lg"><Phone className="h-3 w-3 mr-1" />Start AI Call Session</Button>
                </div>
                <div className="p-4 rounded-lg glass-surface space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider">Eligibility Rules</h4>
                  {["Lead score > 60%", "Valid phone number", "Not contacted in 48h", "Business hours only", "Not marked DNC"].map((rule) => (
                    <div key={rule} className="flex items-center gap-2 text-xs"><CheckCircle2 className="h-3 w-3 text-success" /><span>{rule}</span></div>
                  ))}
                </div>
                <div className="p-4 rounded-lg glass-surface space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider">Disposition Mapping</h4>
                  {[
                    { outcome: "Meeting Booked", action: "Create CRM opportunity", color: "text-success" },
                    { outcome: "Interested", action: "Schedule follow-up", color: "text-info" },
                    { outcome: "Not Now", action: "Add to nurture", color: "text-warning" },
                    { outcome: "Not Interested", action: "Mark disqualified", color: "text-crimson" },
                  ].map((d) => (
                    <div key={d.outcome} className="text-xs"><span className={`font-semibold ${d.color}`}>{d.outcome}</span><span className="text-muted-foreground"> → {d.action}</span></div>
                  ))}
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {activeMode === "human-calling" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Cold Call Workspace</h3>
                  <StatusBadge variant="human-assisted" label="Mode B" />
                </div>
                <div className="px-5 pb-4 space-y-4">
                  <div className="p-4 rounded-lg glass-surface">
                    <p className="text-xs font-semibold text-info mb-1">AI Coaching Active</p>
                    <p className="text-sm text-muted-foreground">Select a lead to receive real-time coaching: opening suggestions, objection responses, tone guidance, and timing cues.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-success hover:bg-success/90 text-white rounded-lg"><Phone className="h-4 w-4 mr-2" />Start Call</Button>
                    <Button className="btn-glass text-foreground flex-1 rounded-lg"><Mic className="h-4 w-4 mr-2" />Record</Button>
                  </div>
                </div>
              </GlassCard>
            </div>
            <GlassCard glow="crimson" className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-crimson" />
                <h3 className="text-xs font-semibold">AI Coaching Sidebar</h3>
              </div>
              <div className="px-5 pb-4 space-y-2 text-xs">
                {[
                  { title: "Opening", text: "'Hi [Name], this is [You] from PMG Group...'" },
                  { title: "Pain Probe", text: "'Many companies your size struggle with [pain]...'" },
                  { title: "Objection: Budget", text: "'Most clients find ROI within 90 days...'" },
                  { title: "Objection: Timing", text: "'Would a brief call next week work?'" },
                  { title: "Close", text: "'I'd love to set up a deeper conversation...'" },
                ].map((item) => (
                  <div key={item.title} className="p-2 rounded-lg glass-surface">
                    <p className="font-semibold text-crimson text-[10px] mb-0.5">{item.title}</p>
                    <p className="text-muted-foreground italic">{item.text}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        )}

        {activeMode === "meeting-support" && (
          <GlassCard glow="blue" className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3 flex items-center gap-2">
              <Headphones className="h-4 w-4 text-info" />
              <h3 className="text-sm font-semibold">Meeting Support — AI Co-Pilot</h3>
              <StatusBadge variant="ai-executed" label="Mode C" />
            </div>
            <div className="px-5 pb-4 space-y-4">
              <p className="text-sm text-muted-foreground">Real-time meeting intelligence: transcription, objection detection, interest signals, and follow-up generation.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg glass-surface space-y-3">
                  <h4 className="text-xs font-semibold text-crimson uppercase tracking-wider">Live Detection</h4>
                  {[
                    { signal: "Objection Detected", detail: '"We already have a vendor"', icon: AlertCircle, color: "text-crimson" },
                    { signal: "Interest Signal", detail: '"Tell me more about that"', icon: CheckCircle2, color: "text-success" },
                    { signal: "Hesitation", detail: "Long pause after pricing", icon: Clock, color: "text-warning" },
                  ].map((sig, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-lg glass-surface">
                      <sig.icon className={`h-4 w-4 shrink-0 mt-0.5 ${sig.color}`} />
                      <div><p className="text-xs font-semibold">{sig.signal}</p><p className="text-[10px] text-muted-foreground">{sig.detail}</p></div>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-lg glass-surface space-y-3">
                  <h4 className="text-xs font-semibold text-crimson uppercase tracking-wider">AI Suggestions</h4>
                  {[
                    "Emphasize compliance cost savings — prospect mentioned recent audit",
                    "Pivot to case study: similar client in financial services",
                    "Suggest a phased approach to address budget concerns",
                    "Propose a free security assessment as next step",
                  ].map((sug, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs"><Sparkles className="h-3 w-3 text-crimson shrink-0 mt-0.5" /><span>{sug}</span></div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="btn-premium text-white flex-1 rounded-lg"><Video className="h-4 w-4 mr-2" />Join Meeting</Button>
                <Button className="btn-glass text-foreground flex-1 rounded-lg"><Sparkles className="h-4 w-4 mr-2" />Generate Summary</Button>
              </div>
            </div>
          </GlassCard>
        )}

        {activeMode === "transcription" && (
          <div className="space-y-6">
            <GlassCard glow="blue" className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-info" />
                  <h3 className="text-sm font-semibold">Recent Transcriptions</h3>
                </div>
                <Badge variant="outline" className="text-[10px]">{commList.filter((c: any) => c.type === "call" || c.type === "meeting").length} recordings</Badge>
              </div>
              <div className="px-5 pb-4 space-y-2">
                {commList.filter((c: any) => c.type === "call" || c.type === "meeting").slice(0, 8).map((comm: any) => (
                  <div key={comm.id} className="p-3 rounded-lg glass-surface">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        {comm.type === "call" ? <Phone className="h-4 w-4 text-info shrink-0" /> : <Video className="h-4 w-4 text-purple-400 shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{comm.subject}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{comm.duration ? `${comm.duration} min` : "N/A"}</span>
                            <span className="text-[10px] text-muted-foreground">{comm.createdAt ? new Date(comm.createdAt).toLocaleDateString() : ""}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge variant={comm.sentiment === "positive" ? "success" : comm.sentiment === "negative" ? "critical" : "pending"} label={comm.sentiment ?? "neutral"} />
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => setSelectedComm(comm)}>View</Button>
                      </div>
                    </div>
                    {comm.summary && (
                      <div className="p-2 rounded bg-white/[0.02] text-[10px] text-muted-foreground mt-1">{comm.summary}</div>
                    )}
                  </div>
                ))}
                {commList.filter((c: any) => c.type === "call" || c.type === "meeting").length === 0 && (
                  <div className="py-6 text-center text-sm text-muted-foreground">No call or meeting recordings yet</div>
                )}
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Sentiment Detection</h3></div>
                <div className="px-5 pb-4 space-y-2">
                  {[
                    { label: "Positive", count: positive, color: "bg-success" },
                    { label: "Neutral", count: commList.filter((c: any) => c.sentiment === "neutral").length, color: "bg-info" },
                    { label: "Negative", count: commList.filter((c: any) => c.sentiment === "negative").length, color: "bg-crimson" },
                  ].map((s) => (
                    <div key={s.label} className="space-y-1">
                      <div className="flex justify-between text-xs"><span>{s.label}</span><span className="tabular-nums">{s.count}</span></div>
                      <div className="h-1.5 rounded-full bg-white/5"><div className={`h-full rounded-full ${s.color}`} style={{ width: `${totalComms ? (s.count / totalComms) * 100 : 0}%` }} /></div>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Hesitation Detection</h3></div>
                <div className="px-5 pb-4 space-y-2">
                  {[
                    { pattern: "Long pauses after pricing discussion", frequency: "42%", severity: "high" },
                    { pattern: "Repeated clarification requests", frequency: "28%", severity: "medium" },
                    { pattern: "Non-committal language patterns", frequency: "35%", severity: "high" },
                  ].map((h, i) => (
                    <div key={i} className="p-2 rounded-lg glass-surface">
                      <p className="text-xs font-medium">{h.pattern}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">{h.frequency} of calls</span>
                        <Badge variant="outline" className={`text-[9px] ${h.severity === "high" ? "border-crimson/30 text-crimson" : "border-warning/30 text-warning"}`}>{h.severity}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Follow-Up Draft Generator</h3></div>
                <div className="px-5 pb-4 space-y-2">
                  {commList.filter((c: any) => c.outcome === "follow_up").slice(0, 4).map((comm: any) => (
                    <div key={comm.id} className="p-2 rounded-lg glass-surface">
                      <p className="text-xs font-medium truncate">{comm.subject}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">Draft ready</span>
                        <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5"><Sparkles className="h-3 w-3 mr-0.5" />Generate</Button>
                      </div>
                    </div>
                  ))}
                  {commList.filter((c: any) => c.outcome === "follow_up").length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No follow-ups pending</p>
                  )}
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {activeMode === "coaching" && (
          <div className="space-y-6">
            <GlassCard glow="crimson" className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-crimson" />
                  <h3 className="text-sm font-semibold">Communication Coaching Dashboard</h3>
                </div>
                <StatusBadge variant="ai-executed" label="AI Coach Active" />
              </div>
              <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { metric: "Talk-to-Listen Ratio", value: "62:38", target: "40:60", status: "needs_work" },
                  { metric: "Avg Call Duration", value: `${Math.round(commList.reduce((s: number, c: any) => s + (c.duration ?? 0), 0) / (calls || 1))} min`, target: "15-20 min", status: "good" },
                  { metric: "Positive Outcome Rate", value: `${totalComms ? Math.round((positive / totalComms) * 100) : 0}%`, target: ">60%", status: positive / (totalComms || 1) > 0.6 ? "good" : "needs_work" },
                  { metric: "Follow-Up Completion", value: "78%", target: ">90%", status: "needs_work" },
                ].map((m) => (
                  <div key={m.metric} className="p-3 rounded-lg glass-surface text-center">
                    <p className={`text-lg font-bold ${m.status === "good" ? "text-success" : "text-warning"}`}>{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.metric}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">Target: {m.target}</p>
                  </div>
                ))}
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Improvement Areas</h3></div>
                <div className="px-5 pb-4 space-y-2">
                  {[
                    { area: "Active Listening", score: 65, tips: ["Ask more open-ended questions", "Summarize prospect's points before responding", "Avoid interrupting during key statements"] },
                    { area: "Objection Handling", score: 72, tips: ["Use 'feel-felt-found' framework", "Acknowledge concern before pivoting", "Prepare responses for top 5 objections"] },
                    { area: "Value Articulation", score: 58, tips: ["Lead with ROI numbers", "Use client-specific examples", "Quantify risk of inaction"] },
                    { area: "Closing Technique", score: 45, tips: ["Use assumptive close more often", "Establish next steps before ending call", "Create urgency with relevant deadlines"] },
                  ].map((item) => (
                    <div key={item.area} className="p-3 rounded-lg glass-surface">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold">{item.area}</p>
                        <span className={`text-xs font-bold ${item.score >= 70 ? "text-success" : item.score >= 50 ? "text-warning" : "text-crimson"}`}>{item.score}%</span>
                      </div>
                      <div className="space-y-1">
                        {item.tips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                            <Sparkles className="h-3 w-3 text-crimson shrink-0 mt-0.5" />
                            <span>{tip}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Best Practices & Templates</h3></div>
                <div className="px-5 pb-4 space-y-2">
                  {[
                    { name: "Discovery Call Framework", type: "Call Script", rating: 4.8, uses: 34 },
                    { name: "Security Audit Pitch", type: "Call Script", rating: 4.5, uses: 22 },
                    { name: "Follow-Up Email — Post-Demo", type: "Email Template", rating: 4.7, uses: 48 },
                    { name: "Objection Response — Budget", type: "Response Template", rating: 4.3, uses: 18 },
                    { name: "Meeting Summary Format", type: "Template", rating: 4.6, uses: 31 },
                    { name: "Cold Outreach — CISO Target", type: "Email Template", rating: 4.1, uses: 12 },
                  ].map((bp) => (
                    <div key={bp.name} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{bp.name}</p>
                        <Badge variant="outline" className="text-[9px] mt-0.5">{bp.type}</Badge>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-xs font-bold text-gold">{bp.rating}</p>
                          <p className="text-[9px] text-muted-foreground">{bp.uses} uses</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 text-[9px] px-2">Use</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        )}
      </motion.div>
      </ModeAwareWrapper>

      <DetailDrawer open={!!selectedComm} onClose={() => setSelectedComm(null)} title={selectedComm?.subject} subtitle={selectedComm?.type}>
        {selectedComm && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg glass-surface text-center"><Badge variant="outline" className="capitalize">{selectedComm.type}</Badge><p className="text-[10px] text-muted-foreground mt-1">Type</p></div>
              <div className="p-3 rounded-lg glass-surface text-center"><StatusBadge variant={selectedComm.sentiment === "positive" ? "success" : "warning"} label={selectedComm.sentiment} /><p className="text-[10px] text-muted-foreground mt-1">Sentiment</p></div>
              <div className="p-3 rounded-lg glass-surface text-center"><Badge variant="outline" className="capitalize">{selectedComm.outcome}</Badge><p className="text-[10px] text-muted-foreground mt-1">Outcome</p></div>
            </div>
            {selectedComm.summary && (
              <GlassCard><p className="text-xs font-semibold mb-1">Summary</p><p className="text-sm text-muted-foreground">{selectedComm.summary}</p></GlassCard>
            )}
            {(selectedComm.next_steps || selectedComm.nextSteps) && (
              <GlassCard glow="crimson"><p className="text-xs font-semibold text-crimson mb-1">Next Steps</p><p className="text-sm">{selectedComm.next_steps ?? selectedComm.nextSteps}</p></GlassCard>
            )}
            <div className="flex gap-2">
              <Button className="btn-glass text-foreground flex-1 text-sm rounded-lg"><Sparkles className="h-4 w-4 mr-2" />AI Analyze</Button>
              <Button className="btn-premium text-white flex-1 text-sm rounded-lg"><ArrowUpRight className="h-4 w-4 mr-2" />Create Follow-Up</Button>
            </div>
          </div>
        )}
      </DetailDrawer>

      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent className="glass-card border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle>Log Communication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Subject</Label>
              <Input className="glass-input mt-1" value={logForm.subject} onChange={(e) => setLogForm(f => ({ ...f, subject: e.target.value }))} placeholder="Call with prospect..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={logForm.type} onValueChange={(v) => setLogForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Direction</Label>
                <Select value={logForm.direction} onValueChange={(v) => setLogForm(f => ({ ...f, direction: v }))}>
                  <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outbound">Outbound</SelectItem>
                    <SelectItem value="inbound">Inbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Duration (min)</Label>
                <Input className="glass-input mt-1" type="number" value={logForm.duration} onChange={(e) => setLogForm(f => ({ ...f, duration: e.target.value }))} placeholder="15" />
              </div>
              <div>
                <Label className="text-xs">Sentiment</Label>
                <Select value={logForm.sentiment} onValueChange={(v) => setLogForm(f => ({ ...f, sentiment: v }))}>
                  <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Outcome</Label>
                <Select value={logForm.outcome} onValueChange={(v) => setLogForm(f => ({ ...f, outcome: v }))}>
                  <SelectTrigger className="glass-input mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                    <SelectItem value="meeting_booked">Meeting Booked</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                    <SelectItem value="no_answer">No Answer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Summary</Label>
              <Textarea className="glass-input mt-1" rows={2} value={logForm.summary} onChange={(e) => setLogForm(f => ({ ...f, summary: e.target.value }))} placeholder="Key discussion points..." />
            </div>
            <div>
              <Label className="text-xs">Next Steps</Label>
              <Input className="glass-input mt-1" value={logForm.nextSteps} onChange={(e) => setLogForm(f => ({ ...f, nextSteps: e.target.value }))} placeholder="Schedule follow-up call..." />
            </div>
            <div className="flex gap-2 pt-2">
              <Button className="btn-glass text-foreground flex-1 rounded-lg" onClick={() => setShowLogDialog(false)}>Cancel</Button>
              <Button className="btn-premium text-white flex-1 rounded-lg" onClick={handleLogSubmit} disabled={!logForm.subject || createComm.isPending}>
                {createComm.isPending ? "Saving..." : "Log Communication"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
