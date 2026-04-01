import { useState } from "react";
import { useCreateContactMut } from "@/hooks/use-api";
import { useListCompanies } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2, User } from "lucide-react";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }

export function CreateContactForm({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const create = useCreateContactMut();
  const { data: companies } = useListCompanies();
  const companyList = (companies ?? []) as any[];
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", title: "", companyId: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim()) { toast({ title: "First name is required", variant: "destructive" }); return; }
    try {
      await create.mutateAsync({ ...form, companyId: form.companyId ? parseInt(form.companyId) : undefined });
      toast({ title: "Contact Created" });
      onOpenChange(false);
      setForm({ firstName: "", lastName: "", email: "", phone: "", title: "", companyId: "" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[hsl(214,65%,6%)] border-white/10">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-white"><User className="h-4 w-4" />New Contact</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-slate-300">First Name *</Label><Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className="bg-white/5 border-white/10 text-white" /></div>
            <div className="space-y-2"><Label className="text-slate-300">Last Name</Label><Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className="bg-white/5 border-white/10 text-white" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-slate-300">Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="bg-white/5 border-white/10 text-white" /></div>
            <div className="space-y-2"><Label className="text-slate-300">Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="bg-white/5 border-white/10 text-white" /></div>
          </div>
          <div className="space-y-2"><Label className="text-slate-300">Job Title</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-white/5 border-white/10 text-white" /></div>
          <div className="space-y-2"><Label className="text-slate-300">Company</Label>
            <Select value={form.companyId} onValueChange={v => setForm(f => ({ ...f, companyId: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue placeholder="Select company..." /></SelectTrigger>
              <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                {companyList.map((c: any) => <SelectItem key={c.id} value={String(c.id)} className="text-white">{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="ghost" className="text-slate-400">Cancel</Button></DialogClose>
            <Button type="submit" disabled={create.isPending} className="bg-crimson-600 hover:bg-crimson-700 text-white">
              {create.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><User className="h-4 w-4 mr-2" />Create Contact</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
