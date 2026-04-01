import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, FileText, CheckCircle2, Clock, Edit } from "lucide-react";
import { useListDocuments } from "@workspace/api-client-react";

export default function Production() {
  const { data: documents } = useListDocuments();
  const docList = documents ?? [];

  const statusIcon: Record<string, React.ReactNode> = {
    draft: <Edit className="h-4 w-4 text-yellow-400" />,
    approved: <CheckCircle2 className="h-4 w-4 text-green-400" />,
    published: <CheckCircle2 className="h-4 w-4 text-blue-400" />,
    pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Palette className="h-8 w-8 text-primary" />
          Production Studio
        </h1>
        <p className="text-muted-foreground mt-1">Asset generation queue and brand materials.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Total Assets</p>
            <p className="text-2xl font-bold mt-1">{docList.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Published</p>
            <p className="text-2xl font-bold mt-1 text-green-400">
              {docList.filter((d: any) => d.status === 'published' || d.status === 'approved').length}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">In Draft</p>
            <p className="text-2xl font-bold mt-1 text-yellow-400">
              {docList.filter((d: any) => d.status === 'draft').length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Asset Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {docList.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50">
                <div className="flex items-center gap-3">
                  {statusIcon[doc.status] ?? <FileText className="h-4 w-4" />}
                  <div>
                    <p className="font-semibold">{doc.title}</p>
                    <p className="text-sm text-muted-foreground">{doc.content}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">{doc.category}</Badge>
                  <Badge variant="secondary" className="capitalize">{doc.type}</Badge>
                  <span className="text-xs text-muted-foreground">v{doc.version}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
