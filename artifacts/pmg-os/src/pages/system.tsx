import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Settings, CheckCircle2, Database, Shield, Server } from "lucide-react";
import { useHealthCheck } from "@workspace/api-client-react";

export default function System() {
  const { data: health } = useHealthCheck();

  const modules = [
    { name: "Command Center", status: "active", domain: "dashboard" },
    { name: "Intelligence & Research", status: "active", domain: "intelligence" },
    { name: "Outreach & Prospecting", status: "active", domain: "outreach" },
    { name: "Marketing & Campaigns", status: "active", domain: "marketing" },
    { name: "Production Studio", status: "active", domain: "production" },
    { name: "Execution & Operations", status: "active", domain: "execution" },
    { name: "CRM Pipeline", status: "active", domain: "crm" },
    { name: "Communications", status: "active", domain: "communications" },
    { name: "Finance & Legal", status: "active", domain: "finance" },
    { name: "Reports & Archive", status: "active", domain: "reports" },
    { name: "System & Governance", status: "active", domain: "system" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          System & Governance
        </h1>
        <p className="text-muted-foreground mt-1">Permissions, integrations, and configuration.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">API Status</p>
                <p className="text-2xl font-bold mt-1 text-green-400">
                  {health?.status === 'ok' ? 'Healthy' : 'Checking...'}
                </p>
              </div>
              <Server className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Database</p>
                <p className="text-2xl font-bold mt-1 text-green-400">Connected</p>
              </div>
              <Database className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Modules Active</p>
                <p className="text-2xl font-bold mt-1">{modules.length}</p>
              </div>
              <Shield className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>System Modules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {modules.map((mod) => (
              <div key={mod.domain} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-background/50">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  <span className="font-medium">{mod.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize text-xs">{mod.domain}</Badge>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader>
          <CardTitle>Platform Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Platform</p>
              <p className="font-medium">PMG Group OS v1.0</p>
            </div>
            <div>
              <p className="text-muted-foreground">Organization</p>
              <p className="font-medium">PMG Group LLC</p>
            </div>
            <div>
              <p className="text-muted-foreground">Industry</p>
              <p className="font-medium">Cybersecurity & IT Services</p>
            </div>
            <div>
              <p className="text-muted-foreground">Architecture</p>
              <p className="font-medium">AI-Native Enterprise OS</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
