import { useState } from "react";
import { useListDocuments } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { DetailDrawer } from "@/components/ui/detail-drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import { useUpdateDocumentMut } from "@/hooks/use-api";
import { ModeAwareWrapper, ModeIndicatorBanner, HumanWorkflowGuide } from "@/components/mode-aware-wrapper";
import {
  Palette, FileText, CheckCircle2, Clock, Edit, Plus, Eye,
  RotateCcw, ArrowRight, Sparkles, History, Ban
} from "lucide-react";
import { CreateDocumentForm } from "@/components/forms/create-document-form";

const lifecycleStages = ["generate", "preview", "review", "revise", "approve", "finalize"] as const;
const statusForStage: Record<string, string> = { generate: "draft", preview: "draft", review: "in_review", revise: "draft", approve: "approved", finalize: "published" };

function mapDocStatus(status: string): string {
  if (status === "draft") return "generate";
  if (status === "pending" || status === "in_review") return "review";
  if (status === "approved") return "approve";
  if (status === "published") return "finalize";
  return "generate";
}

function nextStage(current: string): string | null {
  const idx = lifecycleStages.indexOf(current as any);
  if (idx >= 0 && idx < lifecycleStages.length - 1) return lifecycleStages[idx + 1];
  return null;
}

const tabs = [
  { id: "queue", label: "Asset Queue", icon: <FileText className="h-3.5 w-3.5" /> },
  { id: "board", label: "Kanban Board", icon: <Palette className="h-3.5 w-3.5" /> },
  { id: "history", label: "Version History", icon: <History className="h-3.5 w-3.5" /> },
];

