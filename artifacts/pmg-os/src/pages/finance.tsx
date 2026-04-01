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
import { Progress } from "@/components/ui/progress";
import { Landmark, DollarSign, TrendingUp, FileText, Plus, Receipt, Calculator, Scale, Shield, AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { useListOpportunities, useListDocuments } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

export default function Finance() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: opportunities } = useListOpportunities();
  const { data: documents } = useListDocuments();
  const oppList = (opportunities ?? []) as any[];
  const docList = ((documents ?? []) as any[]).filter((d: any) => d.category === 'legal');

  const totalPipeline = oppList.reduce((s: number, o: any) => s + (o.value ?? 0), 0);
  const weightedRevenue = oppList.reduce((s: number, o: any) => s + ((o.value ?? 0) * (o.probability ?? 0) / 100), 0);
  const wonDeals = oppList.filter((o: any) => o.stage === 'closed_won');
  const realizedRevenue = wonDeals.reduce((s: number, o: any) => s + (o.value ?? 0), 0);
  const avgDealSize = oppList.length ? Math.round(totalPipeline / oppList.length) : 0;

  const invoices = [
    { id: 'INV-001', client: 'TechCorp Solutions', amount: 25000, status: 'paid', date: '2025-03-15', service: 'Penetration Testing' },
    { id: 'INV-002', client: 'SecureNet Financial', amount: 45000, status: 'pending', date: '2025-03-22', service: 'Compliance Assessment' },
    { id: 'INV-003', client: 'GlobalHealth IT', amount: 18000, status: 'overdue', date: '2025-02-28', service: 'Infrastructure Audit' },
  ];

  const quotations = [
    { id: 'QUO-001', client: 'TechCorp Solutions', amount: 75000, status: 'accepted', service: 'Full Security Package' },
    { id: 'QUO-002', client: 'SecureNet Financial', amount: 120000, status: 'pending', service: 'SOC 2 Compliance + vCISO' },
    { id: 'QUO-003', client: 'GlobalHealth IT', amount: 35000, status: 'draft', service: 'HIPAA Compliance Assessment' },
  ];

  const expenses = [
    { category: 'Software & Tools', amount: 3200, pct: 18 },
    { category: 'Marketing', amount: 5500, pct: 31 },
    { category: 'Personnel', amount: 8000, pct: 45 },
    { category: 'Operations', amount: 1100, pct: 6 },
  ];

  const revenueData = [
    { month: 'Jan', revenue: 32000, expenses: 15000 },
    { month: 'Feb', revenue: 45000, expenses: 18000 },
    { month: 'Mar', revenue: 38000, expenses: 16500 },
  ];

  return (
    <motion.div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Landmark className="h-8 w-8 text-primary" />
            Finance & Legal
          </h1>
          <p className="text-muted-foreground mt-1">Invoicing, quotations, profitability, legal documents, and compliance.</p>
        </div>
        <div className="flex gap-2">
          <NewInvoiceDialog />
          <Button variant="outline"><Scale className="h-4 w-4 mr-2" />Legal Templates</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <SmallMetric label="Pipeline Value" value={`$${totalPipeline.toLocaleString()}`} accent />
        <SmallMetric label="Weighted Revenue" value={`$${Math.round(weightedRevenue).toLocaleString()}`} />
        <SmallMetric label="Realized Revenue" value={`$${realizedRevenue.toLocaleString()}`} accentColor="green" />
        <SmallMetric label="Avg Deal Size" value={`$${avgDealSize.toLocaleString()}`} />
        <SmallMetric label="Legal Docs" value={docList.length} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <TrendingUp className="h-4 w-4 mr-2" />Financial Overview
          </TabsTrigger>
          <TabsTrigger value="invoices" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Receipt className="h-4 w-4 mr-2" />Invoices
          </TabsTrigger>
          <TabsTrigger value="quotations" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Calculator className="h-4 w-4 mr-2" />Quotations
          </TabsTrigger>
          <TabsTrigger value="legal" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Scale className="h-4 w-4 mr-2" />Legal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-base">Revenue vs Expenses</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 52%, 18%)" vertical={false} />
                      <XAxis dataKey="month" stroke="#666" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#666" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(214, 65%, 8%)', border: '1px solid hsl(214, 52%, 25%)', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="revenue" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Revenue" />
                      <Bar dataKey="expenses" fill="hsl(214, 52%, 40%)" radius={[4, 4, 0, 0]} name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-base">Expense Breakdown</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {expenses.map(exp => (
                  <div key={exp.category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{exp.category}</span>
                      <span className="font-medium">${exp.amount.toLocaleString()} ({exp.pct}%)</span>
                    </div>
                    <Progress value={exp.pct} className="h-1.5" />
                  </div>
                ))}
                <div className="pt-2 border-t border-border/30 flex justify-between text-sm font-semibold">
                  <span>Total Monthly Expenses</span>
                  <span className="text-primary">${expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-base">Deal Revenue Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {oppList.map((opp: any) => (
                <div key={opp.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                  <div className="min-w-0 mr-2">
                    <p className="text-sm font-medium truncate">{opp.title}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{opp.serviceType ?? opp.service_type}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-primary">${(opp.value ?? 0).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">Weighted: ${Math.round((opp.value ?? 0) * (opp.probability ?? 0) / 100).toLocaleString()}</p>
                    </div>
                    <Badge variant="secondary" className="capitalize text-[10px]">{opp.stage}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Invoices</CardTitle>
                <Button size="sm" variant="outline" className="text-xs"><Download className="h-3 w-3 mr-1" />Export</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <Receipt className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{inv.id} — {inv.client}</p>
                      <p className="text-[10px] text-muted-foreground">{inv.service} &bull; {inv.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold text-primary">${inv.amount.toLocaleString()}</span>
                    <Badge className={`text-[10px] ${inv.status === 'paid' ? 'bg-green-500/20 text-green-400' : inv.status === 'overdue' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                      {inv.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotations" className="space-y-4 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Quotations & Estimates</CardTitle>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs"><Plus className="h-3 w-3 mr-1" />New Quote</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {quotations.map(q => (
                <div key={q.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                  <div className="min-w-0 mr-2">
                    <p className="text-sm font-medium">{q.id} — {q.client}</p>
                    <p className="text-[10px] text-muted-foreground">{q.service}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-semibold">${q.amount.toLocaleString()}</span>
                    <Badge className={`text-[10px] ${q.status === 'accepted' ? 'bg-green-500/20 text-green-400' : q.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-muted text-muted-foreground'}`}>
                      {q.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="legal" className="space-y-6 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-base">Legal Document Templates</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { name: 'Non-Disclosure Agreement (NDA)', type: 'nda', status: 'active', lastUpdated: '2025-01-15' },
                { name: 'Master Service Agreement (MSA)', type: 'msa', status: 'active', lastUpdated: '2025-02-01' },
                { name: 'Statement of Work (SOW)', type: 'sow', status: 'active', lastUpdated: '2025-02-10' },
                { name: 'Service Agreement', type: 'service', status: 'active', lastUpdated: '2025-01-20' },
                { name: 'Contractor Agreement', type: 'contractor', status: 'draft', lastUpdated: '2025-03-01' },
                { name: 'Data Processing Agreement (DPA)', type: 'dpa', status: 'active', lastUpdated: '2025-01-25' },
                { name: 'Privacy Policy', type: 'privacy', status: 'active', lastUpdated: '2025-01-10' },
              ].map(tmpl => (
                <div key={tmpl.type} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                  <div className="flex items-center gap-3">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{tmpl.name}</p>
                      <p className="text-[10px] text-muted-foreground">Updated: {tmpl.lastUpdated}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={tmpl.status === 'active' ? 'bg-green-500/20 text-green-400 text-[10px]' : 'bg-muted text-muted-foreground text-[10px]'}>{tmpl.status}</Badge>
                    <Button variant="ghost" size="sm" className="text-xs h-7">Use Template</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50 border-l-4 border-l-yellow-500">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold">Legal Boundary Notice</p>
                <p className="text-xs text-muted-foreground mt-1">
                  When a matter exceeds standard template boundaries or involves complex regulatory requirements, the system will flag it with: <span className="text-yellow-400 font-semibold">Human Legal Review Required</span>. Always consult qualified legal counsel for non-standard agreements.
                </p>
              </div>
            </CardContent>
          </Card>

          {docList.length > 0 && (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-base">Active Legal Documents</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {docList.map((doc: any) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{doc.title}</p>
                        <p className="text-[10px] text-muted-foreground">v{doc.version} &bull; {doc.type}</p>
                      </div>
                    </div>
                    <Badge variant={doc.status === 'approved' ? 'default' : 'secondary'} className="capitalize text-[10px]">{doc.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function SmallMetric({ label, value, accent, accentColor }: any) {
  const c = accentColor === 'green' ? 'text-green-400' : accent ? 'text-primary' : '';
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <div className={`text-lg font-bold ${c}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function NewInvoiceDialog() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90"><Plus className="h-4 w-4 mr-2" />Create Invoice</Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border/50 max-w-lg">
        <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2"><Label>Client Name</Label><Input placeholder="e.g., TechCorp Solutions" className="bg-background/50" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Service</Label><Input placeholder="e.g., Penetration Testing" className="bg-background/50" /></div>
            <div className="space-y-2"><Label>Amount ($)</Label><Input type="number" placeholder="25000" className="bg-background/50" /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Due Date</Label><Input type="date" className="bg-background/50" /></div>
            <div className="space-y-2"><Label>Payment Terms</Label>
              <Select><SelectTrigger className="bg-background/50"><SelectValue placeholder="Terms" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="net15">Net 15</SelectItem><SelectItem value="net30">Net 30</SelectItem>
                  <SelectItem value="net45">Net 45</SelectItem><SelectItem value="net60">Net 60</SelectItem>
                  <SelectItem value="due_receipt">Due on Receipt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea placeholder="Additional invoice details..." className="bg-background/50" rows={2} /></div>
          <Button className="w-full bg-primary hover:bg-primary/90">Generate Invoice</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
