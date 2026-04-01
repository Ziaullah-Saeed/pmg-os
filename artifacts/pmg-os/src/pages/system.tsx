import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, CheckCircle2, Database, Shield, Server, Users, Lock, Eye, Activity, AlertTriangle, Clock, Key, Globe, Cpu } from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";
import { motion } from "framer-motion";

const roles = [
  { role: 'Super Admin', desc: 'Full system access, governance settings, permission management', users: 1, color: 'text-primary' },
  { role: 'Admin', desc: 'Domain management, approval rights, financial access', users: 2, color: 'text-orange-400' },
  { role: 'Manager', desc: 'Team oversight, task assignment, reporting access', users: 3, color: 'text-yellow-400' },
  { role: 'User', desc: 'Task execution, limited visibility, no admin access', users: 5, color: 'text-muted-foreground' },
];

const auditEntries = [
  { action: 'Lead qualified', user: 'System AI', domain: 'outreach', time: '2 min ago', type: 'auto' },
  { action: 'Invoice created: INV-002', user: 'Admin', domain: 'finance', time: '15 min ago', type: 'manual' },
  { action: 'Campaign launched: Q2 Push', user: 'Marketing Manager', domain: 'marketing', time: '1 hour ago', type: 'manual' },
  { action: 'Asset approved: Hero Banner', user: 'Creative Director', domain: 'production', time: '2 hours ago', type: 'approval' },
  { action: 'Opportunity stage changed: Discovery → Qualification', user: 'Sales Rep', domain: 'crm', time: '3 hours ago', type: 'manual' },
  { action: 'System health check passed', user: 'System', domain: 'system', time: '4 hours ago', type: 'auto' },
  { action: 'Database backup completed', user: 'System', domain: 'system', time: '6 hours ago', type: 'auto' },
];

