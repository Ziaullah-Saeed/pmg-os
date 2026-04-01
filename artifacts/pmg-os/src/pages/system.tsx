import { useState } from "react";
import { useHealthCheck } from "@workspace/api-client-react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { KpiCard } from "@/components/ui/kpi-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Settings, CheckCircle2, Database, Shield, Server, Users,
  Lock, Eye, Activity, Clock, Globe, Cpu, Bot
} from "lucide-react";

const roles = [
  { role: "Super Admin", desc: "Full system access, governance settings, permission management", users: 1, color: "text-crimson" },
  { role: "Admin", desc: "Domain management, approval rights, financial access", users: 2, color: "text-warning" },
  { role: "Manager", desc: "Team oversight, task assignment, reporting access", users: 3, color: "text-info" },
  { role: "User", desc: "Task execution, limited visibility, no admin access", users: 5, color: "text-muted-foreground" },
];

const auditEntries = [
  { action: "Lead qualified", user: "System AI", domain: "outreach", time: "2 min ago", type: "auto" },
  { action: "Invoice created: INV-002", user: "Admin", domain: "finance", time: "15 min ago", type: "manual" },
  { action: "Campaign launched: Q2 Push", user: "Marketing Manager", domain: "marketing", time: "1 hour ago", type: "manual" },
  { action: "Asset approved: Hero Banner", user: "Creative Director", domain: "production", time: "2 hours ago", type: "approval" },
  { action: "Opportunity stage changed", user: "Sales Rep", domain: "crm", time: "3 hours ago", type: "manual" },
  { action: "System health check passed", user: "System", domain: "system", time: "4 hours ago", type: "auto" },
];

const modules = [
  { name: "Command Center", domain: "dashboard", uptime: "99.9%" },
  { name: "Intelligence Engine", domain: "intelligence", uptime: "99.9%" },
  { name: "Outreach & Prospecting", domain: "outreach", uptime: "99.8%" },
  { name: "Marketing & Campaigns", domain: "marketing", uptime: "99.9%" },
  { name: "Production Studio", domain: "production", uptime: "99.7%" },
  { name: "Execution & Operations", domain: "execution", uptime: "99.9%" },
  { name: "CRM Pipeline", domain: "crm", uptime: "99.9%" },
  { name: "Communication Intelligence", domain: "communications", uptime: "99.8%" },
  { name: "Finance & Legal", domain: "finance", uptime: "99.9%" },
  { name: "Reports & Archive", domain: "reports", uptime: "99.9%" },
  { name: "System Core", domain: "system", uptime: "100%" },
];

const tabs = [
  { id: "overview", label: "System Overview", icon: <Server className="h-3.5 w-3.5" /> },
  { id: "permissions", label: "Permissions", icon: <Shield className="h-3.5 w-3.5" /> },
  { id: "audit", label: "Audit Trail", icon: <Activity className="h-3.5 w-3.5" /> },
  { id: "integrations", label: "Integrations", icon: <Globe className="h-3.5 w-3.5" /> },
  { id: "ai-control", label: "AI Control", icon: <Bot className="h-3.5 w-3.5" /> },
];

