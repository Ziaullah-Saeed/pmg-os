import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Landmark, DollarSign, TrendingUp, FileText } from "lucide-react";
import { useListOpportunities, useListDocuments } from "@workspace/api-client-react";

export default function Finance() {
  const { data: opportunities } = useListOpportunities();
  const { data: documents } = useListDocuments();
  const oppList = opportunities ?? [];
  const docList = (documents ?? []).filter((d: any) => d.category === 'legal');

  const totalPipeline = oppList.reduce((sum: number, o: any) => sum + (o.value ?? 0), 0);
  const weightedRevenue = oppList.reduce((sum: number, o: any) => sum + ((o.value ?? 0) * (o.probability ?? 0) / 100), 0);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Landmark className="h-8 w-8 text-primary" />
          Finance & Legal
        </h1>
        <p className="text-muted-foreground mt-1">Invoices, quotations, profitability, and contracts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold mt-1 text-primary">${totalPipeline.toLocaleString()}</p>
              </div>
              <DollarSign className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Weighted Revenue</p>
                <p className="text-2xl font-bold mt-1 text-green-400">${Math.round(weightedRevenue).toLocaleString()}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Legal Documents</p>
                <p className="text-2xl font-bold mt-1">{docList.length}</p>
              </div>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Revenue by Deal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {oppList.map((opp: any) => (
              <div key={opp.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50">
                <div>
                  <p className="font-semibold">{opp.title}</p>
                  <p className="text-sm text-muted-foreground">{opp.service_type}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-primary">${(opp.value ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Weighted: ${Math.round((opp.value ?? 0) * (opp.probability ?? 0) / 100).toLocaleString()}</p>
                  </div>
                  <Badge variant="secondary" className="capitalize">{opp.stage}</Badge>
                  <span className="text-sm font-medium">{opp.probability}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {docList.length > 0 && (
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardHeader>
            <CardTitle>Legal Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {docList.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{doc.title}</p>
                      <p className="text-sm text-muted-foreground">v{doc.version} &bull; {doc.type}</p>
                    </div>
                  </div>
                  <Badge variant={doc.status === 'approved' ? 'default' : 'secondary'} className="capitalize">{doc.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
