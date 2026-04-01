import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessagesSquare, Phone, Video, Mail, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";
import { useListCommunications } from "@workspace/api-client-react";

export default function Communications() {
  const { data: communications } = useListCommunications();
  const commList = communications ?? [];

  const typeIcon: Record<string, React.ReactNode> = {
    call: <Phone className="h-4 w-4" />,
    meeting: <Video className="h-4 w-4" />,
    email: <Mail className="h-4 w-4" />,
  };

  const sentimentColor: Record<string, string> = {
    positive: "text-green-400",
    neutral: "text-yellow-400",
    negative: "text-red-400",
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <MessagesSquare className="h-8 w-8 text-primary" />
          Communications
        </h1>
        <p className="text-muted-foreground mt-1">Call logs, meeting records, and AI coaching notes.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Communications</p>
            <p className="text-2xl font-bold mt-1">{commList.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Calls & Meetings</p>
            <p className="text-2xl font-bold mt-1">
              {commList.filter((c: any) => c.type === 'call' || c.type === 'meeting').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Positive Outcomes</p>
            <p className="text-2xl font-bold mt-1 text-green-400">
              {commList.filter((c: any) => c.sentiment === 'positive').length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Recent Communications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commList.map((comm: any) => (
              <div key={comm.id} className="p-4 rounded-lg border border-border/50 bg-background/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-secondary/50">{typeIcon[comm.type] ?? typeIcon.email}</div>
                    <div>
                      <p className="font-semibold">{comm.subject}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {comm.direction === 'outbound' ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownLeft className="h-3 w-3" />
                        )}
                        <span className="capitalize">{comm.direction}</span>
                        {comm.duration && (
                          <>
                            <Clock className="h-3 w-3 ml-1" />
                            <span>{comm.duration} min</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={sentimentColor[comm.sentiment] ?? ''}>
                      {comm.sentiment}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">{comm.outcome}</Badge>
                  </div>
                </div>
                {comm.summary && (
                  <p className="text-sm text-muted-foreground mt-2">{comm.summary}</p>
                )}
                {comm.next_steps && (
                  <p className="text-sm font-medium text-primary mt-2 flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3" />
                    {comm.next_steps}
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
