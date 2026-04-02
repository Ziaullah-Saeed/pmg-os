import { useState } from "react";
import { useCreateTaskMut } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Loader2, CheckSquare } from "lucide-react";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }

export function CreateTaskForm({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const create = useCreateTaskMut();
  const [form, setForm] = useState({ title: "", description: "", domain: "execution", priority: "medium", assignedTo: "", dueDate: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    try {
      await create.mutateAsync({ ...form, dueDate: form.dueDate || undefined, assignedTo: form.assignedTo || undefined });
      toast({ title: "Task Created" });
      onOpenChange(false);
      setForm({ title: "", description: "", domain: "execution", priority: "medium", assignedTo: "", dueDate: "" });
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-[hsl(214,65%,6%)] border-white/10">
        <DialogHeader><DialogTitle className="flex items-center gap-2 text-white"><CheckSquare className="h-4 w-4" />New Task</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label className="text-slate-300">Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="bg-white/5 border-white/10 text-white" placeholder="Complete project proposal" /></div>
          <div className="space-y-2"><Label className="text-slate-300">Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-white/5 border-white/10 text-white min-h-[80px]" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-slate-300">Domain</Label>
              <Select value={form.domain} onValueChange={v => setForm(f => ({ ...f, domain: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                  {["execution", "crm", "marketing", "production", "intelligence", "outreach", "communications", "finance", "reports", "system"].map(d => <SelectItem key={d} value={d} className="text-white capitalize">{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="text-slate-300">Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[hsl(214,65%,8%)] border-white/10">
                  {["low", "medium", "high", "urgent"].map(p => <SelectItem key={p} value={p} className="text-white capitalize">{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label className="text-slate-300">Assignee</Label><Input value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))} className="bg-white/5 border-white/10 text-white" /></div>
            <div className="space-y-2"><Label className="text-slate-300">Due Date</Label><Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} className="bg-white/5 border-white/10 text-white" /></div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="ghost" className="text-slate-400">Cancel</Button></DialogClose>
            <Button type="submit" disabled={create.isPending} className="bg-crimson-600 hover:bg-crimson-700 text-white">
              {create.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Creating...</> : <><CheckSquare className="h-4 w-4 mr-2" />Create Task</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
