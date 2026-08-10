import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { PremiumTabs } from "@/components/ui/premium-tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAiModeContext } from "@/hooks/use-ai-mode-context";
import {
  Settings, Brain, Wallet, Users, Radio, Shield, Globe, Key,
  Linkedin, Facebook, Twitter, Youtube, Mail, MessageSquare,
  CheckCircle2, AlertCircle, Zap, Bot, User, ArrowLeftRight,
  Building2, Bell, Activity, FileText, Lock, Scale, Eye,
  AlertTriangle, Database, Palette, Sparkles, Plus, X, RefreshCw
} from "lucide-react";
import {
  useApolloStatus, useTestApollo, useConnectApollo, useDisconnectApollo,
  useWalletBalance, useWalletAnalytics, useAgents, useAgentStats, useIntegrationStatus,
  useWalletThresholds, useUpsertThreshold,
  useAiCheckCompliance, useChannelHealth, useOptOutList, useAddOptOut, useRemoveOptOut,
  useAiOutputs, useSaveAiOutput,
} from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

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
        <p className="text-xs text-muted-foreground mb-4">
          Not yet supported — the mode engine resolves at global, per-workflow, and per-record levels only. All sections currently follow the Global mode above.
        </p>
        <GlassCard>
          <div className="space-y-3">
            {sections.map((section) => (
              <div key={section.id} className="flex items-center justify-between p-3 rounded-lg glass-surface opacity-60">
                <span className="text-sm font-medium">{section.label}</span>
                <div title="Per-section overrides are not yet supported">
                  <Select value="inherit" disabled>
                    <SelectTrigger className="w-44 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">Inherit Global ({currentMode === "ai_auto" ? "Auto" : currentMode === "hybrid" ? "Hybrid" : "Manual"})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function WalletTab() {
  const { data: wallet } = useWalletBalance();
  const { data: analytics } = useWalletAnalytics();
  const { data: thresholds } = useWalletThresholds();
  const upsertThreshold = useUpsertThreshold();
  const { toast } = useToast();
  const fmt = (n?: number) => (n == null ? "—" : `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  const globalThreshold = (Array.isArray(thresholds) ? thresholds : []).find((t: any) => t.scopeType === "global" && t.scopeId === "global");
  const [dailyLimit, setDailyLimit] = useState<string>("");
  useEffect(() => {
    if (globalThreshold?.dailyLimit != null) setDailyLimit(String(Number(globalThreshold.dailyLimit)));
  }, [globalThreshold?.dailyLimit]);

  const saveDailyLimit = () => {
    const val = parseFloat(dailyLimit);
    if (Number.isNaN(val) || val < 0) {
      toast({ title: "Enter a valid limit", description: "Daily limit must be a non-negative number.", variant: "destructive" });
      return;
    }
    upsertThreshold.mutate({ scopeType: "global", scopeId: "global", dailyLimit: val, enabled: true }, {
      onSuccess: () => toast({ title: "Daily limit saved", description: `Global AI spend capped at $${val}/day` }),
      onError: (err: any) => toast({ title: "Save failed", description: err?.message || "Request failed", variant: "destructive" }),
    });
  };
  const byDomain: any[] = Array.isArray(analytics?.byDomain) ? analytics.byDomain : [];
  const maxDomainSpend = Math.max(1, ...byDomain.map((d: any) => Number(d.spent) || 0));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard glow="crimson">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
            <p className="text-3xl font-bold text-crimson">{fmt(wallet?.balance)}</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">This Month Spent</p>
            <p className="text-3xl font-bold">{fmt(analytics?.month?.spent)}</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Available Balance</p>
            <p className="text-3xl font-bold text-success">{fmt(wallet?.availableBalance)}</p>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Spend by Section</h3>
          <span className="text-[10px] text-muted-foreground">Today: {fmt(analytics?.today?.spent)} · {analytics?.today?.transactions ?? 0} calls</span>
        </div>
        {byDomain.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No AI spend recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {byDomain.map((d: any) => (
              <div key={d.domain ?? "unknown"} className="p-3 rounded-lg glass-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize">{d.domain ?? "unknown"}</span>
                  <span className="text-xs text-muted-foreground">{fmt(Number(d.spent))} · {d.transactions ?? 0} calls</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-crimson to-crimson/60 transition-all"
                    style={{ width: `${((Number(d.spent) || 0) / maxDomainSpend) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-4">Spending Controls</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm">Global daily spend limit</Label>
              <p className="text-xs text-muted-foreground">Blocks AI calls once total spend today exceeds this ($/day). Enforced by the wallet engine.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} placeholder="none" className="w-24 h-8 text-sm" />
              <Button size="sm" className="text-xs h-8" onClick={saveDailyLimit} disabled={upsertThreshold.isPending}>
                {upsertThreshold.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-between opacity-60">
            <div>
              <Label className="text-sm">Auto-pause when balance low</Label>
              <p className="text-xs text-muted-foreground">Not yet wired — the wallet engine has no auto-pause hook.</p>
            </div>
            <Switch disabled />
          </div>
          <div className="flex items-center justify-between opacity-60">
            <div>
              <Label className="text-sm">Low balance threshold</Label>
              <p className="text-xs text-muted-foreground">Not yet wired — no balance-floor alerting in the backend.</p>
            </div>
            <Input type="number" defaultValue="50" disabled className="w-24 h-8 text-sm" title="Balance-floor alerting not built yet" />
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
        <Button className="btn-premium text-white text-sm" disabled title="User invitation flow not built yet">
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
              <Button variant="outline" size="sm" className="text-xs" disabled title={`${ch.name} channel integration not configured yet`}>
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
        <h3 className="text-sm font-semibold mb-1">Planned Integrations</h3>
        <p className="text-xs text-muted-foreground mb-4">Reference list — not yet wired to live connections. Live connection status appears under System Health once connected.</p>
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
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{int.name}</p>
                    <Badge variant="outline" className="text-[10px] border-muted-foreground/30">Not connected</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{int.description}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-xs" disabled title={`${int.name} integration not configured yet`}>
                Configure
              </Button>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

function ApolloConnectionCard() {
  const { toast } = useToast();
  const { data: status, isLoading } = useApolloStatus();
  const connectApollo = useConnectApollo();
  const testApollo = useTestApollo();
  const disconnectApollo = useDisconnectApollo();
  const [apiKey, setApiKey] = useState("");

  const connected = status?.connected ?? false;
  const busy = connectApollo.isPending || testApollo.isPending || disconnectApollo.isPending;

  const runTest = async () => {
    try {
      const result = await testApollo.mutateAsync();
      if (result.connected) {
        toast({ title: "Apollo connected", description: result.message });
      } else {
        toast({ title: "Apollo not verified", description: result.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Apollo test failed", description: err.message ?? "Unknown error", variant: "destructive" });
    }
  };

  const handleConnect = async () => {
    if (!apiKey.trim()) return;
    try {
      await connectApollo.mutateAsync(apiKey.trim());
      setApiKey("");
      await runTest();
    } catch (err: any) {
      toast({ title: "Could not save Apollo key", description: err.message ?? "Unknown error", variant: "destructive" });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectApollo.mutateAsync();
      toast({ title: "Apollo disconnected", description: "Prospect Finder is back on sample data." });
    } catch (err: any) {
      toast({ title: "Disconnect failed", description: err.message ?? "Unknown error", variant: "destructive" });
    }
  };

  return (
    <GlassCard>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-crimson/80 to-crimson/40 flex items-center justify-center text-white shrink-0">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">Apollo.io</p>
              {connected ? (
                <Badge variant="outline" className="text-[10px] border-success/40 text-success">
                  <CheckCircle2 className="h-3 w-3 mr-1" />Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] border-gold/40 text-gold">
                  <AlertTriangle className="h-3 w-3 mr-1" />Sample data
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Lead-generation data layer — prospect search &amp; email/phone enrichment.
            </p>
          </div>
        </div>
        {connected && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={runTest} disabled={busy}>
              {testApollo.isPending ? "Testing…" : "Test Connection"}
            </Button>
            <Button variant="outline" size="sm" className="text-xs text-crimson border-crimson/30" onClick={handleDisconnect} disabled={busy}>
              Disconnect
            </Button>
          </div>
        )}
      </div>

      {!isLoading && !connected && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            {status?.fixtureNotice ?? "Apollo is not connected — Prospect Finder shows labeled sample data. Add your master API key to go live."}
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="password"
              autoComplete="off"
              placeholder="Apollo master API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-white/5 border-white/10 text-sm"
            />
            <Button size="sm" className="text-xs shrink-0" onClick={handleConnect} disabled={busy || !apiKey.trim()}>
              <Key className="h-3 w-3 mr-1" />{connectApollo.isPending ? "Saving…" : "Connect"}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Create a master key in Apollo → Settings → API Keys. Search is free; only enrichment/reveal consumes credits.
          </p>
        </div>
      )}

      {connected && (
        <div className="mt-3 text-xs text-muted-foreground space-y-1">
          {status?.lastVerifiedAt && (
            <p>Last verified: {new Date(status.lastVerifiedAt).toLocaleString()}{status.lastStatus ? ` · ${status.lastStatus}` : ""}</p>
          )}
          {status?.lastError && <p className="text-crimson">Last error: {status.lastError}</p>}
        </div>
      )}
    </GlassCard>
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

      <ApolloConnectionCard />

      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-2 mb-1">Planned keys</h4>
        <p className="text-[10px] text-muted-foreground mb-3">Reference list — not yet wired to live connections.</p>
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
                <Button variant="outline" size="sm" className="text-xs" disabled title={`${k.service} key management not wired yet`}>
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
              <Button size="sm" variant="outline" className="text-xs" disabled title="Logo upload not built yet">
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
        <Button className="btn-premium text-white text-sm" disabled title="Company settings persistence not built yet">
          <CheckCircle2 className="h-4 w-4 mr-2" />Save Changes
        </Button>
      </div>
    </div>
  );
}

const CHANNEL_LABELS: Record<string, string> = { email: "Email", sms: "SMS", linkedin_message: "LinkedIn" };

function LegalComplianceTab() {
  const checkCompliance = useAiCheckCompliance();
  const saveOutput = useSaveAiOutput();
  const { data: checks } = useAiOutputs("compliance_check", { domain: "legal", limit: 10 });
  const { data: channelData } = useChannelHealth();
  const { data: optOutData } = useOptOutList();
  const addOptOut = useAddOptOut();
  const removeOptOut = useRemoveOptOut();
  const { toast } = useToast();

  const [contentType, setContentType] = useState("email");
  const [channel, setChannel] = useState("email");
  const [content, setContent] = useState("");
  const [newOptOut, setNewOptOut] = useState("");

  const checkList = checks ?? [];
  const health: Record<string, any> = channelData?.health ?? {};
  const limits: Record<string, any> = channelData?.limits ?? {};
  const optOuts: string[] = Array.isArray(optOutData?.contacts) ? optOutData.contacts : [];

  const runCheck = () => {
    if (!content.trim()) return;
    checkCompliance.mutate({ contentType, content, channel }, {
      onSuccess: (data: any) => {
        const text = String(data?.compliance ?? data?.result ?? "");
        saveOutput.mutate({
          domain: "legal",
          kind: "compliance_check",
          title: `${contentType.replace(/_/g, " ")} · ${CHANNEL_LABELS[channel] ?? channel} — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
          summary: text.slice(0, 280),
          data: { content: text },
        });
        toast({ title: "Compliance Check Complete", description: "Saved to history below" });
      },
      onError: (err: any) => toast({ title: "Compliance check failed", description: err?.message || "Request failed", variant: "destructive" }),
    });
  };

  const handleAddOptOut = () => {
    const email = newOptOut.trim();
    if (!email) return;
    addOptOut.mutate(email, {
      onSuccess: () => { setNewOptOut(""); toast({ title: "Added to opt-out list", description: email }); },
      onError: (err: any) => toast({ title: "Could not add", description: err?.message || "Request failed", variant: "destructive" }),
    });
  };

  const handleRemoveOptOut = (email: string) => {
    removeOptOut.mutate(email, {
      onSuccess: () => toast({ title: "Removed from opt-out list", description: email }),
      onError: (err: any) => toast({ title: "Could not remove", description: err?.message || "Request failed", variant: "destructive" }),
    });
  };

  return (
    <div className="space-y-6">
      <GlassCard>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg glass-surface text-crimson"><Scale className="h-5 w-5" /></div>
          <div>
            <h3 className="text-sm font-semibold">Compliance Checker</h3>
            <p className="text-xs text-muted-foreground">AI checks content against CAN-SPAM, GDPR, TCPA, and platform ad policies before you send.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <Label className="text-xs">Content type</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="linkedin_message">LinkedIn message</SelectItem>
                <SelectItem value="ad">Ad copy</SelectItem>
                <SelectItem value="blog_post">Blog post</SelectItem>
                <SelectItem value="landing_page">Landing page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Channel</Label>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="google">Google Ads</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Textarea placeholder="Paste the content to check for compliance…" value={content} onChange={(e) => setContent(e.target.value)}
          className="bg-white/5 border-white/10 text-sm min-h-[110px]" />
        <div className="flex justify-end mt-3">
          <Button size="sm" className="btn-premium text-white text-xs" onClick={runCheck} disabled={checkCompliance.isPending || !content.trim()}>
            {checkCompliance.isPending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}Run Compliance Check
          </Button>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Compliance Reports</h3>
          <Badge variant="outline" className="text-[10px]">{checkList.length} saved</Badge>
        </div>
        {checkList.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No compliance checks run yet — use the checker above.</p>
        ) : (
          <div className="space-y-3">
            {checkList.map((c) => (
              <div key={c.id} className="p-3 rounded-lg glass-surface">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/5">
                  <Shield className="h-3.5 w-3.5 text-crimson" />
                  <p className="text-xs font-semibold flex-1">{c.title}</p>
                  <span className="text-[10px] text-muted-foreground">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{(c.data?.content ?? c.summary) || "—"}</p>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Channel Health & Rate Limits</h3>
        <p className="text-xs text-muted-foreground mb-3">Live bounce/complaint tracking and daily send caps per channel (resets daily).</p>
        <div className="space-y-2">
          {["email", "sms", "linkedin_message"].map((ch) => {
            const m = health[ch] ?? {};
            const l = limits[ch] ?? {};
            const status = m.status ?? "healthy";
            return (
              <div key={ch} className="flex items-center gap-3 p-3 rounded-lg glass-surface">
                <div className={`h-2.5 w-2.5 rounded-full ${status === "critical" ? "bg-crimson" : status === "warning" ? "bg-yellow-400" : status === "paused" ? "bg-muted-foreground" : "bg-success"}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{CHANNEL_LABELS[ch] ?? ch}</p>
                    <Badge variant="outline" className={`text-[9px] ${status === "critical" ? "text-crimson border-crimson/20" : status === "warning" ? "text-yellow-400 border-yellow-500/20" : "text-success border-success/20"}`}>{status}</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Health {m.healthScore ?? 100}/100 · Bounce {((m.bounceRate ?? 0) * 100).toFixed(1)}% · Sent today {l.sent ?? 0}/{l.limit ?? "—"} ({l.remaining ?? 0} left)
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Opt-Out List</h3>
          <Badge variant="outline" className="text-[10px]">{optOuts.length} contacts</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">Suppressed addresses — the sequence engine blocks all outbound to anyone on this list.</p>
        <div className="flex items-center gap-2 mb-3">
          <Input placeholder="email@company.com" value={newOptOut} onChange={(e) => setNewOptOut(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddOptOut(); }}
            className="bg-white/5 border-white/10 text-sm" />
          <Button size="sm" className="text-xs shrink-0" onClick={handleAddOptOut} disabled={addOptOut.isPending || !newOptOut.trim()}>
            <Plus className="h-3 w-3 mr-1" />Add
          </Button>
        </div>
        {optOuts.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No opt-outs recorded.</p>
        ) : (
          <div className="space-y-1.5">
            {optOuts.map((email) => (
              <div key={email} className="flex items-center gap-3 p-2 rounded-lg glass-surface">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs flex-1">{email}</span>
                <Button size="sm" variant="ghost" className="h-6 px-1.5 text-red-400" onClick={() => handleRemoveOptOut(email)} disabled={removeOptOut.isPending} title="Remove from opt-out list">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
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
        <Button className="btn-premium text-white text-sm" disabled title="Notification preference persistence not built yet">
          <CheckCircle2 className="h-4 w-4 mr-2" />Save Preferences
        </Button>
      </div>
    </div>
  );
}

function SystemHealthTab() {
  const qc = useQueryClient();
  const { data: agentsData, isFetching: agentsFetching } = useAgents();
  const { data: stats } = useAgentStats();
  const { data: analytics } = useWalletAnalytics();
  const { data: integrationsData } = useIntegrationStatus();

  const agents: any[] = Array.isArray(agentsData) ? agentsData : [];
  const integrations: any[] = Array.isArray(integrationsData) ? integrationsData : [];
  const errorAgents = agents.filter((a) => a.status === "error").length;
  const byProvider: any[] = Array.isArray(analytics?.byProvider) ? analytics.byProvider : [];

  const relTime = (d?: string | Date) => {
    if (!d) return "never";
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 0 || Number.isNaN(diff)) return "never";
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const runHealthCheck = () => {
    qc.invalidateQueries({ queryKey: ["agents"] });
    qc.invalidateQueries({ queryKey: ["wallet"] });
    qc.invalidateQueries({ queryKey: ["integration-hub"] });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">System Status</p>
            <p className={`text-lg font-bold ${errorAgents > 0 ? "text-yellow-400" : "text-success"}`}>
              {errorAgents > 0 ? "Degraded" : "Operational"}
            </p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Registered Agents</p>
            <p className="text-lg font-bold">{stats?.total ?? agents.length}</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">AI Calls Today</p>
            <p className="text-lg font-bold text-crimson">{analytics?.today?.transactions ?? 0}</p>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">AI Billing</p>
            <p className={`text-lg font-bold ${analytics?.dummyMode ? "text-yellow-400" : "text-success"}`}>
              {analytics?.dummyMode ? "Dummy" : "Live"}
            </p>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Agent Status</h3>
          <Button size="sm" variant="outline" className="text-xs" onClick={runHealthCheck} disabled={agentsFetching}>
            <Activity className={`h-3 w-3 mr-1 ${agentsFetching ? "animate-spin" : ""}`} />Refresh
          </Button>
        </div>
        {agents.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No agents registered.</p>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">
              <span className="flex-1">Agent</span>
              <span className="w-20">Section</span>
              <span className="w-20 text-center">Status</span>
              <span className="w-20 text-center">Last Run</span>
              <span className="w-16 text-center">Runs</span>
            </div>
            {agents.map((agent) => (
              <div key={agent.id ?? agent.name} className="flex items-center gap-3 px-3 py-2 rounded-lg glass-surface">
                <div className="flex items-center gap-2 flex-1">
                  <div className={`h-2 w-2 rounded-full ${agent.status === "error" ? "bg-crimson" : agent.status === "running" ? "bg-blue-400" : agent.status === "paused" ? "bg-muted-foreground" : "bg-success"}`} />
                  <span className="text-xs font-medium">{agent.name}</span>
                </div>
                <span className="w-20 text-[10px] text-muted-foreground capitalize">{agent.domain}</span>
                <div className="w-20 flex justify-center">
                  <Badge variant="outline" className={`text-[9px] ${
                    agent.status === "error" ? "text-crimson border-crimson/20" :
                    agent.status === "running" ? "text-blue-400 border-blue-500/20" :
                    agent.status === "paused" ? "text-muted-foreground" :
                    "text-success border-success/20"
                  }`}>{agent.status}</Badge>
                </div>
                <span className="w-20 text-center text-[10px] text-muted-foreground">{relTime(agent.lastRun)}</span>
                <span className="w-16 text-center text-[10px]">{agent.totalRuns ?? 0}</span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">Connected Integrations</h3>
        {integrations.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No integrations connected yet.</p>
        ) : (
          <div className="space-y-2">
            {integrations.map((int) => (
              <div key={int.id ?? int.provider} className="flex items-center gap-3 p-3 rounded-lg glass-surface">
                <div className={`h-2.5 w-2.5 rounded-full ${int.isActive ? "bg-success" : "bg-muted-foreground"}`} />
                <div className="flex-1">
                  <p className="text-sm font-medium capitalize">{int.provider}</p>
                </div>
                <div className="flex items-center gap-4 text-[10px]">
                  {int.lastSyncAt && <span className="text-muted-foreground">Last sync: <span className="text-white">{new Date(int.lastSyncAt).toLocaleString()}</span></span>}
                  <Badge variant="outline" className={`text-[9px] ${int.isActive ? "text-success border-success/20" : "text-muted-foreground"}`}>
                    {int.isActive ? "active" : "inactive"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="text-sm font-semibold mb-3">AI Provider Spend</h3>
        {byProvider.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">No AI provider usage recorded yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {byProvider.slice(0, 8).map((p: any) => (
              <div key={p.provider ?? "unknown"} className="rounded-lg glass-surface p-3 text-center">
                <p className="text-lg font-bold">${Number(p.spent).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-muted-foreground truncate">{p.provider ?? "unknown"} · {p.transactions ?? 0} calls</p>
              </div>
            ))}
          </div>
        )}
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