export default function Production() {
  const [activeTab, setActiveTab] = useState("queue");
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [showCreateDoc, setShowCreateDoc] = useState(false);
  const { data: documents } = useListDocuments();
  const { isHuman } = useAiModeContext();
  const updateDoc = useUpdateDocumentMut();
  const docList = (documents ?? []) as any[];

  const enriched = docList.map((d) => ({ ...d, lifecycle: mapDocStatus(d.status) }));
  const byStage = lifecycleStages.reduce((acc, s) => { acc[s] = enriched.filter((d) => d.lifecycle === s); return acc; }, {} as Record<string, any[]>);

  function handleAdvance(doc: any) {
    const next = nextStage(doc.lifecycle);
    if (!next) return;
    const newStatus = statusForStage[next] || "draft";
    updateDoc.mutate({ id: doc.id, data: { status: newStatus } }, {
      onSuccess: () => setSelectedDoc(null),
    });
  }

  function handleReject(doc: any) {
    updateDoc.mutate({ id: doc.id, data: { status: "draft" } }, {
      onSuccess: () => setSelectedDoc(null),
    });
  }

  function handleRevise(doc: any) {
    updateDoc.mutate({ id: doc.id, data: { status: "draft" } }, {
      onSuccess: () => setSelectedDoc(null),
    });
  }

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Production Studio"
        subtitle="Asset lifecycle management: Generate > Preview > Review > Revise > Approve > Finalize"
        icon={<Palette className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button className="btn-premium text-white text-sm px-4 py-2 rounded-lg"><Sparkles className="h-4 w-4 mr-2" />AI Generate</Button>
            <Button className="btn-glass text-foreground text-sm px-4 py-2 rounded-lg" onClick={() => setShowCreateDoc(true)}><Plus className="h-4 w-4 mr-2" />Create Asset</Button>
          </div>
        }
      />

      <ModeIndicatorBanner />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {lifecycleStages.map((stage) => (
          <KpiCard key={stage} label={stage.charAt(0).toUpperCase() + stage.slice(1)} value={byStage[stage]?.length ?? 0} accent={stage === "finalize" ? "success" : stage === "review" ? "gold" : stage === "generate" ? "blue" : "default"} />
        ))}
      </div>

      <ModeAwareWrapper
        domain="production"
        humanContent={
          <div className="space-y-6">
            <HumanWorkflowGuide title="Asset Production Workflow" steps={[
              { id: "1", title: "Brief & Requirements", description: "Define asset type, audience, messaging, and brand guidelines", status: "current" as const, action: "Create Brief" },
              { id: "2", title: "Draft Content", description: "Write copy, create designs, or record video — manual creation", status: "upcoming" as const },
              { id: "3", title: "Internal Review", description: "Submit for team review, collect feedback, and address comments", status: "upcoming" as const },
              { id: "4", title: "Revisions", description: "Apply requested changes and re-submit for approval", status: "upcoming" as const },
              { id: "5", title: "Final Approval", description: "Get stakeholder sign-off and mark asset as finalized", status: "upcoming" as const },
            ]} icon={<Palette className="h-5 w-5 text-blue-400" />} />
            <GlassCard>
              <h3 className="text-sm font-semibold mb-3">Assets in Pipeline ({docList.length})</h3>
              <div className="space-y-2">
                {enriched.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 cursor-pointer" onClick={() => setSelectedDoc(doc)}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.title}</p>
                        <p className="text-[10px] text-muted-foreground">{doc.category} · Stage: {doc.lifecycle}</p>
                      </div>
                    </div>
                    <StatusBadge variant={doc.lifecycle === "finalize" ? "ai-approved" : doc.lifecycle === "review" ? "pending" : "ai-recommended"} label={doc.lifecycle} />
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>
        }
      >
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Asset Lifecycle Pipeline</h3>
          <StatusBadge variant="ai-executed" label="Mandatory Flow" />
        </div>
        <div className="flex items-center gap-1 mb-2">
          {lifecycleStages.map((stage, i) => (
            <div key={stage} className="flex items-center gap-1 flex-1">
              <div className={`h-2 rounded-full flex-1 ${(byStage[stage]?.length ?? 0) > 0 ? "bg-crimson" : "bg-muted"}`} />
              {i < lifecycleStages.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground">
          {lifecycleStages.map((s) => <span key={s} className="capitalize">{s}</span>)}
        </div>
      </GlassCard>

      <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeTab === "queue" && (
          <div className="space-y-3">
            {enriched.map((doc) => (
              <GlassCard key={doc.id} variant="interactive" className="cursor-pointer" onClick={() => setSelectedDoc(doc)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg glass-surface shrink-0">
                      {doc.lifecycle === "finalize" ? <CheckCircle2 className="h-4 w-4 text-success" /> :
                       doc.lifecycle === "review" ? <Eye className="h-4 w-4 text-warning" /> :
                       doc.lifecycle === "generate" ? <Edit className="h-4 w-4 text-info" /> :
                       <Clock className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{doc.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{doc.content}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge variant="outline" className="capitalize text-[10px]">{doc.category}</Badge>
                    <StatusBadge variant={doc.lifecycle === "finalize" ? "human-approved" : doc.lifecycle === "review" ? "awaiting-review" : "draft"} label={doc.lifecycle} />
                    <span className="text-xs text-muted-foreground tabular-nums">v{doc.version}</span>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        {activeTab === "board" && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {lifecycleStages.map((stage) => (
              <div key={stage} className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <h3 className="kpi-label capitalize">{stage}</h3>
                  <span className="text-xs px-1.5 py-0.5 rounded-full glass-surface font-medium">{byStage[stage]?.length ?? 0}</span>
                </div>
                {(byStage[stage] ?? []).map((doc: any) => (
                  <GlassCard key={doc.id} variant="interactive" className="cursor-pointer !p-2.5" onClick={() => setSelectedDoc(doc)}>
                    <p className="text-xs font-medium truncate">{doc.title}</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-[8px] px-1 py-0">{doc.type}</Badge>
                      <span className="text-[8px] text-muted-foreground">v{doc.version}</span>
                    </div>
                  </GlassCard>
                ))}
                {(!byStage[stage] || byStage[stage].length === 0) && (
                  <div className="p-4 border border-dashed border-border/30 rounded-lg text-[10px] text-center text-muted-foreground">Empty</div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "history" && (
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Version History</h3></div>
            <div className="px-5 pb-4 space-y-2">
              {enriched.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                  <div className="flex items-center gap-3">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="text-[10px] text-muted-foreground">Version {doc.version} &bull; {doc.category} &bull; {doc.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={doc.lifecycle === "finalize" ? "human-approved" : "draft"} label={doc.lifecycle} />
                    <Button className="btn-glass text-foreground text-xs px-2 py-1 rounded-lg" onClick={() => handleRevise(doc)} disabled={updateDoc.isPending}><RotateCcw className="h-3 w-3 mr-1" />Revert</Button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </motion.div>
      </ModeAwareWrapper>

      <DetailDrawer open={!!selectedDoc} onClose={() => setSelectedDoc(null)} title={selectedDoc?.title} subtitle={`${selectedDoc?.type} • v${selectedDoc?.version}`}>
        {selectedDoc && (() => {
          const stageIdx = lifecycleStages.indexOf(selectedDoc.lifecycle);
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg glass-surface text-center">
                  <StatusBadge variant={selectedDoc.lifecycle === "finalize" ? "human-approved" : "awaiting-review"} label={selectedDoc.lifecycle} />
                  <p className="text-[10px] text-muted-foreground mt-1">Stage</p>
                </div>
                <div className="p-3 rounded-lg glass-surface text-center">
                  <p className="text-lg font-bold">v{selectedDoc.version}</p>
                  <p className="text-[10px] text-muted-foreground">Version</p>
                </div>
                <div className="p-3 rounded-lg glass-surface text-center">
                  <Badge variant="outline" className="capitalize">{selectedDoc.type}</Badge>
                  <p className="text-[10px] text-muted-foreground mt-1">Type</p>
                </div>
              </div>
              <div>
                <h4 className="section-header mb-2">Lifecycle Progress</h4>
                <div className="flex items-center gap-1">
                  {lifecycleStages.map((s, i) => (
                    <div key={s} className="flex items-center gap-1 flex-1">
                      <div className={`h-2 rounded-full flex-1 ${i <= stageIdx ? "bg-crimson" : "bg-muted"}`} />
                      {i < lifecycleStages.length - 1 && <ArrowRight className={`h-3 w-3 shrink-0 ${i < stageIdx ? "text-crimson" : "text-muted-foreground"}`} />}
                    </div>
                  ))}
                </div>
              </div>
              {selectedDoc.content && (
                <GlassCard><p className="text-xs font-semibold mb-1">Content</p><p className="text-sm text-muted-foreground">{selectedDoc.content}</p></GlassCard>
              )}
              {selectedDoc.lifecycle !== "finalize" && (
                <div className="flex gap-2">
                  <Button className="btn-glass text-crimson flex-1 text-sm rounded-lg" onClick={() => handleReject(selectedDoc)} disabled={updateDoc.isPending}><Ban className="h-3 w-3 mr-1" />Reject</Button>
                  <Button className="btn-glass text-foreground flex-1 text-sm rounded-lg" onClick={() => handleRevise(selectedDoc)} disabled={updateDoc.isPending}><RotateCcw className="h-3 w-3 mr-1" />Revise</Button>
                  <Button className="btn-premium text-white flex-1 text-sm rounded-lg" onClick={() => handleAdvance(selectedDoc)} disabled={updateDoc.isPending}><ArrowRight className="h-3 w-3 mr-1" />Advance</Button>
                </div>
              )}
            </div>
          );
        })()}
      </DetailDrawer>

      <CreateDocumentForm open={showCreateDoc} onOpenChange={setShowCreateDoc} />
    </div>
  );
}
