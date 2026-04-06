import { useState } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import {
  Settings, Brain, Wallet, Users, Radio, Shield, Globe, Key,
  Linkedin, Facebook, Twitter, Youtube, Mail, MessageSquare,
  CheckCircle2, AlertCircle, Zap, Bot, User, ArrowLeftRight,
  Building2, Bell, Activity, FileText, Lock, Scale, Eye,
  AlertTriangle, Database, Cpu, Server, Clock, Palette
} from "lucide-react";

const tabs = [
  { id: "general", label: "General", icon: <Building2 className="h-3.5 w-3.5" /> },
  { id: "ai-modes", label: "AI Modes", icon: <Brain className="h-3.5 w-3.5" /> },
  { id: "wallet", label: "Wallet", icon: <Wallet className="h-3.5 w-3.5" /> },
  { id: "users", label: "Users & Roles", icon: <Users className="h-3.5 w-3.5" /> },
  { id: "channels", label: "Channels", icon: <Radio className="h-3.5 w-3.5" /> },
  { id: "integrations", label: "Integrations", icon: <Globe className="h-3.5 w-3.5" /> },
  { id: "api-keys", label: "API Keys", icon: <Key className="h-3.5 w-3.5" /> },
  { id: "legal", label: "Legal & Compliance", icon: <Scale className="h-3.5 w-3.5" /> },
  { id: "notifications", label: "Notifications", icon: <Bell className="h-3.5 w-3.5" /> },
  { id: "system-health", label: "System Health", icon: <Activity className="h-3.5 w-3.5" /> },
];

