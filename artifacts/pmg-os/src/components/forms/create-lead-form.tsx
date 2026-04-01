import { useState } from "react";
import { useCreateLead } from "@/hooks/use-api";
import { useListCompanies, useListContacts } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Bot, Loader2, Sparkles } from "lucide-react";

interface CreateLeadFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateLeadForm({ open, onOpenChange }: CreateLeadFormProps) {
  const { toast } = useToast();
  const createLead = useCreateLead();
  const { data: companies } = useListCompanies();
  const { data: contacts } = useListContacts();

  const [formData, setFormData] = useState({
    companyId: "",
    contactId: "",
    source: "website",
    priority: "medium",
    notes: "",
  });

  const companyList = (companies ?? []) as any[];
  const contactList = (contacts ?? []) as any[];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createLead.mutateAsync({
        companyId: formData.companyId ? parseInt(formData.companyId) : undefined,
        contactId: formData.contactId ? parseInt(formData.contactId) : undefined,
        source: formData.source,
        priority: formData.priority,
        notes: formData.notes || undefined,
      });
      toast({
        title: "Lead Created",
        description: "AI is now enriching and scoring this lead automatically.",
      });
      onOpenChange(false);
      setFormData({ companyId: "", contactId: "", source: "website", priority: "medium", notes: "" });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[hsl(214,65%,6%)] border-white/10">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            New Lead
            <span className="flex items-center gap-1 text-xs bg-crimson-500/20 text-crimson-400 px-2 py-0.5 rounded-full">
              <Bot className="h-3 w-3" />
              AI will auto-enrich & score
            </span>
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Company</Label>
            <Select value={formData.companyId} onValueChange={(v) => setFormData(f => ({ ...f, companyId: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select company..." />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                {companyList.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-white">{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Contact</Label>
            <Select value={formData.contactId} onValueChange={(v) => setFormData(f => ({ ...f, contactId: v }))}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select contact..." />
              </SelectTrigger>
              <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                {contactList.map((c: any) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-white">
                    {c.firstName} {c.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Source</Label>
              <Select value={formData.source} onValueChange={(v) => setFormData(f => ({ ...f, source: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                  {["website", "referral", "linkedin", "cold_outreach", "inbound", "conference", "partner"].map(s => (
                    <SelectItem key={s} value={s} className="text-white">{s.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Priority</Label>
              <Select value={formData.priority} onValueChange={(v) => setFormData(f => ({ ...f, priority: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                  {["low", "medium", "high", "urgent"].map(p => (
                    <SelectItem key={p} value={p} className="text-white">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData(f => ({ ...f, notes: e.target.value }))}
              placeholder="Additional context for AI enrichment..."
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 min-h-[80px]"
            />
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button variant="ghost" className="text-slate-400">Cancel</Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={createLead.isPending}
              className="bg-crimson-600 hover:bg-crimson-700 text-white"
            >
              {createLead.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Create & Auto-Enrich
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
