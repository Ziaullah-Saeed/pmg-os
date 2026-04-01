import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { AiModeProvider } from "@/hooks/use-ai-mode-context";
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
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AppRouter() {
  return (
    <AiModeProvider>
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
          <Route component={NotFound} />
        </Switch>
      </SidebarLayout>
    </AiModeProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
