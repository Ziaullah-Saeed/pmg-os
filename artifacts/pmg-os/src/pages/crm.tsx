import { useState } from "react";
import { useListOpportunities, useListLeads, useListCompanies } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import {
  Briefcase, DollarSign, TrendingUp, Users, Phone, FileText,
  ArrowRight, Clock, CheckCircle2, AlertCircle, Sparkles, Plus
} from "lucide-react";

const stages = [
  { id: "new", label: "New", color: "bg-blue-500" },
  { id: "meeting_scheduled", label: "Meeting", color: "bg-info" },
  { id: "discovery", label: "Discovery", color: "bg-gold" },
  { id: "proposal", label: "Proposal", color: "bg-orange-500" },
  { id: "negotiation", label: "Negotiation", color: "bg-crimson" },
  { id: "closed_won", label: "Won", color: "bg-success" },
  { id: "closed_lost", label: "Lost", color: "bg-muted-foreground" },
];

export default function CRM() {
  const { data: opportunities } = useListOpportunities();
  const { data: leads } = useListLeads();
  const { isHuman } = useAiModeContext();

  const oppList = (opportunities ?? []) as any[];
  const leadList = (leads ?? []) as any[];

  const activeDeals = oppList.filter((o: any) => o.stage !== "closed_won" && o.stage !== "closed_lost").length;
  const wonDeals = oppList.filter((o: any) => o.stage === "closed_won").length;
  const totalPipeline = oppList
    .filter((o: any) => o.stage !== "closed_won" && o.stage !== "closed_lost")
    .reduce((s: number, o: any) => s + (o.value ?? o.amount ?? 0), 0);
  const totalWon = oppList
    .filter((o: any) => o.stage === "closed_won")
    .reduce((s: number, o: any) => s + (o.value ?? o.amount ?? 0), 0);

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="CRM Pipeline"
        subtitle="Deal tracking, lead qualification, call intelligence, and proposal management"
        icon={<Briefcase className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button className="btn-premium text-white text-sm">
              <Plus className="h-4 w-4 mr-2" />New Deal
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active Deals" value={activeDeals} icon={<Briefcase className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Won Deals" value={wonDeals} icon={<CheckCircle2 className="h-4 w-4" />} accent="success" />
        <KpiCard label="Pipeline Value" value={`$${(totalPipeline / 1000).toFixed(0)}k`} icon={<TrendingUp className="h-4 w-4" />} accent="crimson" />
        <KpiCard label="Revenue Won" value={`$${(totalWon / 1000).toFixed(0)}k`} icon={<DollarSign className="h-4 w-4" />} accent="gold" />
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Deal Pipeline</h3>
          <Badge variant="outline" className="text-xs">{oppList.length} total deals</Badge>
        </div>

        {oppList.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
            <h3 className="text-sm font-semibold mb-2">Pipeline is Empty</h3>
            <p className="text-xs text-muted-foreground mb-4 max-w-md mx-auto">
              Qualified leads from Outreach will appear here as deals. Start prospecting to fill your pipeline.
            </p>
            <Button className="btn-premium text-white text-sm">
              <ArrowRight className="h-4 w-4 mr-2" />Go to Outreach
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-2">
            {stages.map((stage) => {
              const stageDeals = oppList.filter((o: any) => o.stage === stage.id);
              return (
                <div key={stage.id} className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                    <span className="text-xs font-medium">{stage.label}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">{stageDeals.length}</Badge>
                  </div>
                  {stageDeals.map((deal: any) => (
                    <div key={deal.id} className="p-2 rounded-lg glass-surface cursor-pointer hover:glass-card-interactive text-xs">
                      <p className="font-medium truncate">{deal.title ?? deal.name}</p>
                      <p className="text-crimson font-semibold">${((deal.value ?? deal.amount ?? 0) / 1000).toFixed(0)}k</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard variant="interactive" className="cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg glass-surface text-crimson">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Lead Qualification</p>
              <p className="text-xs text-muted-foreground">Auto-scoring, 5-dimension analysis</p>
            </div>
          </div>
          <Badge variant="outline" className="mt-3 text-xs">Coming in Session 2</Badge>
        </GlassCard>

        <GlassCard variant="interactive" className="cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg glass-surface text-info">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Call Intelligence</p>
              <p className="text-xs text-muted-foreground">Pre-call briefing, coaching cards, transcript analysis</p>
            </div>
          </div>
          <Badge variant="outline" className="mt-3 text-xs">Coming in Session 2</Badge>
        </GlassCard>

        <GlassCard variant="interactive" className="cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg glass-surface text-gold">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Proposals & Contracts</p>
              <p className="text-xs text-muted-foreground">PDF generation, lifecycle tracking</p>
            </div>
          </div>
          <Badge variant="outline" className="mt-3 text-xs">Coming in Session 2</Badge>
        </GlassCard>
      </div>
    </div>
  );
}
