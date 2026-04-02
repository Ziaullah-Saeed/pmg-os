import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { AiModeProvider } from "@/hooks/use-ai-mode-context";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { OverlayProvider } from "@/hooks/use-overlay";
import Dashboard from "@/pages/dashboard";
import Intelligence from "@/pages/intelligence";
import Outreach from "@/pages/outreach";
import CRM from "@/pages/crm";
import Marketing from "@/pages/marketing";
import Production from "@/pages/production";
import Communications from "@/pages/communications";
import Execution from "@/pages/execution";
import Finance from "@/pages/finance";
import Reports from "@/pages/reports";
import System from "@/pages/system";
import Automation from "@/pages/automation";
import Quality from "@/pages/quality";
import Admin from "@/pages/admin";
import Login from "@/pages/login";
import AiAuto from "@/pages/ai-auto";
import Hybrid from "@/pages/hybrid";
import Human from "@/pages/human";
import Agents from "@/pages/agents";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AppRouter() {
  const { isAuthenticated, isLoading } = useAuth();
  useWebSocket();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg-atmosphere">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-crimson/20 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading PMG OS...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <AiModeProvider>
      <OverlayProvider>
        <SidebarLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/intelligence" component={Intelligence} />
            <Route path="/outreach" component={Outreach} />
            <Route path="/marketing" component={Marketing} />
            <Route path="/production" component={Production} />
            <Route path="/crm" component={CRM} />
            <Route path="/communications" component={Communications} />
            <Route path="/execution" component={Execution} />
            <Route path="/finance" component={Finance} />
            <Route path="/reports" component={Reports} />
            <Route path="/system" component={System} />
            <Route path="/automation" component={Automation} />
            <Route path="/quality" component={Quality} />
            <Route path="/admin" component={Admin} />
            <Route path="/auto" component={AiAuto} />
            <Route path="/hybrid" component={Hybrid} />
            <Route path="/human" component={Human} />
            <Route path="/agents" component={Agents} />
            <Route component={NotFound} />
          </Switch>
        </SidebarLayout>
      </OverlayProvider>
    </AiModeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
