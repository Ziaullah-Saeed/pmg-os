import { useState } from "react";
import { useCreateOpportunityMut } from "@/hooks/use-api";
import { useListCompanies, useListContacts } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { X, Briefcase } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateOpportunityForm({ open, onClose }: Props) {
  const { toast } = useToast();
  const create = useCreateOpportunityMut();
  const { data: companies } = useListCompanies();
  const { data: contacts } = useListContacts();
  const [form, setForm] = useState({
    title: "",
    companyId: "",
    contactId: "",
    value: "",
    probability: "50",
    stage: "discovery",
    priority: "medium",
    notes: "",
  });

  if (!open) return null;

  const companyList = (companies ?? []) as any[];
  const contactList = (contacts ?? []) as any[];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast({ title: "Error", description: "Deal title is required", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({
        title: form.title,
        companyId: form.companyId ? Number(form.companyId) : undefined,
        contactId: form.contactId ? Number(form.contactId) : undefined,
        value: form.value ? Number(form.value) : undefined,
        probability: Number(form.probability),
        stage: form.stage,
        priority: form.priority,
        notes: form.notes || undefined,
      });
      toast({ title: "Deal Created", description: `${form.title} added to pipeline` });
      setForm({ title: "", companyId: "", contactId: "", value: "", probability: "50", stage: "discovery", priority: "medium", notes: "" });
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[hsl(214,65%,6%)] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-crimson" />
            <h2 className="text-lg font-semibold text-white">New Deal</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Deal Title *</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Annual Security Audit" className="bg-white/5 border-white/10" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Company</label>
              <Select value={form.companyId} onValueChange={(v) => setForm({ ...form, companyId: v })}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companyList.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Contact</label>
              <Select value={form.contactId} onValueChange={(v) => setForm({ ...form, contactId: v })}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select contact" /></SelectTrigger>
                <SelectContent>
                  {contactList.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.firstName} {c.lastName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Value ($)</label>
              <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="50000" className="bg-white/5 border-white/10" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Probability (%)</label>
              <Input type="number" min="0" max="100" value={form.probability} onChange={(e) => setForm({ ...form, probability: e.target.value })} className="bg-white/5 border-white/10" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Priority</label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Stage</label>
            <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
              <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="discovery">Discovery</SelectItem>
                <SelectItem value="qualification">Qualification</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional context..."
              rows={3}
              className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-crimson/50 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="text-sm">Cancel</Button>
            <Button type="submit" disabled={create.isPending} className="btn-premium text-white text-sm px-6">
              {create.isPending ? "Creating..." : "Create Deal"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
