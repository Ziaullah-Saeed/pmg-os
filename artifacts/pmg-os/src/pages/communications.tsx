import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MessagesSquare, Phone, Video, Mail, ArrowUpRight, ArrowDownLeft, Clock, Plus, Sparkles, Bot, User, Headphones, AlertCircle, CheckCircle2, Mic } from "lucide-react";
import { useListCommunications, useListLeads, useListContacts } from "@workspace/api-client-react";
import { motion } from "framer-motion";

export default function Communications() {
  const [activeMode, setActiveMode] = useState("log");
  const [selectedComm, setSelectedComm] = useState<any>(null);
  const { data: communications } = useListCommunications();
  const { data: leads } = useListLeads();
  const { data: contacts } = useListContacts();
  const commList = (communications ?? []) as any[];
  const leadList = (leads ?? []) as any[];
  const contactList = (contacts ?? []) as any[];

  const typeIcon: Record<string, React.ReactNode> = {
    call: <Phone className="h-4 w-4" />,
    meeting: <Video className="h-4 w-4" />,
    email: <Mail className="h-4 w-4" />,
  };
  const sentimentColor: Record<string, string> = { positive: 'text-green-400', neutral: 'text-yellow-400', negative: 'text-red-400' };

  const totalComms = commList.length;
  const calls = commList.filter((c: any) => c.type === 'call').length;
  const meetings = commList.filter((c: any) => c.type === 'meeting').length;
  const positive = commList.filter((c: any) => c.sentiment === 'positive').length;

  return (
    <motion.div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <MessagesSquare className="h-8 w-8 text-primary" />
            Communication Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered calling, meeting support, and communication coaching.</p>
        </div>
        <NewCommDialog />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SmallMetric label="Total Comms" value={totalComms} />
        <SmallMetric label="Calls" value={calls} accent="blue" />
        <SmallMetric label="Meetings" value={meetings} accent="purple" />
        <SmallMetric label="Positive" value={positive} accent="green" />
      </div>

      <Tabs value={activeMode} onValueChange={setActiveMode}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="log" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <MessagesSquare className="h-4 w-4 mr-2" />Communication Log
          </TabsTrigger>
          <TabsTrigger value="ai-calling" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Bot className="h-4 w-4 mr-2" />Mode A: AI-Led Calling
          </TabsTrigger>
          <TabsTrigger value="human-calling" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <User className="h-4 w-4 mr-2" />Mode B: AI-Guided Cold Call
          </TabsTrigger>
          <TabsTrigger value="meeting-support" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Headphones className="h-4 w-4 mr-2" />Mode C: Meeting Support
          </TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-3 mt-6">
          {commList.map((comm: any) => (
            <Card key={comm.id} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedComm(comm)}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-md bg-secondary/50 shrink-0">{typeIcon[comm.type] ?? typeIcon.email}</div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{comm.subject}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        {comm.direction === 'outbound' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                        <span className="capitalize">{comm.direction}</span>
                        {comm.duration && <><Clock className="h-3 w-3 ml-1" /><span>{comm.duration} min</span></>}
                        <span>&bull; {new Date(comm.createdAt ?? comm.created_at).toLocaleDateString()}</span>
                      </div>
                      {comm.summary && <p className="text-xs text-muted-foreground mt-1 truncate">{comm.summary}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge variant="outline" className={`text-[10px] ${sentimentColor[comm.sentiment] ?? ''}`}>{comm.sentiment}</Badge>
                    <Badge variant="secondary" className="capitalize text-[10px]">{comm.outcome}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="ai-calling" className="space-y-6 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Bot className="h-5 w-5 text-primary" />AI-Led Calling Engine</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">AI-managed calls within defined rules. The system handles eligibility, scripts, objection handling, booking, and CRM updates.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-background/50 border border-border/30 space-y-3">
                  <h4 className="text-sm font-semibold text-primary">Call Queue</h4>
                  {leadList.filter((l: any) => l.status !== 'disqualified').slice(0, 3).map((lead: any) => (
                    <div key={lead.id} className="flex items-center justify-between p-2 rounded bg-muted/20 text-xs">
                      <span className="truncate">{lead.painPoints ?? lead.pain_points ?? 'Lead ' + lead.id}</span>
                      <Badge variant="outline" className="text-[9px]">{lead.priority}</Badge>
                    </div>
                  ))}
                  <Button size="sm" className="w-full bg-primary hover:bg-primary/90 text-xs"><Phone className="h-3 w-3 mr-1" />Start AI Call Session</Button>
                </div>
                <div className="p-4 rounded-lg bg-background/50 border border-border/30 space-y-3">
                  <h4 className="text-sm font-semibold">Eligibility Rules</h4>
                  {['Lead score > 60%', 'Valid phone number', 'Not contacted in 48h', 'Business hours only', 'Not marked DNC'].map(rule => (
                    <div key={rule} className="flex items-center gap-2 text-xs">
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-lg bg-background/50 border border-border/30 space-y-3">
                  <h4 className="text-sm font-semibold">Disposition Mapping</h4>
                  {[
                    { outcome: 'Meeting Booked', action: 'Create CRM opportunity', color: 'text-green-400' },
                    { outcome: 'Interested', action: 'Schedule follow-up', color: 'text-blue-400' },
                    { outcome: 'Not Now', action: 'Add to nurture', color: 'text-yellow-400' },
                    { outcome: 'Not Interested', action: 'Mark disqualified', color: 'text-red-400' },
                  ].map(d => (
                    <div key={d.outcome} className="text-xs">
                      <span className={`font-semibold ${d.color}`}>{d.outcome}</span>
                      <span className="text-muted-foreground"> → {d.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="human-calling" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card className="bg-card/50 backdrop-blur-sm border-border/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2"><User className="h-5 w-5 text-primary" />Cold Call Workspace</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Select Lead to Call</Label>
                    <Select>
                      <SelectTrigger className="bg-background/50"><SelectValue placeholder="Choose a lead..." /></SelectTrigger>
                      <SelectContent>
                        {leadList.map((l: any) => <SelectItem key={l.id} value={String(l.id)}>Lead #{l.id} - {l.source} ({l.fitScore ?? l.fit_score}% fit)</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="p-4 rounded-lg bg-primary/5 border border-primary/10 space-y-2">
                    <p className="text-xs font-semibold text-primary">AI Coaching Active</p>
                    <p className="text-sm text-muted-foreground">Select a lead to receive real-time coaching: opening suggestions, objection responses, tone guidance, and timing cues.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-green-600 hover:bg-green-700"><Phone className="h-4 w-4 mr-2" />Start Call</Button>
                    <Button variant="outline" className="flex-1"><Mic className="h-4 w-4 mr-2" />Record</Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />AI Coaching Sidebar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <CoachingItem title="Opening" text="'Hi [Name], this is [You] from PMG Group. I noticed [Company] recently [trigger event]...'" />
                <CoachingItem title="Pain Probe" text="'Many companies your size struggle with [pain point]. How are you handling that today?'" />
                <CoachingItem title="Objection: Budget" text="'I understand. Most clients find ROI within 90 days through reduced incident costs...'" />
                <CoachingItem title="Objection: Timing" text="'Completely fair. Would it make sense to have a brief call next week to explore options?'" />
                <CoachingItem title="Close" text="'Based on what you've shared, I'd love to set up a deeper conversation with our team...'" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="meeting-support" className="space-y-6 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Headphones className="h-5 w-5 text-primary" />Meeting Support — AI Co-Pilot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Real-time meeting intelligence: transcription, objection detection, interest signals, hesitation analysis, and follow-up generation.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-background/50 border border-border/30 space-y-3">
                  <h4 className="text-sm font-semibold text-primary">Live Detection</h4>
                  {[
                    { signal: 'Objection Detected', detail: '"We already have a vendor"', icon: AlertCircle, color: 'text-red-400' },
                    { signal: 'Interest Signal', detail: '"That\'s interesting, tell me more"', icon: CheckCircle2, color: 'text-green-400' },
                    { signal: 'Hesitation', detail: 'Long pause after pricing discussion', icon: Clock, color: 'text-yellow-400' },
                  ].map((sig, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/20">
                      <sig.icon className={`h-4 w-4 shrink-0 mt-0.5 ${sig.color}`} />
                      <div>
                        <p className="text-xs font-semibold">{sig.signal}</p>
                        <p className="text-[10px] text-muted-foreground">{sig.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-lg bg-background/50 border border-border/30 space-y-3">
                  <h4 className="text-sm font-semibold text-primary">AI Suggestions</h4>
                  {[
                    'Emphasize compliance cost savings — prospect mentioned recent audit',
                    'Pivot to case study: similar client in financial services',
                    'Suggest a phased approach to address budget concerns',
                    'Propose a free security assessment as next step',
                  ].map((sug, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      <span>{sug}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-primary hover:bg-primary/90"><Video className="h-4 w-4 mr-2" />Join Meeting</Button>
                <Button variant="outline" className="flex-1"><Sparkles className="h-4 w-4 mr-2" />Generate Summary</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedComm && <CommDetailModal comm={selectedComm} onClose={() => setSelectedComm(null)} />}
    </motion.div>
  );
}

function SmallMetric({ label, value, accent }: any) {
  const color = accent === 'green' ? 'text-green-400' : accent === 'blue' ? 'text-blue-400' : accent === 'purple' ? 'text-violet-400' : '';
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`text-xl font-bold ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function CoachingItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-2 rounded bg-background/50 border border-border/30">
      <p className="font-semibold text-primary text-[10px] mb-0.5">{title}</p>
      <p className="text-muted-foreground italic">{text}</p>
    </div>
  );
}

function NewCommDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" />Log Communication</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border/50 max-w-lg">
        <DialogHeader><DialogTitle>Log Communication</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input placeholder="Meeting with..." className="bg-background/50" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select><SelectTrigger className="bg-background/50"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Direction</Label>
              <Select><SelectTrigger className="bg-background/50"><SelectValue placeholder="Dir" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Outbound</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select><SelectTrigger className="bg-background/50"><SelectValue placeholder="Result" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="meeting_booked">Meeting Booked</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Summary</Label>
            <Textarea placeholder="Brief summary..." className="bg-background/50" rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Next Steps</Label>
            <Input placeholder="Follow up on..." className="bg-background/50" />
          </div>
          <Button className="w-full bg-primary hover:bg-primary/90">Save Communication</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CommDetailModal({ comm, onClose }: any) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border/50 max-w-xl">
        <DialogHeader><DialogTitle>{comm.subject}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <Badge variant="secondary" className="capitalize">{comm.type}</Badge>
              <p className="text-[10px] text-muted-foreground mt-1">Type</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <Badge variant="outline" className={sentimentColor(comm.sentiment)}>{comm.sentiment}</Badge>
              <p className="text-[10px] text-muted-foreground mt-1">Sentiment</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <Badge variant="secondary" className="capitalize">{comm.outcome}</Badge>
              <p className="text-[10px] text-muted-foreground mt-1">Outcome</p>
            </div>
          </div>
          {comm.summary && (
            <div className="p-3 rounded-lg bg-background/50 border border-border/30">
              <p className="text-xs font-semibold mb-1">Summary</p>
              <p className="text-sm text-muted-foreground">{comm.summary}</p>
            </div>
          )}
          {(comm.next_steps || comm.nextSteps) && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs font-semibold text-primary mb-1">Next Steps</p>
              <p className="text-sm">{comm.next_steps ?? comm.nextSteps}</p>
            </div>
          )}
          {comm.aiNotes && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
              <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" />AI Notes</p>
              <p className="text-sm">{comm.aiNotes}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1"><Sparkles className="h-4 w-4 mr-2" />AI Analyze</Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90"><ArrowUpRight className="h-4 w-4 mr-2" />Create Follow-Up</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function sentimentColor(s: string) {
  return s === 'positive' ? 'text-green-400' : s === 'negative' ? 'text-red-400' : 'text-yellow-400';
}
