import { useState } from "react";
import { useCreateDocument } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2, FileText } from "lucide-react";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }

const categories = ["Marketing", "Sales", "Legal", "Operations", "Intelligence", "Technical", "HR"];
const types = ["proposal", "case_study", "whitepaper", "blog_post", "social_media", "email_template", "contract", "report", "presentation", "sop"];

export function CreateDocumentForm({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const create = useCreateDocument();
  const [form, setForm] = useState({ title: "", category: "", type: "", content: "", tags: "", notes: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!form.category) { toast({ title: "Category is required", variant: "destructive" }); return; }
    if (!form.type) { toast({ title: "Type is required", variant: "destructive" }); return; }
    try {
      await create.mutateAsync({ data: { ...form, status: "draft", createdBy: "PMG Team" } });
      toast({ title: "Asset Created" });
      onOpenChange(false);
      setForm({ title: "", category: "", type: "", content: "", tags: "", notes: "" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[hsl(214,65%,6%)] border-white/10">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-white"><FileText className="h-4 w-4" />Create New Asset</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label className="text-slate-300">Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-white/5 border-white/10 text-white" placeholder="Asset title..." /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-slate-300">Category *</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                  {categories.map(c => <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-slate-300">Type *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                  {types.map(t => <SelectItem key={t} value={t} className="text-white capitalize">{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label className="text-slate-300">Content</Label><Textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} className="bg-white/5 border-white/10 text-white h-20 resize-none" placeholder="Initial content or brief..." /></div>
          <div className="space-y-2"><Label className="text-slate-300">Tags</Label><Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} className="bg-white/5 border-white/10 text-white" placeholder="cybersecurity, mssp, case-study" /></div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="ghost" className="text-slate-400">Cancel</Button></DialogClose>
            <Button type="submit" disabled={create.isPending} className="bg-crimson-600 hover:bg-crimson-700 text-white">
              {create.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><FileText className="h-4 w-4 mr-2" />Create Asset</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
