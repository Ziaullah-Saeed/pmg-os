import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileBox, FileText, Search, Tag } from "lucide-react";
import { useListDocuments } from "@workspace/api-client-react";

export default function Reports() {
  const { data: documents } = useListDocuments();
  const docList = documents ?? [];

  const categories = [...new Set(docList.map((d: any) => d.category))];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <FileBox className="h-8 w-8 text-primary" />
          Reports & Archive
        </h1>
        <p className="text-muted-foreground mt-1">Document repository and knowledge base.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold mt-1">{docList.length}</p>
              </div>
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold mt-1">{categories.length}</p>
              </div>
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold mt-1 text-green-400">
                  {docList.filter((d: any) => d.status === 'published' || d.status === 'approved').length}
                </p>
              </div>
              <Tag className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Document Repository</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {docList.map((doc: any) => (
              <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-background/50">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">{doc.title}</p>
                    <p className="text-sm text-muted-foreground">{doc.content}</p>
                    {doc.tags && (
                      <div className="flex gap-1 mt-1">
                        {doc.tags.split(',').map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag.trim()}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="capitalize">{doc.category}</Badge>
                  <Badge variant={doc.status === 'published' || doc.status === 'approved' ? 'default' : 'secondary'} className="capitalize">
                    {doc.status}
                  </Badge>
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
