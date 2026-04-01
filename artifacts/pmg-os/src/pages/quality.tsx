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
import { useToast } from "@/hooks/use-toast";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { ModeIndicatorBanner, ModeAwareWrapper, HumanWorkflowGuide } from "@/components/mode-aware-wrapper";
import {
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, ClipboardList,
  Plus, Search, Filter, BarChart3, FileCheck, Star, ThumbsUp, ThumbsDown
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

const sampleReviews = [
  { id: 1, item: "Q1 Marketing Campaign Brief", domain: "marketing", status: "approved", score: 92, reviewer: "AI Agent", rejectionReason: null, checklist: 6, checklistDone: 6 },
  { id: 2, item: "NetGuard Proposal v2", domain: "crm", status: "needs_revision", score: 68, reviewer: "SherShah K.", rejectionReason: "Pricing needs adjustment for enterprise tier", checklist: 8, checklistDone: 5 },
  { id: 3, item: "LinkedIn Ad Creative Set A", domain: "production", status: "approved", score: 88, reviewer: "AI Agent", rejectionReason: null, checklist: 5, checklistDone: 5 },
  { id: 4, item: "Cold Email Sequence #4", domain: "outreach", status: "rejected", score: 45, reviewer: "AI Agent", rejectionReason: "Too aggressive tone, missing personalization", checklist: 7, checklistDone: 3 },
  { id: 5, item: "Monthly Financial Report", domain: "finance", status: "pending", score: null, reviewer: null, rejectionReason: null, checklist: 4, checklistDone: 0 },
];

export default function Quality() {
  const [activeTab, setActiveTab] = useState("reviews");
  const [showCreate, setShowCreate] = useState(false);
  const { isHuman } = useAiModeContext();
  const { toast } = useToast();

  const approved = sampleReviews.filter(r => r.status === "approved").length;
  const rejected = sampleReviews.filter(r => r.status === "rejected").length;
  const pending = sampleReviews.filter(r => r.status === "pending").length;
  const avgScore = sampleReviews.filter(r => r.score).reduce((s, r) => s + (r.score ?? 0), 0) / sampleReviews.filter(r => r.score).length || 0;

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
        <KpiCard label="Avg Score" value={Math.round(avgScore)} icon={<Star className="h-4 w-4" />} accent="blue" />
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
              {sampleReviews.map(review => (
                <GlassCard key={review.id} className="hover:border-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-semibold">{review.item}</h3>
                        <StatusBadge
                          variant={review.status === "approved" ? "success" : review.status === "rejected" ? "critical" : review.status === "needs_revision" ? "warning" : "pending"}
                          label={review.status.replace("_", " ")}
                        />
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="capitalize">{review.domain}</span>
                        {review.reviewer && <span>Reviewer: {review.reviewer}</span>}
                        <span>Checklist: {review.checklistDone}/{review.checklist}</span>
                      </div>
                      {review.rejectionReason && (
                        <p className="text-xs text-crimson/80 mt-1.5 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />{review.rejectionReason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {review.score !== null && (
                        <div className={`text-lg font-bold ${review.score >= 80 ? "text-green-400" : review.score >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                          {review.score}
                        </div>
                      )}
                      {review.status === "pending" && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => toast({ title: "Review started" })}>
                            <ThumbsUp className="h-3.5 w-3.5 text-green-400 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => toast({ title: "Item rejected" })}>
                            <ThumbsDown className="h-3.5 w-3.5 text-red-400 mr-1" />Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
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
                <h3 className="text-sm font-semibold mb-4">Quality Score Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {["marketing", "crm", "production", "outreach", "finance"].map(domain => {
                    const domainReviews = sampleReviews.filter(r => r.domain === domain && r.score);
                    const avg = domainReviews.length ? Math.round(domainReviews.reduce((s, r) => s + (r.score ?? 0), 0) / domainReviews.length) : 0;
                    return (
                      <div key={domain} className="p-3 rounded-lg glass-surface">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground capitalize">{domain}</span>
                          <span className={`text-sm font-bold ${avg >= 80 ? "text-green-400" : avg >= 60 ? "text-yellow-400" : "text-red-400"}`}>{avg || "—"}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className={`h-full rounded-full ${avg >= 80 ? "bg-green-500" : avg >= 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${avg}%` }} />
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