export default function System() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: health } = useHealthCheck();

  const modules = [
    { name: "Command Center", status: "operational", domain: "dashboard", uptime: "99.9%" },
    { name: "Intelligence Engine", status: "operational", domain: "intelligence", uptime: "99.9%" },
    { name: "Outreach & Prospecting", status: "operational", domain: "outreach", uptime: "99.8%" },
    { name: "Marketing & Campaigns", status: "operational", domain: "marketing", uptime: "99.9%" },
    { name: "Production Studio", status: "operational", domain: "production", uptime: "99.7%" },
    { name: "Execution & Operations", status: "operational", domain: "execution", uptime: "99.9%" },
    { name: "CRM Pipeline", status: "operational", domain: "crm", uptime: "99.9%" },
    { name: "Communication Intelligence", status: "operational", domain: "communications", uptime: "99.8%" },
    { name: "Finance & Legal", status: "operational", domain: "finance", uptime: "99.9%" },
    { name: "Reports & Archive", status: "operational", domain: "reports", uptime: "99.9%" },
    { name: "System Core", status: "operational", domain: "system", uptime: "100%" },
  ];

  return (
    <motion.div className="p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Settings className="h-8 w-8 text-primary" />
            System Core & Governance
          </h1>
          <p className="text-muted-foreground mt-1">Permissions, governance, audit trails, integrations, and system health.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SmallMetric label="API Status" value={health?.status === 'ok' ? 'Healthy' : 'Checking...'} icon={Server} healthy />
        <SmallMetric label="Database" value="Connected" icon={Database} healthy />
        <SmallMetric label="Modules Active" value={modules.length} icon={Cpu} />
        <SmallMetric label="Permission Roles" value={roles.length} icon={Shield} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Server className="h-4 w-4 mr-2" />System Overview
          </TabsTrigger>
          <TabsTrigger value="permissions" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Shield className="h-4 w-4 mr-2" />Permissions
          </TabsTrigger>
          <TabsTrigger value="audit" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Activity className="h-4 w-4 mr-2" />Audit Trail
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
            <Globe className="h-4 w-4 mr-2" />Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-base">Module Status</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {modules.map(mod => (
                  <div key={mod.domain} className="flex items-center justify-between p-2.5 rounded-md bg-background/50 border border-border/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">{mod.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">{mod.uptime}</span>
                      <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">Operational</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-base">Platform Information</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoItem label="Platform" value="PMG Group OS v1.0" />
                  <InfoItem label="Organization" value="PMG Group LLC" />
                  <InfoItem label="Industry" value="Cybersecurity & IT Services" />
                  <InfoItem label="Architecture" value="AI-Native Enterprise OS" />
                  <InfoItem label="Frontend" value="React 19 + Vite + TailwindCSS" />
                  <InfoItem label="Backend" value="Express 5 + PostgreSQL + Drizzle" />
                  <InfoItem label="AI Engine" value="Ready for activation" />
                  <InfoItem label="Environment" value="Development" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardHeader className="pb-2"><CardTitle className="text-base">System Health</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'API Response Time', value: '<50ms', status: 'healthy' },
                  { label: 'Database Connections', value: '3/20', status: 'healthy' },
                  { label: 'Memory Usage', value: '45%', status: 'healthy' },
                  { label: 'Uptime', value: '99.9%', status: 'healthy' },
                  { label: 'Last Backup', value: '6 hours ago', status: 'healthy' },
                  { label: 'Error Rate', value: '0.01%', status: 'healthy' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-2 rounded bg-background/50 border border-border/30">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{item.value}</span>
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="permissions" className="space-y-6 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Role-Based Access Control</CardTitle>
                <Button size="sm" variant="outline" className="text-xs"><Users className="h-3 w-3 mr-1" />Manage Users</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {roles.map(r => (
                <div key={r.role} className="p-4 rounded-lg bg-background/50 border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Shield className={`h-5 w-5 ${r.color}`} />
                      <div>
                        <h3 className="font-semibold text-sm">{r.role}</h3>
                        <p className="text-[10px] text-muted-foreground">{r.desc}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{r.users} users</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.role === 'Super Admin' && ['All Modules', 'Governance', 'Permissions', 'Financials', 'System Config', 'Audit Logs'].map(p => <Badge key={p} className="text-[8px] bg-primary/10 text-primary">{p}</Badge>)}
                    {r.role === 'Admin' && ['Domain Management', 'Approvals', 'Financial View', 'User Management', 'Reports'].map(p => <Badge key={p} className="text-[8px] bg-orange-500/10 text-orange-400">{p}</Badge>)}
                    {r.role === 'Manager' && ['Team Tasks', 'Campaign Management', 'CRM Access', 'Basic Reports'].map(p => <Badge key={p} className="text-[8px] bg-yellow-500/10 text-yellow-400">{p}</Badge>)}
                    {r.role === 'User' && ['Own Tasks', 'Limited CRM', 'Communication Log'].map(p => <Badge key={p} className="text-[8px] bg-muted text-muted-foreground">{p}</Badge>)}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-base">Permission Matrix</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Module</th>
                      {roles.map(r => <th key={r.role} className={`text-center py-2 px-2 font-medium ${r.color}`}>{r.role.split(' ')[0]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {['Dashboard', 'Intelligence', 'Outreach', 'Marketing', 'Production', 'CRM', 'Communications', 'Execution', 'Finance', 'Reports', 'System'].map(mod => (
                      <tr key={mod} className="border-b border-border/20">
                        <td className="py-1.5 px-2">{mod}</td>
                        <td className="text-center"><CheckCircle2 className="h-3 w-3 text-green-400 mx-auto" /></td>
                        <td className="text-center"><CheckCircle2 className="h-3 w-3 text-green-400 mx-auto" /></td>
                        <td className="text-center">
                          {['Dashboard', 'Intelligence', 'Outreach', 'Marketing', 'CRM', 'Communications', 'Execution'].includes(mod)
                            ? <CheckCircle2 className="h-3 w-3 text-green-400 mx-auto" />
                            : <Eye className="h-3 w-3 text-yellow-400 mx-auto" />}
                        </td>
                        <td className="text-center">
                          {['Dashboard', 'Communications', 'Execution'].includes(mod)
                            ? <Eye className="h-3 w-3 text-yellow-400 mx-auto" />
                            : <Lock className="h-3 w-3 text-muted-foreground mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-base">Audit Trail</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {auditEntries.map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${entry.type === 'auto' ? 'bg-blue-500' : entry.type === 'approval' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{entry.action}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.user} &bull; {entry.domain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge variant="outline" className="text-[9px] capitalize">{entry.type}</Badge>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{entry.time}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4 mt-6">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-2"><CardTitle className="text-base">Integration Management</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: 'Slack', status: 'ready', desc: 'Reporting & communication surface', icon: '💬' },
                { name: 'GoHighLevel', status: 'available', desc: 'Client CRM integration (optional)', icon: '📊' },
                { name: 'HubSpot', status: 'available', desc: 'Client CRM integration (optional)', icon: '🔶' },
                { name: 'OpenAI / GPT-4o', status: 'ready', desc: 'AI intelligence engine', icon: '🤖' },
                { name: 'ElevenLabs', status: 'available', desc: 'Voice AI for calling', icon: '🎙️' },
                { name: 'Stripe', status: 'available', desc: 'Payment processing', icon: '💳' },
                { name: 'Google Calendar', status: 'available', desc: 'Meeting scheduling', icon: '📅' },
              ].map(int => (
                <div key={int.name} className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{int.icon}</span>
                    <div>
                      <p className="text-sm font-medium">{int.name}</p>
                      <p className="text-[10px] text-muted-foreground">{int.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] ${int.status === 'ready' ? 'bg-green-500/20 text-green-400' : 'bg-muted text-muted-foreground'}`}>{int.status === 'ready' ? 'Connected' : 'Available'}</Badge>
                    {int.status !== 'ready' && <Button variant="ghost" size="sm" className="text-xs h-7">Connect</Button>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}

function SmallMetric({ label, value, icon: Icon, healthy }: any) {
  return (
    <Card className="bg-card/50 backdrop-blur-sm border-border/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className={`text-lg font-bold ${healthy ? 'text-green-400' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded bg-background/50 border border-border/30">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-medium">{value}</p>
    </div>
  );
}
