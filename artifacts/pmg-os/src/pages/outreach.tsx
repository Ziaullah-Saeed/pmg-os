import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target, ArrowUpRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { useListLeads } from "@workspace/api-client-react";

export default function Outreach() {
  const { data: leads } = useListLeads();
  const leadList = (leads ?? []) as any[];

  const priorityColor: Record<string, string> = {
    critical: "text-red-400",
    high: "text-orange-400",
    medium: "text-yellow-400",
    low: "text-muted-foreground",
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          Outreach & Prospecting
        </h1>
        <p className="text-muted-foreground mt-1">Target discovery, lead scoring, and sequence management.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Leads</p>
            <p className="text-2xl font-bold mt-1">{leadList.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Qualified</p>
            <p className="text-2xl font-bold mt-1 text-green-400">
              {leadList.filter((l: any) => l.status === 'qualified').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Contacted</p>
            <p className="text-2xl font-bold mt-1 text-blue-400">
              {leadList.filter((l: any) => l.status === 'contacted').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Avg Confidence</p>
            <p className="text-2xl font-bold mt-1 text-primary">
              {leadList.length ? Math.round(leadList.reduce((s: number, l: any) => s + (l.confidenceScore ?? l.confidence_score ?? 0), 0) / leadList.length) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Lead Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {leadList.map((lead: any) => (
              <div key={lead.id} className="p-4 rounded-lg border border-border/50 bg-background/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold uppercase text-xs ${priorityColor[lead.priority] ?? ''}`}>
                      {lead.priority}
                    </span>
                    <Badge variant="secondary" className="capitalize">{lead.status}</Badge>
                    <Badge variant="outline" className="capitalize">{lead.source}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>Fit: <span className="text-primary font-semibold">{lead.fitScore ?? lead.fit_score}%</span></span>
                    <span>Confidence: <span className="font-semibold">{lead.confidenceScore ?? lead.confidence_score}%</span></span>
                  </div>
                </div>
                {(lead.painPoints ?? lead.pain_points) && (
                  <p className="text-sm text-muted-foreground flex items-start gap-2 mt-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-orange-400" />
                    {lead.painPoints ?? lead.pain_points}
                  </p>
                )}
                {(lead.bestAngle ?? lead.best_angle) && (
                  <p className="text-sm text-muted-foreground flex items-start gap-2 mt-1">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-400" />
                    {lead.bestAngle ?? lead.best_angle}
                  </p>
                )}
                {(lead.nextAction ?? lead.next_action) && (
                  <p className="text-sm font-medium flex items-center gap-2 mt-2 text-primary">
                    <ArrowUpRight className="h-4 w-4" />
                    Next: {lead.nextAction ?? lead.next_action}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
