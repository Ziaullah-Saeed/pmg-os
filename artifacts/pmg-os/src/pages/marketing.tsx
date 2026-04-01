import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Users, MousePointerClick, Eye, DollarSign } from "lucide-react";
import { useListCampaigns } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export default function Marketing() {
  const { data: campaigns, isLoading } = useListCampaigns();
  const campaignList = campaigns ?? [];

  const totalLeads = campaignList.reduce((s: number, c: any) => s + (c.leadsGenerated ?? c.leads_generated ?? 0), 0);
  const totalSpent = campaignList.reduce((s: number, c: any) => s + (c.spent ?? 0), 0);
  const totalBudget = campaignList.reduce((s: number, c: any) => s + (c.budget ?? 0), 0);
  const totalImpressions = campaignList.reduce((s: number, c: any) => s + (c.impressions ?? 0), 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Megaphone className="h-8 w-8 text-primary" />
          Marketing & Campaigns
        </h1>
        <p className="text-muted-foreground mt-1">Campaign management and performance tracking.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Leads</p>
                <p className="text-2xl font-bold mt-1 text-primary">{totalLeads}</p>
              </div>
              <Users className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Budget Spent</p>
                <p className="text-2xl font-bold mt-1">${totalSpent.toLocaleString()}</p>
              </div>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Impressions</p>
                <p className="text-2xl font-bold mt-1">{totalImpressions.toLocaleString()}</p>
              </div>
              <Eye className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Campaigns</p>
                <p className="text-2xl font-bold mt-1">{campaignList.length}</p>
              </div>
              <MousePointerClick className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Active Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full bg-muted/20" />)}
            </div>
          ) : campaignList.length ? (
            <div className="space-y-4">
              {campaignList.map((campaign: any) => {
                const leads = campaign.leadsGenerated ?? campaign.leads_generated ?? 0;
                const budgetPct = campaign.budget ? Math.round((campaign.spent ?? 0) / campaign.budget * 100) : 0;
                return (
                  <div key={campaign.id} className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{campaign.name}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{campaign.type} &bull; {campaign.channel}</p>
                        {campaign.targetAudience || campaign.target_audience ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            Target: {campaign.targetAudience ?? campaign.target_audience}
                          </p>
                        ) : null}
                      </div>
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 capitalize">{campaign.status}</Badge>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Leads</p>
                        <p className="font-semibold text-primary">{leads}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Conversions</p>
                        <p className="font-semibold">{campaign.conversions ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Impressions</p>
                        <p className="font-semibold">{(campaign.impressions ?? 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Clicks</p>
                        <p className="font-semibold">{(campaign.clicks ?? 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Budget: ${(campaign.spent ?? 0).toLocaleString()} / ${(campaign.budget ?? 0).toLocaleString()}</span>
                        <span>{budgetPct}%</span>
                      </div>
                      <Progress value={budgetPct} className="h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-muted-foreground text-sm py-8 text-center">No campaigns found</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
