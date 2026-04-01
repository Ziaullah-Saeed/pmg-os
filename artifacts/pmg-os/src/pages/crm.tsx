import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react";
import { useListOpportunities } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function CRM() {
  const { data: opportunities, isLoading } = useListOpportunities();

  return (
    <div className="p-6 md:p-8 max-w-full mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Briefcase className="h-8 w-8 text-primary" />
          CRM Pipeline
        </h1>
        <p className="text-muted-foreground mt-1">Opportunity tracking and deal management.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-96 w-full bg-muted/20" />)}
        </div>
      ) : (
         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['Discovery', 'Qualification', 'Proposal', 'Negotiation'].map(stage => {
              const stageOpps = opportunities?.filter(o => o.stage.toLowerCase() === stage.toLowerCase()) || [];
              
              return (
                <div key={stage} className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/50">
                    <h3 className="font-semibold text-sm tracking-wide uppercase text-muted-foreground">{stage}</h3>
                    <span className="bg-muted px-2 py-0.5 rounded-full text-xs font-medium">{stageOpps.length}</span>
                  </div>
                  
                  <div className="space-y-3">
                    {stageOpps.map(opp => (
                      <Card key={opp.id} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-colors cursor-pointer">
                        <CardContent className="p-4 space-y-2">
                          <div className="font-medium">{opp.title}</div>
                          <div className="text-sm text-muted-foreground">{opp.companyName}</div>
                          <div className="flex justify-between items-center text-xs mt-4 pt-2 border-t border-border/30">
                            <span className="text-primary font-medium">${opp.value.toLocaleString()}</span>
                            <span>{opp.probability}%</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {stageOpps.length === 0 && (
                      <div className="p-4 border border-dashed border-border/50 rounded-lg text-center text-xs text-muted-foreground bg-background/20">
                        No deals
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
         </div>
      )}
    </div>
  );
}