import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Palette, FileText, CheckCircle2, Clock, Edit, Plus, Eye, RotateCcw, ArrowRight, Sparkles, History, Ban } from "lucide-react";
import { useListDocuments } from "@workspace/api-client-react";
import { motion } from "framer-motion";

const lifecycleStages = ['generate', 'preview', 'review', 'revise', 'approve', 'finalize'] as const;
const stageColors: Record<string, string> = {
  generate: 'bg-blue-500/20 text-blue-400', preview: 'bg-yellow-500/20 text-yellow-400',
  review: 'bg-orange-500/20 text-orange-400', revise: 'bg-red-500/20 text-red-400',
  approve: 'bg-green-500/20 text-green-400', finalize: 'bg-primary/20 text-primary',
};

function mapDocStatus(status: string): string {
  if (status === 'draft') return 'generate';
  if (status === 'pending' || status === 'in_review') return 'review';
  if (status === 'approved') return 'approve';
  if (status === 'published') return 'finalize';
  return 'generate';
}

export default function Production() {
  const [activeTab, setActiveTab] = useState("queue");
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const { data: documents } = useListDocuments();
  const docList = (documents ?? []) as any[];

  const enriched = docList.map(d => ({ ...d, lifecycle: mapDocStatus(d.status) }));
  const byStage = lifecycleStages.reduce((acc, s) => { acc[s] = enriched.filter(d => d.lifecycle === s); return acc; }, {} as Record<string, any[]>);

  return (
    <motion.div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Palette className="h-8 w-8 text-primary" />
            Production Studio
          </h1>
          <p className="text-muted-foreground mt-1">Asset lifecycle management: Generate → Preview → Review → Revise → Approve → Finalize.</p>
        </div>
        <NewAssetDialog />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {lifecycleStages.map(stage => (
          <Card key={stage} className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold">{byStage[stage]?.length ?? 0}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider capitalize">{stage}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Asset Lifecycle Pipeline</h3>
          </div>
          <div className="flex items-center gap-1 mb-6">
            {lifecycleStages.map((stage, i) => (
              <div key={stage} className="flex items-center gap-1 flex-1">
                <div className={`h-2 rounded-full flex-1 ${byStage[stage]?.length > 0 ? 'bg-primary' : 'bg-muted'}`} />
                {i < lifecycleStages.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[9px] text-muted-foreground">
            {lifecycleStages.map(s => <span key={s} className="capitalize">{s}</span>)}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="queue" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <FileText className="h-4 w-4 mr-2" />Asset Queue
          </TabsTrigger>
          <TabsTrigger value="board" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Palette className="h-4 w-4 mr-2" />Kanban Board
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <History className="h-4 w-4 mr-2" />Version History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-3 mt-6">
          {enriched.map(doc => {
            const stageIdx = lifecycleStages.indexOf(doc.lifecycle as any);
            return (
              <Card key={doc.id} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelectedDoc(doc)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-md bg-secondary/50 shrink-0">
                        {doc.lifecycle === 'finalize' ? <CheckCircle2 className="h-4 w-4 text-green-400" /> :
                         doc.lifecycle === 'review' ? <Eye className="h-4 w-4 text-orange-400" /> :
                         doc.lifecycle === 'generate' ? <Edit className="h-4 w-4 text-blue-400" /> :
                         <Clock className="h-4 w-4 text-yellow-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm">{doc.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{doc.content}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge variant="outline" className="capitalize text-[10px]">{doc.category}</Badge>
                      <Badge variant="secondary" className="capitalize text-[10px]">{doc.type}</Badge>
                      <Badge className={`text-[10px] capitalize ${stageColors[doc.lifecycle] ?? ''}`}>{doc.lifecycle}</Badge>
                      <span className="text-xs text-muted-foreground">v{doc.version}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="board" className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {lifecycleStages.map(stage => (
              <div key={stage} className="space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-border/50">
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground capitalize">{stage}</h3>
                  <span className="bg-muted px-1.5 py-0.5 rounded-full text-[10px] font-medium">{byStage[stage]?.length ?? 0}</span>
                </div>
                {(byStage[stage] ?? []).map((doc: any) => (
                  <Card key={doc.id} className="bg-card/50 border-border/50 hover:border-primary/30 cursor-pointer" onClick={() => setSelectedDoc(doc)}>
                    <CardContent className="p-2.5">
                      <p className="text-xs font-medium truncate">{doc.title}</p>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-[8px] px-1 py-0">{doc.type}</Badge>
                        <span className="text-[8px] text-muted-foreground">v{doc.version}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!byStage[stage] || byStage[stage].length === 0) && (
                  <div className="p-4 border border-dashed border-border/50 rounded-lg text-[10px] text-center text-muted-foreground">Empty</div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-3 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-base">Version History</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {enriched.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                  <div className="flex items-center gap-3">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="text-[10px] text-muted-foreground">Version {doc.version} &bull; {doc.category} &bull; {doc.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] capitalize ${stageColors[doc.lifecycle] ?? ''}`}>{doc.lifecycle}</Badge>
                    <Button variant="ghost" size="sm" className="text-xs h-7"><RotateCcw className="h-3 w-3 mr-1" />Revert</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedDoc && <AssetDetailModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />}
    </motion.div>
  );
}

function NewAssetDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" />Create Asset</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border/50 max-w-lg">
        <DialogHeader><DialogTitle>Create Production Asset</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2"><Label>Asset Title</Label><Input placeholder="e.g., Q2 Campaign Hero Banner" className="bg-background/50" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Type</Label>
              <Select><SelectTrigger className="bg-background/50"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="graphic">Graphic</SelectItem><SelectItem value="video">Video</SelectItem>
                  <SelectItem value="document">Document</SelectItem><SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="email_template">Email Template</SelectItem><SelectItem value="social_post">Social Post</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Category</Label>
              <Select><SelectTrigger className="bg-background/50"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketing">Marketing</SelectItem><SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="internal">Internal</SelectItem><SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Describe the asset requirements..." className="bg-background/50" rows={3} /></div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1"><Sparkles className="h-4 w-4 mr-2" />AI Generate</Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90">Create Asset</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssetDetailModal({ doc, onClose }: any) {
  const stageIdx = lifecycleStages.indexOf(doc.lifecycle);
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border/50 max-w-xl max-h-[85vh] overflow-auto">
        <DialogHeader><DialogTitle>{doc.title}</DialogTitle></DialogHeader>
        <div className="space-y-5 mt-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <Badge className={`capitalize ${stageColors[doc.lifecycle] ?? ''}`}>{doc.lifecycle}</Badge>
              <p className="text-[10px] text-muted-foreground mt-1">Stage</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <p className="text-lg font-bold">v{doc.version}</p>
              <p className="text-[10px] text-muted-foreground">Version</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border/30 text-center">
              <Badge variant="outline" className="capitalize">{doc.type}</Badge>
              <p className="text-[10px] text-muted-foreground mt-1">Type</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Lifecycle Progress</h4>
            <div className="flex items-center gap-1">
              {lifecycleStages.map((s, i) => (
                <div key={s} className="flex items-center gap-1 flex-1">
                  <div className={`h-2 rounded-full flex-1 ${i <= stageIdx ? 'bg-primary' : 'bg-muted'}`} />
                  {i < lifecycleStages.length - 1 && <ArrowRight className={`h-3 w-3 shrink-0 ${i < stageIdx ? 'text-primary' : 'text-muted-foreground'}`} />}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[8px] text-muted-foreground mt-1">
              {lifecycleStages.map(s => <span key={s} className={`capitalize ${s === doc.lifecycle ? 'text-primary font-bold' : ''}`}>{s}</span>)}
            </div>
          </div>

          {doc.content && (
            <div className="p-3 rounded-lg bg-background/50 border border-border/30">
              <p className="text-xs font-semibold mb-1">Content</p>
              <p className="text-sm text-muted-foreground">{doc.content}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1"><Ban className="h-3 w-3 mr-1" />Reject</Button>
            <Button variant="outline" size="sm" className="flex-1"><RotateCcw className="h-3 w-3 mr-1" />Revise</Button>
            <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90"><ArrowRight className="h-3 w-3 mr-1" />Advance</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