export default function System() {
  const [activeTab, setActiveTab] = useState("overview");
  const { data: health } = useHealthCheck();

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="System Core & Governance"
        subtitle="Permissions, governance, audit trails, integrations, and system health"
        icon={<Settings className="h-5 w-5" />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="API Status" value={health?.status === "ok" ? "Healthy" : "Checking..."} icon={<Server className="h-4 w-4" />} accent="success" />
        <KpiCard label="Database" value="Connected" icon={<Database className="h-4 w-4" />} accent="success" />
        <KpiCard label="Modules Active" value={modules.length} icon={<Cpu className="h-4 w-4" />} accent="blue" />
        <KpiCard label="Permission Roles" value={roles.length} icon={<Shield className="h-4 w-4" />} accent="gold" />
      </div>

      <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        {activeTab === "overview" && (
          <div className="space-y-6">
            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Module Status</h3></div>
              <div className="px-5 pb-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                {modules.map((mod) => (
                  <div key={mod.domain} className="flex items-center justify-between p-2.5 rounded-lg glass-surface">
                    <div className="flex items-center gap-2">
                      <div className="status-dot-active" />
                      <span className="text-sm font-medium">{mod.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground tabular-nums">{mod.uptime}</span>
                      <StatusBadge variant="active" label="Operational" />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Platform Information</h3></div>
                <div className="px-5 pb-4 grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: "Platform", value: "PMG Group OS v1.0" },
                    { label: "Organization", value: "PMG Group LLC" },
                    { label: "Industry", value: "Cybersecurity & IT Services" },
                    { label: "Architecture", value: "AI-Native Enterprise OS" },
                    { label: "Frontend", value: "React 19 + Vite + TailwindCSS" },
                    { label: "Backend", value: "Express 5 + PostgreSQL + Drizzle" },
                    { label: "AI Engine", value: "Ready for activation" },
                    { label: "Environment", value: "Development" },
                  ].map((item) => (
                    <div key={item.label} className="p-2 rounded-lg glass-surface">
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                      <p className="text-xs font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              <GlassCard className="p-0 overflow-hidden">
                <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">System Health</h3></div>
                <div className="px-5 pb-4 space-y-2">
                  {[
                    { label: "API Response Time", value: "<50ms" },
                    { label: "Database Connections", value: "3/20" },
                    { label: "Memory Usage", value: "45%" },
                    { label: "Uptime", value: "99.9%" },
                    { label: "Last Backup", value: "6 hours ago" },
                    { label: "Error Rate", value: "0.01%" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-2 rounded-lg glass-surface">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium tabular-nums">{item.value}</span>
                        <div className="status-dot-active" />
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {activeTab === "permissions" && (
          <div className="space-y-6">
            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Role-Based Access Control</h3>
                <Button className="btn-glass text-foreground text-xs px-3 py-1.5 rounded-lg"><Users className="h-3 w-3 mr-1" />Manage Users</Button>
              </div>
              <div className="px-5 pb-4 space-y-3">
                {roles.map((r) => (
                  <div key={r.role} className="p-4 rounded-lg glass-surface">
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
                      {r.role === "Super Admin" && ["All Modules", "Governance", "Permissions", "Financials", "System Config", "Audit Logs"].map((p) => <Badge key={p} className="text-[8px] bg-crimson/10 text-crimson border-crimson/20">{p}</Badge>)}
                      {r.role === "Admin" && ["Domain Management", "Approvals", "Financial View", "User Management", "Reports"].map((p) => <Badge key={p} className="text-[8px] bg-warning/10 text-warning border-warning/20">{p}</Badge>)}
                      {r.role === "Manager" && ["Team Tasks", "Campaign Management", "CRM Access", "Basic Reports"].map((p) => <Badge key={p} className="text-[8px] bg-info/10 text-info border-info/20">{p}</Badge>)}
                      {r.role === "User" && ["Own Tasks", "Limited CRM", "Communication Log"].map((p) => <Badge key={p} className="text-[8px] bg-muted text-muted-foreground">{p}</Badge>)}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Permission Matrix</h3></div>
              <div className="px-5 pb-4 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 px-2 text-muted-foreground font-medium">Module</th>
                      {roles.map((r) => <th key={r.role} className={`text-center py-2 px-2 font-medium ${r.color}`}>{r.role.split(" ")[0]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {["Dashboard", "Intelligence", "Outreach", "Marketing", "Production", "CRM", "Communications", "Execution", "Finance", "Reports", "System"].map((mod) => (
                      <tr key={mod} className="border-b border-border/20">
                        <td className="py-1.5 px-2">{mod}</td>
                        <td className="text-center"><CheckCircle2 className="h-3 w-3 text-success mx-auto" /></td>
                        <td className="text-center"><CheckCircle2 className="h-3 w-3 text-success mx-auto" /></td>
                        <td className="text-center">
                          {["Dashboard", "Intelligence", "Outreach", "Marketing", "CRM", "Communications", "Execution"].includes(mod)
                            ? <CheckCircle2 className="h-3 w-3 text-success mx-auto" />
                            : <Eye className="h-3 w-3 text-warning mx-auto" />}
                        </td>
                        <td className="text-center">
                          {["Dashboard", "Communications", "Execution"].includes(mod)
                            ? <Eye className="h-3 w-3 text-warning mx-auto" />
                            : <Lock className="h-3 w-3 text-muted-foreground mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        )}

        {activeTab === "audit" && (
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Audit Trail</h3></div>
            <div className="px-5 pb-4 space-y-2">
              {auditEntries.map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${entry.type === "auto" ? "bg-info" : entry.type === "approval" ? "bg-success" : "bg-warning"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{entry.action}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.user} &bull; {entry.domain}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <StatusBadge variant={entry.type === "auto" ? "ai-executed" : entry.type === "approval" ? "human-approved" : "manually-completed"} label={entry.type} />
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{entry.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {activeTab === "integrations" && (
          <GlassCard className="p-0 overflow-hidden">
            <div className="px-5 pt-4 pb-3"><h3 className="text-sm font-semibold">Integration Management</h3></div>
            <div className="px-5 pb-4 space-y-2">
              {[
                { name: "GoHighLevel", status: "available", desc: "Client CRM integration (sub-account)" },
                { name: "OpenAI / GPT-4o", status: "ready", desc: "AI intelligence engine" },
                { name: "ElevenLabs", status: "available", desc: "Voice AI for calling" },
                { name: "Slack", status: "ready", desc: "Reporting & communication surface" },
                { name: "Stripe", status: "available", desc: "Payment processing" },
                { name: "Google Calendar", status: "available", desc: "Meeting scheduling" },
                { name: "LinkedIn", status: "available", desc: "Social selling & outreach" },
              ].map((int) => (
                <div key={int.name} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                  <div>
                    <p className="text-sm font-medium">{int.name}</p>
                    <p className="text-[10px] text-muted-foreground">{int.desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge variant={int.status === "ready" ? "active" : "pending"} label={int.status === "ready" ? "Connected" : "Available"} />
                    {int.status !== "ready" && <Button className="btn-glass text-foreground text-xs px-2 py-1 rounded-lg">Connect</Button>}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {activeTab === "ai-control" && (
          <div className="space-y-6">
            <GlassCard glow="blue" className="p-0 overflow-hidden">
              <div className="px-5 pt-4 pb-3 flex items-center gap-2">
                <Bot className="h-4 w-4 text-info" />
                <h3 className="text-sm font-semibold">AI Mode Control Center</h3>
                <StatusBadge variant="ai-executed" label="Hybrid Mode Active" />
              </div>
              <div className="px-5 pb-4 space-y-4">
                <p className="text-sm text-muted-foreground">Configure AI autonomous vs. human-assisted modes globally and per-workflow.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { workflow: "Lead Qualification", mode: "AI Autonomous", confidence: 85 },
                    { workflow: "Content Generation", mode: "AI Autonomous", confidence: 90 },
                    { workflow: "Proposal Creation", mode: "Human Assisted", confidence: 70 },
                    { workflow: "Deal Progression", mode: "Human Required", confidence: 60 },
                    { workflow: "Invoice Generation", mode: "AI Autonomous", confidence: 95 },
                    { workflow: "Legal Review", mode: "Human Required", confidence: 40 },
                  ].map((wf) => (
                    <div key={wf.workflow} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                      <div>
                        <p className="text-sm font-medium">{wf.workflow}</p>
                        <p className="text-[10px] text-muted-foreground">Confidence: {wf.confidence}%</p>
                      </div>
                      <StatusBadge variant={wf.mode === "AI Autonomous" ? "ai-executed" : wf.mode === "Human Assisted" ? "human-assisted" : "human-required"} label={wf.mode} />
                    </div>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        )}
      </motion.div>
    </div>
  );
}