function AiModesTab() {
  const { currentMode, setMode } = useAiModeContext();
  const [sectionModes, setSectionModes] = useState<Record<string, string>>({
    outreach: "inherit",
    crm: "inherit",
    marketing: "inherit",
    production: "inherit",
    admin: "inherit",
    finance: "inherit",
  });

  const modes = [
    {
      id: "ai_auto",
      label: "AI Autonomous",
      icon: <Bot className="h-5 w-5" />,
      description: "AI handles everything. You review results and approve.",
      color: "text-info",
      border: "border-info/30",
    },
    {
      id: "hybrid",
      label: "Hybrid",
      icon: <ArrowLeftRight className="h-5 w-5" />,
      description: "AI prepares, suggests, and drafts. You review and execute.",
      color: "text-gold",
      border: "border-gold/30",
    },
    {
      id: "human",
      label: "Manual Control",
      icon: <User className="h-5 w-5" />,
      description: "You control everything. AI only provides tools and data.",
      color: "text-crimson",
      border: "border-crimson/30",
    },
  ];

  const sections = [
    { id: "outreach", label: "Outreach" },
    { id: "crm", label: "CRM" },
    { id: "marketing", label: "Marketing" },
    { id: "production", label: "Production" },
    { id: "admin", label: "Admin" },
    { id: "finance", label: "Finance" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1">Global AI Mode</h3>
        <p className="text-xs text-muted-foreground mb-4">Sets the default behavior across all sections. Override per section below.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modes.map((mode) => (
            <motion.div
              key={mode.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMode(mode.id as any)}
              className={`glass-card rounded-lg p-4 cursor-pointer border-2 transition-all ${
                currentMode === mode.id ? mode.border + " " + mode.color : "border-transparent"
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={mode.color}>{mode.icon}</div>
                <span className="text-sm font-semibold">{mode.label}</span>
                {currentMode === mode.id && <CheckCircle2 className="h-4 w-4 ml-auto text-success" />}
              </div>
              <p className="text-xs text-muted-foreground">{mode.description}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-1">Per-Section Overrides</h3>
        <p className="text-xs text-muted-foreground mb-4">Override the global mode for specific sections.</p>
        <GlassCard>
          <div className="space-y-3">
            {sections.map((section) => (
              <div key={section.id} className="flex items-center justify-between p-3 rounded-lg glass-surface">
                <span className="text-sm font-medium">{section.label}</span>
                <Select
                  value={sectionModes[section.id]}
                  onValueChange={(v) => setSectionModes({ ...sectionModes, [section.id]: v })}
                >
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inherit">Inherit Global ({currentMode === "ai_auto" ? "Auto" : currentMode === "hybrid" ? "Hybrid" : "Manual"})</SelectItem>
                    <SelectItem value="ai_auto">AI Autonomous</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="human">Manual Control</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function WalletTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard glow="crimson">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
            <p className="text-3xl font-bold text-crimson">$360.29</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">This Month Spent</p>
            <p className="text-3xl font-bold">$89.71</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Monthly Budget</p>
            <p className="text-3xl font-bold text-success">$450.00</p>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-4">Budget Pools</h3>
        <div className="space-y-3">
          {[
            { pool: "Standard", budget: 200, spent: 45, agents: "Outreach, CRM, Admin" },
            { pool: "Premium", budget: 100, spent: 30, agents: "Marketing, Intelligence" },
            { pool: "Creative", budget: 100, spent: 10, agents: "Production (DALL-E, Runway)" },
            { pool: "System", budget: 50, spent: 5, agents: "Legal, Evolution" },
          ].map((p) => (
            <div key={p.pool} className="p-3 rounded-lg glass-surface">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{p.pool}</span>
                <span className="text-xs text-muted-foreground">${p.spent} / ${p.budget}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted/20">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-crimson to-crimson/60 transition-all"
                  style={{ width: `${(p.spent / p.budget) * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{p.agents}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-4">Spending Controls</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Auto-pause when balance low</Label>
              <p className="text-xs text-muted-foreground">Pause AI agents when wallet drops below threshold</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Low balance threshold</Label>
              <p className="text-xs text-muted-foreground">Alert when balance drops below this amount</p>
            </div>
            <Input type="number" defaultValue="50" className="w-24 h-8 text-sm" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Max charge per agent run</Label>
              <p className="text-xs text-muted-foreground">Prevent any single agent from spending more than this</p>
            </div>
            <Input type="number" defaultValue="5" className="w-24 h-8 text-sm" />
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function UsersTab() {
  const roles = [
    { role: "Super Admin", permissions: "Full access to everything", count: 1 },
    { role: "Admin", permissions: "Full access except billing and user management", count: 0 },
    { role: "Manager", permissions: "Can view, edit, run agents in assigned sections", count: 0 },
    { role: "Viewer", permissions: "Read-only access to dashboards and reports", count: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Team Members</h3>
          <p className="text-xs text-muted-foreground">Manage who has access to PMG OS</p>
        </div>
        <Button className="btn-premium text-white text-sm">
          <Users className="h-4 w-4 mr-2" />Invite User
        </Button>
      </div>

      <GlassCard>
        <div className="p-3 rounded-lg glass-surface flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-crimson to-crimson/40 flex items-center justify-center text-white font-bold">
            SN
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Sher Shah Nawabi</p>
            <p className="text-xs text-muted-foreground">shershah_nawabi@pmggroup-llc.com</p>
          </div>
          <Badge className="bg-crimson/20 text-crimson border-crimson/30">Super Admin</Badge>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-4">Role Definitions</h3>
        <div className="space-y-3">
          {roles.map((r) => (
            <div key={r.role} className="flex items-center justify-between p-3 rounded-lg glass-surface">
              <div>
                <p className="text-sm font-medium">{r.role}</p>
                <p className="text-xs text-muted-foreground">{r.permissions}</p>
              </div>
              <Badge variant="outline" className="text-xs">{r.count} {r.count === 1 ? "user" : "users"}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function ChannelsTab() {
  const channels = [
    { name: "Email", icon: <Mail className="h-4 w-4" />, status: "ready", description: "SMTP/IMAP for email campaigns and follow-ups" },
    { name: "LinkedIn", icon: <Linkedin className="h-4 w-4" />, status: "ready", description: "Profile monitoring, connection requests, DMs" },
    { name: "Facebook", icon: <Facebook className="h-4 w-4" />, status: "ready", description: "Page posting, messaging, ad campaigns" },
    { name: "X (Twitter)", icon: <Twitter className="h-4 w-4" />, status: "ready", description: "Posting, engagement monitoring, DMs" },
    { name: "YouTube", icon: <Youtube className="h-4 w-4" />, status: "ready", description: "Video uploads, comment monitoring" },
    { name: "Slack", icon: <MessageSquare className="h-4 w-4" />, status: "ready", description: "Team notifications and client channels" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1">Social Command Center Channels</h3>
        <p className="text-xs text-muted-foreground mb-4">Connect your channels. AI will monitor and draft responses — you approve and send.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {channels.map((ch) => (
          <GlassCard key={ch.name} variant="interactive" className="cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg glass-surface text-crimson">
                {ch.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{ch.name}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {ch.status === "connected" ? "Connected" : "Not Connected"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{ch.description}</p>
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                Connect
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-semibold">Anti-Spam Protection</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          All outbound messages go through anti-spam verification. AI drafts are always reviewed before sending to prevent account bans.
        </p>
        <div className="space-y-2">
          {[
            { label: "Email: Max 50 sends/day per account", enabled: true },
            { label: "LinkedIn: Max 25 connection requests/day", enabled: true },
            { label: "Social: Max 30 posts/week across all platforms", enabled: true },
            { label: "Cool-down period between messages: 2-5 min randomized", enabled: true },
          ].map((rule) => (
            <div key={rule.label} className="flex items-center justify-between p-2 rounded-lg glass-surface">
              <span className="text-xs">{rule.label}</span>
              <Switch defaultChecked={rule.enabled} />
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function IntegrationsTab() {
  const integrations = [
    { name: "GoHighLevel (GHL)", status: "ready", description: "CRM sync — main account + partner sub-account" },
    { name: "HubSpot", status: "ready", description: "Bidirectional CRM sync" },
    { name: "Hunter.io", status: "ready", description: "Email discovery and verification" },
    { name: "Zoom", status: "ready", description: "Call recordings and transcript analysis" },
    { name: "Google Analytics", status: "ready", description: "Website traffic and conversion tracking" },
    { name: "Stripe", status: "ready", description: "Payment processing and invoicing" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1">Connected Services</h3>
        <p className="text-xs text-muted-foreground mb-4">All integrations run through a single API gateway for easy server migration.</p>
      </div>
      <div className="space-y-3">
        {integrations.map((int) => (
          <GlassCard key={int.name}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg glass-surface">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{int.name}</p>
                  <p className="text-xs text-muted-foreground">{int.description}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-xs">
                Configure
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function ApiKeysTab() {
  const keys = [
    { service: "Claude (Anthropic)", status: "required", purpose: "Primary AI — all text generation, analysis, recommendations", cost: "~$50/mo" },
    { service: "OpenAI (DALL-E 3)", status: "required", purpose: "Image generation for creative production", cost: "~$25/mo" },
    { service: "OpenAI (GPT-4o)", status: "optional", purpose: "Fallback AI when Claude is unavailable", cost: "~$20/mo" },
    { service: "Runway ML", status: "optional", purpose: "Video generation for marketing content", cost: "~$20/mo" },
    { service: "ElevenLabs", status: "optional", purpose: "Voice generation for video guides", cost: "~$10/mo" },
    { service: "Hunter.io", status: "required", purpose: "Email discovery for prospect research", cost: "~$49/mo" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1">API Key Management</h3>
        <p className="text-xs text-muted-foreground mb-4">All keys are encrypted and stored securely. Monthly costs are estimates based on typical usage.</p>
      </div>
      <div className="space-y-3">
        {keys.map((k) => (
          <GlassCard key={k.service}>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{k.service}</p>
                  <Badge variant="outline" className={`text-[10px] ${k.status === "required" ? "border-crimson/30 text-crimson" : "border-muted-foreground/30"}`}>
                    {k.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{k.purpose}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{k.cost}</span>
                <Button variant="outline" size="sm" className="text-xs">
                  <Key className="h-3 w-3 mr-1" />Add Key
                </Button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <GlassCard variant="insight">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-gold" />
          <h3 className="text-sm font-semibold">Estimated Monthly Cost</h3>
        </div>
        <p className="text-2xl font-bold text-crimson mb-1">$300 - $500</p>
        <p className="text-xs text-muted-foreground">Based on moderate usage. Actual costs depend on volume of AI operations.</p>
      </GlassCard>
    </div>
  );
}

function GeneralTab() {
  return (
    <div className="space-y-6">
      <GlassCard>
        <h3 className="text-sm font-semibold mb-4">Company Information</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-crimson to-crimson/60 flex items-center justify-center text-white shrink-0">
              <Shield className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <Label className="text-sm">Company Logo</Label>
              <p className="text-xs text-muted-foreground mb-2">Upload your company logo (PNG, SVG, or JPG)</p>
              <Button size="sm" variant="outline" className="text-xs">
                <Palette className="h-3 w-3 mr-1" />Upload Logo
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Company Name</Label>
              <Input defaultValue="PMG Group LLC" className="mt-1 bg-white/5 border-white/10" />
            </div>
            <div>
              <Label className="text-sm">Website</Label>
              <Input defaultValue="https://pmggroup-llc.com" className="mt-1 bg-white/5 border-white/10" />
            </div>
            <div>
              <Label className="text-sm">Industry Focus</Label>
              <Input defaultValue="Cybersecurity & IT Services" className="mt-1 bg-white/5 border-white/10" readOnly />
            </div>
            <div>
              <Label className="text-sm">Timezone</Label>
              <Select defaultValue="america_new_york">
                <SelectTrigger className="mt-1 bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="america_new_york">America/New_York (EST)</SelectItem>
                  <SelectItem value="america_chicago">America/Chicago (CST)</SelectItem>
                  <SelectItem value="america_denver">America/Denver (MST)</SelectItem>
                  <SelectItem value="america_los_angeles">America/Los_Angeles (PST)</SelectItem>
                  <SelectItem value="utc">UTC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-4">Brand Identity</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg glass-surface">
            <div className="w-full h-8 rounded bg-crimson mb-2" />
            <p className="text-[10px] text-muted-foreground">Primary Color</p>
            <p className="text-xs font-medium">#DC2626 (Crimson)</p>
          </div>
          <div className="p-3 rounded-lg glass-surface">
            <div className="w-full h-8 rounded bg-[#0F172A] border border-white/10 mb-2" />
            <p className="text-[10px] text-muted-foreground">Background</p>
            <p className="text-xs font-medium">#0F172A (Navy)</p>
          </div>
          <div className="p-3 rounded-lg glass-surface">
            <div className="w-full h-8 rounded bg-white/90 mb-2" />
            <p className="text-[10px] text-muted-foreground">Text</p>
            <p className="text-xs font-medium">#F8FAFC (White)</p>
          </div>
          <div className="p-3 rounded-lg glass-surface">
            <div className="w-full h-8 rounded bg-gold mb-2" />
            <p className="text-[10px] text-muted-foreground">Accent</p>
            <p className="text-xs font-medium">#F59E0B (Gold)</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Primary Font</Label>
            <Input defaultValue="Inter" className="mt-1 bg-white/5 border-white/10" />
          </div>
          <div>
            <Label className="text-sm">Display Font</Label>
            <Input defaultValue="Clash Display" className="mt-1 bg-white/5 border-white/10" />
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-4">Brand Voice</h3>
        <div className="space-y-2">
          {[
            { label: "Tone", value: "Authoritative, data-driven, honest" },
            { label: "Terminology", value: "NIST, SOC 2, SIEM, EDR, MDR, XDR — use naturally" },
            { label: "Forbidden Words", value: "leverage, synergy, cutting-edge, game-changing, innovative" },
            { label: "Content Rule", value: "Zero AI fluff. Every piece sounds human-written." },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 p-2.5 rounded-lg glass-surface">
              <span className="text-xs font-medium w-28 shrink-0">{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.value}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      <div className="flex justify-end">
        <Button className="btn-premium text-white text-sm">
          <CheckCircle2 className="h-4 w-4 mr-2" />Save Changes
        </Button>
      </div>
    </div>
  );
}

function LegalComplianceTab() {
  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg glass-surface text-crimson"><Scale className="h-5 w-5" /></div>
          <div>
            <h3 className="text-sm font-semibold">Communication Compliance</h3>
            <p className="text-xs text-muted-foreground">Automated enforcement across all outbound channels</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { label: "CAN-SPAM Compliance", desc: "Unsubscribe links, physical address, opt-out handling in every email", enabled: true, status: "active" },
            { label: "GDPR Compliance", desc: "Consent tracking, data deletion rights, DPA management for EU contacts", enabled: true, status: "active" },
            { label: "TCPA Compliance", desc: "Do-not-call list checking, calling hours enforcement", enabled: true, status: "active" },
            { label: "Platform Rate Limits", desc: "LinkedIn connection limits, Facebook messaging policies, Instagram DM rules", enabled: true, status: "active" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 rounded-lg glass-surface">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{item.label}</p>
                  <Badge variant="outline" className="text-[10px] text-success border-success/20">{item.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <Switch defaultChecked={item.enabled} />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-4">Anti-Spam Enforcement</h3>
        <div className="space-y-3">
          {[
            { rule: "Email warm-up sequences", desc: "New accounts start slow, gradually increase volume", value: "Enabled" },
            { rule: "Bounce rate monitoring", desc: "Auto-pauses if bounce rate exceeds threshold", value: "5% max" },
            { rule: "Domain reputation tracking", desc: "Monitors email domain health and blacklist status", value: "Healthy" },
            { rule: "Business hours only", desc: "Only sends during business hours in recipient's timezone", value: "Enabled" },
            { rule: "Personalization required", desc: "AI never sends generic templates — every message references specific details", value: "Enforced" },
          ].map((item) => (
            <div key={item.rule} className="flex items-center justify-between p-3 rounded-lg glass-surface">
              <div className="flex-1">
                <p className="text-sm font-medium">{item.rule}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <Badge variant="outline" className="text-[10px] text-success border-success/20">{item.value}</Badge>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-4">Contract Compliance</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { doc: "NDA Template", status: "configured", icon: <Lock className="h-4 w-4" /> },
            { doc: "Terms of Service", status: "configured", icon: <FileText className="h-4 w-4" /> },
            { doc: "Data Processing Agreement (DPA)", status: "configured", icon: <Database className="h-4 w-4" /> },
            { doc: "Service Level Agreement (SLA)", status: "needs_review", icon: <Scale className="h-4 w-4" /> },
          ].map((item) => (
            <div key={item.doc} className="flex items-center gap-3 p-3 rounded-lg glass-surface">
              <div className="text-muted-foreground">{item.icon}</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.doc}</p>
              </div>
              <Badge variant="outline" className={`text-[10px] ${
                item.status === "configured" ? "text-success border-success/20" : "text-yellow-400 border-yellow-500/20"
              }`}>{item.status.replace("_", " ")}</Badge>
              <Button size="sm" variant="outline" className="text-xs h-7">Edit</Button>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-4">Opt-Out Management</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg glass-surface p-3 text-center">
            <p className="text-lg font-bold">12</p>
            <p className="text-[10px] text-muted-foreground">Total Opt-Outs</p>
          </div>
          <div className="rounded-lg glass-surface p-3 text-center">
            <p className="text-lg font-bold text-success">100%</p>
            <p className="text-[10px] text-muted-foreground">Compliance Rate</p>
          </div>
          <div className="rounded-lg glass-surface p-3 text-center">
            <p className="text-lg font-bold">0</p>
            <p className="text-[10px] text-muted-foreground">Violations</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />View Opt-Out List
          </Button>
          <Button size="sm" variant="outline" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />Export Compliance Report
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

function NotificationsTab() {
  const categories = [
    {
      category: "Pipeline & Deals",
      items: [
        { label: "New lead arrives in CRM", inApp: true, email: true, slack: true },
        { label: "Deal moves to next stage", inApp: true, email: false, slack: true },
        { label: "Deal at risk (health turns red)", inApp: true, email: true, slack: true },
        { label: "Deal won / lost", inApp: true, email: true, slack: true },
      ],
    },
    {
      category: "Outreach & Messages",
      items: [
        { label: "Hot lead response received", inApp: true, email: true, slack: true },
        { label: "Follow-up due", inApp: true, email: false, slack: false },
        { label: "Prospect profile viewed your content", inApp: true, email: false, slack: false },
      ],
    },
    {
      category: "Production & Content",
      items: [
        { label: "Content ready for review", inApp: true, email: false, slack: true },
        { label: "Quality check completed", inApp: true, email: false, slack: false },
        { label: "Client report generated", inApp: true, email: true, slack: true },
      ],
    },
    {
      category: "Finance & Billing",
      items: [
        { label: "Invoice payment received", inApp: true, email: true, slack: false },
        { label: "Invoice overdue (7+ days)", inApp: true, email: true, slack: true },
        { label: "Wallet balance low", inApp: true, email: true, slack: true },
        { label: "Contract renewal approaching", inApp: true, email: true, slack: false },
      ],
    },
    {
      category: "System",
      items: [
        { label: "AI agent error or failure", inApp: true, email: true, slack: true },
        { label: "API health issue detected", inApp: true, email: true, slack: true },
        { label: "New system update available", inApp: true, email: false, slack: false },
        { label: "Compliance violation detected", inApp: true, email: true, slack: true },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-1">Notification Preferences</h3>
        <p className="text-xs text-muted-foreground mb-4">Choose how you want to be notified for each event type</p>
      </div>

      {categories.map((cat) => (
        <GlassCard key={cat.category}>
          <h3 className="text-sm font-semibold mb-3">{cat.category}</h3>
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
              <span className="flex-1">Event</span>
              <span className="w-14 text-center">In-App</span>
              <span className="w-14 text-center">Email</span>
              <span className="w-14 text-center">Slack</span>
            </div>
            {cat.items.map((item) => (
              <div key={item.label} className="flex items-center gap-3 px-3 py-2 rounded-lg glass-surface">
                <span className="text-xs flex-1">{item.label}</span>
                <div className="w-14 flex justify-center"><Switch defaultChecked={item.inApp} /></div>
                <div className="w-14 flex justify-center"><Switch defaultChecked={item.email} /></div>
                <div className="w-14 flex justify-center"><Switch defaultChecked={item.slack} /></div>
              </div>
            ))}
          </div>
        </GlassCard>
      ))}

      <div className="flex justify-end">
        <Button className="btn-premium text-white text-sm">
          <CheckCircle2 className="h-4 w-4 mr-2" />Save Preferences
        </Button>
      </div>
    </div>
  );
}

function SystemHealthTab() {
  const agents = [
    { name: "Prospect Intelligence", section: "Outreach", status: "operational", lastRun: "2 min ago", calls: 142 },
    { name: "Social Command Center", section: "Outreach", status: "operational", lastRun: "30 sec ago", calls: 89 },
    { name: "Lead Qualification", section: "CRM", status: "operational", lastRun: "1 min ago", calls: 78 },
    { name: "Deal Intelligence", section: "CRM", status: "operational", lastRun: "5 min ago", calls: 56 },
    { name: "Content Strategist", section: "Marketing", status: "operational", lastRun: "10 min ago", calls: 34 },
    { name: "Creative Production", section: "Production", status: "warning", lastRun: "15 min ago", calls: 23 },
    { name: "Operations Manager", section: "Admin", status: "operational", lastRun: "3 min ago", calls: 67 },
    { name: "Billing & Revenue", section: "Finance", status: "operational", lastRun: "20 min ago", calls: 12 },
    { name: "Legal & Compliance", section: "Cross-System", status: "operational", lastRun: "1 min ago", calls: 198 },
  ];

  const apis = [
    { name: "Claude API (Anthropic)", status: "healthy", latency: "320ms", uptime: "99.9%" },
    { name: "OpenAI (DALL-E 3)", status: "healthy", latency: "1.2s", uptime: "99.7%" },
    { name: "Runway ML", status: "degraded", latency: "3.4s", uptime: "98.2%" },
    { name: "ElevenLabs", status: "healthy", latency: "450ms", uptime: "99.8%" },
    { name: "Hunter.io", status: "healthy", latency: "200ms", uptime: "99.9%" },
    { name: "SendGrid", status: "healthy", latency: "180ms", uptime: "99.9%" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">System Status</p>
            <p className="text-lg font-bold text-success">Operational</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Active Agents</p>
            <p className="text-lg font-bold">32 / 32</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">API Calls Today</p>
            <p className="text-lg font-bold text-crimson">699</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Database</p>
            <p className="text-lg font-bold text-success">Healthy</p>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Agent Status</h3>
          <Button size="sm" variant="outline" className="text-xs">
            <Activity className="h-3 w-3 mr-1" />Run Health Check
          </Button>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
            <span className="flex-1">Agent</span>
            <span className="w-20">Section</span>
            <span className="w-20 text-center">Status</span>
            <span className="w-20 text-center">Last Run</span>
            <span className="w-16 text-center">Calls</span>
          </div>
          {agents.map((agent) => (
            <div key={agent.name} className="flex items-center gap-3 px-3 py-2 rounded-lg glass-surface">
              <div className="flex items-center gap-2 flex-1">
                <div className={`h-2 w-2 rounded-full ${agent.status === "operational" ? "bg-success" : "bg-yellow-400"}`} />
                <span className="text-xs font-medium">{agent.name}</span>
              </div>
              <span className="w-20 text-[10px] text-muted-foreground">{agent.section}</span>
              <div className="w-20 flex justify-center">
                <Badge variant="outline" className={`text-[9px] ${
                  agent.status === "operational" ? "text-success border-success/20" : "text-yellow-400 border-yellow-500/20"
                }`}>{agent.status}</Badge>
              </div>
              <span className="w-20 text-center text-[10px] text-muted-foreground">{agent.lastRun}</span>
              <span className="w-16 text-center text-[10px]">{agent.calls}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">API Health</h3>
        <div className="space-y-2">
          {apis.map((api) => (
            <div key={api.name} className="flex items-center gap-3 p-3 rounded-lg glass-surface">
              <div className={`h-2.5 w-2.5 rounded-full ${api.status === "healthy" ? "bg-success" : "bg-yellow-400"}`} />
              <div className="flex-1">
                <p className="text-sm font-medium">{api.name}</p>
              </div>
              <div className="flex items-center gap-4 text-[10px]">
                <span className="text-muted-foreground">Latency: <span className="text-white">{api.latency}</span></span>
                <span className="text-muted-foreground">Uptime: <span className="text-success">{api.uptime}</span></span>
                <Badge variant="outline" className={`text-[9px] ${
                  api.status === "healthy" ? "text-success border-success/20" : "text-yellow-400 border-yellow-500/20"
                }`}>{api.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Database Stats</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total Records", value: "2,847" },
            { label: "Leads", value: "342" },
            { label: "Contacts", value: "1,205" },
            { label: "Assets", value: "156" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg glass-surface p-3 text-center">
              <p className="text-lg font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  return (
    <div className="max-w-[1600px] mx-auto w-full space-y-6">
      <PageHeader
        title="Settings"
        subtitle="System configuration, AI modes, wallet, team, and integrations"
        icon={<Settings className="h-5 w-5" />}
      />

      <PremiumTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "general" && <GeneralTab />}
        {activeTab === "ai-modes" && <AiModesTab />}
        {activeTab === "wallet" && <WalletTab />}
        {activeTab === "users" && <UsersTab />}
        {activeTab === "channels" && <ChannelsTab />}
        {activeTab === "integrations" && <IntegrationsTab />}
        {activeTab === "api-keys" && <ApiKeysTab />}
        {activeTab === "legal" && <LegalComplianceTab />}
        {activeTab === "notifications" && <NotificationsTab />}
        {activeTab === "system-health" && <SystemHealthTab />}
      </motion.div>
    </div>
  );
}
