import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { ModeIndicatorBanner, ModeAwareWrapper, HumanWorkflowGuide } from "@/components/mode-aware-wrapper";
import { useQualityIssues, useCreateQualityIssue, useUpdateQualityIssue } from "@/hooks/use-api";
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, ClipboardList,
  Plus, Star, ThumbsUp, ThumbsDown, FileCheck, Loader2
} from "lucide-react";

const tabs = [
  { id: "reviews", label: "QA Reviews", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  { id: "gates", label: "Quality Gates", icon: <FileCheck className="h-3.5 w-3.5" /> },
  { id: "scoring", label: "Quality Scores", icon: <Star className="h-3.5 w-3.5" /> },
  { id: "checklists", label: "Review Checklists", icon: <ClipboardList className="h-3.5 w-3.5" /> },
];

const qualityGates = [
  { id: "content-review", name: "Content Review", domain: "marketing", required: true, checks: ["Grammar check", "Brand voice", "CTA clarity", "SEO optimization"] },
  { id: "asset-approval", name: "Asset Approval", domain: "production", required: true, checks: ["Visual consistency", "Resolution check", "Brand colors", "Typography"] },
  { id: "outreach-review", name: "Outreach Review", domain: "outreach", required: true, checks: ["Personalization", "Compliance", "Call-to-action", "Subject line"] },
  { id: "proposal-review", name: "Proposal Review", domain: "crm", required: true, checks: ["Pricing accuracy", "Scope definition", "Legal terms", "Timeline"] },
  { id: "report-validation", name: "Report Validation", domain: "reports", required: false, checks: ["Data accuracy", "Chart clarity", "Executive summary", "Recommendations"] },
  { id: "invoice-review", name: "Invoice Review", domain: "finance", required: true, checks: ["Amount verification", "Tax calculation", "Payment terms", "Contact info"] },
];

export default function Quality() {
  const [activeTab, setActiveTab] = useState("reviews");
  const [showCreate, setShowCreate] = useState(false);
  const [newIssue, setNewIssue] = useState({ title: "", description: "", domain: "marketing", severity: "medium", entityType: "deliverable", issueType: "review", entityId: 0 });
  const { isHuman } = useAiModeContext();
  const { toast } = useToast();
  const { data: qualityIssues } = useQualityIssues();
  const createQI = useCreateQualityIssue();
  const updateQI = useUpdateQualityIssue();

  const issueList = (qualityIssues ?? []) as any[];
  const approved = issueList.filter(r => r.status === "approved" || r.status === "resolved").length;
  const rejected = issueList.filter(r => r.status === "rejected").length;
  const pending = issueList.filter(r => r.status === "open" || r.status === "pending" || r.status === "in_review").length;
  const avgScore = issueList.filter(r => r.score).length
    ? Math.round(issueList.filter(r => r.score).reduce((s: number, r: any) => s + (r.score ?? 0), 0) / issueList.filter(r => r.score).length)
    : 0;

  const handleCreate = () => {
    if (!newIssue.title) return;
    createQI.mutate({ ...newIssue, status: "open", reportedBy: "SherShah K." }, {
      onSuccess: () => {
        toast({ title: "Quality issue created" });
        setShowCreate(false);
        setNewIssue({ title: "", description: "", domain: "marketing", severity: "medium", entityType: "deliverable", issueType: "review", entityId: 0 });
      },
    });
  };

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Quality Management"
        subtitle="QA reviews, quality gates, scoring, and compliance checklists"
        icon={<ShieldCheck className="h-5 w-5" />}
        actions={
          <Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />New Review
          </Button>
        }
      />

      <ModeIndicatorBanner />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Approved" value={approved} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
        <KpiCard label="Rejected" value={rejected} icon={<XCircle className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Pending" value={pending} icon={<ClipboardList className="h-4 w-4" />} accent="gold" />
        <KpiCard label="Avg Score" value={avgScore || "—"} icon={<Star className="h-4 w-4" />} accent="blue" />
      </div>

      <ModeAwareWrapper
        domain="quality"
        humanContent={
          <div className="space-y-6">
            <HumanWorkflowGuide title="Quality Review Workflow" steps={[
              { id: "1", title: "Select Item to Review", description: "Pick a deliverable from the queue that needs quality review", status: "current" as const, action: "View Queue" },
              { id: "2", title: "Run Quality Checklist", description: "Go through domain-specific quality checklist point by point", status: "upcoming" as const },
              { id: "3", title: "Score & Annotate", description: "Assign quality score and add reviewer notes for each criterion", status: "upcoming" as const },
              { id: "4", title: "Approve or Reject", description: "Make final decision — approve for deployment or reject with revision notes", status: "upcoming" as const },
            ]} icon={<ShieldCheck className="h-5 w-5 text-blue-400" />} />
          </div>
        }
      >
        <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {activeTab === "reviews" && (
            <div className="space-y-4">
              {showCreate && (
                <GlassCard glow="crimson">
                  <h3 className="text-sm font-semibold mb-3">Create Quality Issue</h3>
                  <div className="space-y-3">
                    <Input placeholder="Issue Title" value={newIssue.title} onChange={e => setNewIssue(p => ({ ...p, title: e.target.value }))} className="bg-white/5 border-white/10" />
                    <Textarea placeholder="Description..." value={newIssue.description} onChange={e => setNewIssue(p => ({ ...p, description: e.target.value }))} className="bg-white/5 border-white/10 min-h-[80px]" />
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-400">Domain</Label>
                        <Select value={newIssue.domain} onValueChange={v => setNewIssue(p => ({ ...p, domain: v }))}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                            {["marketing", "production", "outreach", "crm", "finance", "reports", "communications"].map(d => (
                              <SelectItem key={d} value={d} className="text-white capitalize">{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-400">Severity</Label>
                        <Select value={newIssue.severity} onValueChange={v => setNewIssue(p => ({ ...p, severity: v }))}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                            {["low", "medium", "high", "critical"].map(s => (
                              <SelectItem key={s} value={s} className="text-white capitalize">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-slate-400">Entity Type</Label>
                        <Select value={newIssue.entityType} onValueChange={v => setNewIssue(p => ({ ...p, entityType: v }))}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                            {["deliverable", "campaign", "proposal", "document", "asset", "report"].map(t => (
                              <SelectItem key={t} value={t} className="text-white capitalize">{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button className="btn-premium text-white text-sm" onClick={handleCreate} disabled={createQI.isPending}>
                        {createQI.isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}Create Issue
                      </Button>
                      <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
                    </div>
                  </div>
                </GlassCard>
              )}

              {issueList.length === 0 ? (
                <GlassCard className="py-12 flex flex-col items-center gap-3">
                  <ShieldCheck className="h-12 w-12 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No quality issues yet. Click "New Review" to create one.</p>
                </GlassCard>
              ) : (
                issueList.map((review: any) => (
                  <GlassCard key={review.id} className="hover:border-white/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-sm font-semibold">{review.title}</h3>
                          <StatusBadge
                            variant={review.status === "approved" || review.status === "resolved" ? "success" : review.status === "rejected" ? "critical" : review.status === "in_review" ? "warning" : "pending"}
                            label={(review.status ?? "open").replace(/_/g, " ")}
                          />
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="capitalize">{review.domain}</span>
                          {review.reportedBy && <span>By: {review.reportedBy ?? review.reported_by}</span>}
                          <Badge variant="outline" className="text-[9px] capitalize">{review.severity}</Badge>
                        </div>
                        {review.description && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{review.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {review.score != null && (
                          <div className={`text-lg font-bold ${review.score >= 80 ? "text-green-400" : review.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                            {review.score}
                          </div>
                        )}
                        {(review.status === "open" || review.status === "pending" || review.status === "in_review") && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2"
                              disabled={updateQI.isPending}
                              onClick={() => updateQI.mutate({ id: review.id, data: { status: "approved", score: 85 } }, { onSuccess: () => toast({ title: "Issue approved" }) })}>
                              <ThumbsUp className="h-3.5 w-3.5 text-green-400 mr-1" />Approve
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2"
                              disabled={updateQI.isPending}
                              onClick={() => updateQI.mutate({ id: review.id, data: { status: "rejected", score: 40 } }, { onSuccess: () => toast({ title: "Issue rejected" }) })}>
                              <ThumbsDown className="h-3.5 w-3.5 text-red-400 mr-1" />Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                ))
              )}
            </div>
          )}

          {activeTab === "gates" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {qualityGates.map(gate => (
                <GlassCard key={gate.id}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">{gate.name}</h3>
                    <StatusBadge variant={gate.required ? "critical" : "pending"} label={gate.required ? "Required" : "Optional"} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 capitalize">{gate.domain}</p>
                  <div className="space-y-1">
                    {gate.checks.map((check, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-slate-800/30">
                        <CheckCircle2 className="h-3 w-3 text-slate-500" />
                        <span>{check}</span>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              ))}
            </div>
          )}

          {activeTab === "scoring" && (
            <div className="space-y-4">
              <GlassCard>
                <h3 className="text-sm font-semibold mb-4">Quality Score Distribution by Domain</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {["marketing", "crm", "production", "outreach", "finance", "communications"].map(domain => {
                    const domainIssues = issueList.filter((r: any) => r.domain === domain && r.score);
                    const avg = domainIssues.length ? Math.round(domainIssues.reduce((s: number, r: any) => s + (r.score ?? 0), 0) / domainIssues.length) : 0;
                    const count = issueList.filter((r: any) => r.domain === domain).length;
                    return (
                      <div key={domain} className="p-3 rounded-lg glass-surface">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="text-xs font-medium capitalize">{domain}</span>
                            <p className="text-[10px] text-muted-foreground">{count} issues</p>
                          </div>
                          <span className={`text-sm font-bold ${avg >= 80 ? "text-green-400" : avg >= 60 ? "text-yellow-400" : avg > 0 ? "text-red-400" : "text-slate-500"}`}>{avg || "—"}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${avg >= 80 ? "bg-green-500" : avg >= 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${avg}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </div>
          )}

          {activeTab === "checklists" && (
            <div className="space-y-4">
              <GlassCard>
                <h3 className="text-sm font-semibold mb-4">Standard Review Checklists</h3>
                <div className="space-y-3">
                  {qualityGates.map(gate => (
                    <div key={gate.id} className="p-3 rounded-lg glass-surface">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold">{gate.name}</h4>
                        <span className="text-[10px] text-muted-foreground">{gate.checks.length} checks</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {gate.checks.map((check, i) => (
                          <label key={i} className="flex items-center gap-2 text-xs p-1 cursor-pointer hover:bg-white/5 rounded">
                            <input type="checkbox" className="rounded border-white/20 bg-white/5" />
                            <span>{check}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          )}
        </motion.div>
      </ModeAwareWrapper>
    </div>
  );
}
