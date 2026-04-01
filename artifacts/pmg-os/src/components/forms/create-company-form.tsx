import { useState } from "react";
import { useCreateCompanyMut } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2, Building2 } from "lucide-react";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }

export function CreateCompanyForm({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const create = useCreateCompanyMut();
  const [form, setForm] = useState({ name: "", industry: "", size: "", website: "", status: "prospect" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    try {
      await create.mutateAsync(form);
      toast({ title: "Company Created" });
      onOpenChange(false);
      setForm({ name: "", industry: "", size: "", website: "", status: "prospect" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[hsl(214,65%,6%)] border-white/10">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-white"><Building2 className="h-4 w-4" />New Company</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label className="text-slate-300">Company Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" placeholder="Acme Corp" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-slate-300">Industry</Label><Input value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} className="bg-white/5 border-white/10 text-white" placeholder="Technology" /></div>
            <div className="space-y-2"><Label className="text-slate-300">Size</Label>
              <Select value={form.size} onValueChange={v => setForm(f => ({ ...f, size: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Select size" /></SelectTrigger>
                <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                  {["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"].map(s => <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label className="text-slate-300">Website</Label><Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="bg-white/5 border-white/10 text-white" placeholder="https://example.com" /></div>
          <div className="space-y-2"><Label className="text-slate-300">Status</Label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                {["prospect", "active", "inactive", "churned"].map(s => <SelectItem key={s} value={s} className="text-white capitalize">{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="ghost" className="text-slate-400">Cancel</Button></DialogClose>
            <Button type="submit" disabled={create.isPending} className="bg-crimson-600 hover:bg-crimson-700 text-white">
              {create.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><Building2 className="h-4 w-4 mr-2" />Create Company</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
