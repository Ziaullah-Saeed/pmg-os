import { useState } from "react";
import { useCreateCampaignMut } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2, Megaphone } from "lucide-react";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }

export function CreateCampaignForm({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const create = useCreateCampaignMut();
  const [form, setForm] = useState({ name: "", type: "email", status: "draft", budget: "", description: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    try {
      await create.mutateAsync({ ...form, budget: form.budget ? parseFloat(form.budget) : undefined });
      toast({ title: "Campaign Created" });
      onOpenChange(false);
      setForm({ name: "", type: "email", status: "draft", budget: "", description: "" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[hsl(214,65%,6%)] border-white/10">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-white"><Megaphone className="h-4 w-4" />New Campaign</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label className="text-slate-300">Campaign Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-white/5 border-white/10 text-white" placeholder="Q2 Email Outreach" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-slate-300">Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                  {["email", "social", "content", "event", "paid_ads", "referral", "webinar"].map(t => <SelectItem key={t} value={t} className="text-white capitalize">{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-slate-300">Budget ($)</Label><Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} className="bg-white/5 border-white/10 text-white" placeholder="5000" /></div>
          </div>
          <div className="space-y-2"><Label className="text-slate-300">Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-white/5 border-white/10 text-white min-h-[80px]" /></div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="ghost" className="text-slate-400">Cancel</Button></DialogClose>
            <Button type="submit" disabled={create.isPending} className="bg-crimson-600 hover:bg-crimson-700 text-white">
              {create.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><Megaphone className="h-4 w-4 mr-2" />Create Campaign</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
