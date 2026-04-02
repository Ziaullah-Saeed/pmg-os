import { Link, useLocation } from "wouter";
import {
  BarChart3,
  BrainCircuit,
  Target,
  Megaphone,
  Palette,
  Briefcase,
  MessagesSquare,
  Zap,
  Landmark,
  FileBox,
  Settings,
  Menu,
  Bot,
  Shield,
  ShieldCheck,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Workflow,
  User,
  ArrowLeftRight,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NotificationBell } from "@/components/notification-bell";
import { AiModeToggle } from "@/components/ai-mode-toggle";
import { WalletDisplay } from "@/components/wallet-display";
import { GlobalSearch } from "@/components/global-search";
import { useAuth } from "@/hooks/use-auth";
import { LogOut } from "lucide-react";

const navItems = [
  { href: "/", label: "Command Center", icon: BarChart3, domain: "command" },
  { href: "/intelligence", label: "Intelligence", icon: BrainCircuit, domain: "intelligence" },
  { href: "/outreach", label: "Outreach", icon: Target, domain: "outreach" },
  { href: "/marketing", label: "Marketing", icon: Megaphone, domain: "marketing" },
  { href: "/production", label: "Production", icon: Palette, domain: "production" },
  { href: "/crm", label: "CRM Pipeline", icon: Briefcase, domain: "crm" },
  { href: "/communications", label: "Communications", icon: MessagesSquare, domain: "comms" },
  { href: "/execution", label: "Execution", icon: Zap, domain: "execution" },
  { href: "/finance", label: "Finance & Legal", icon: Landmark, domain: "finance" },
  { href: "/reports", label: "Reports & Archive", icon: FileBox, domain: "reports" },
  { href: "/automation", label: "Automation", icon: Workflow, domain: "automation" },
  { href: "/quality", label: "Quality", icon: ShieldCheck, domain: "quality" },
  { href: "/admin", label: "Administrative", icon: BookOpen, domain: "admin" },
  { href: "/system", label: "System", icon: Settings, domain: "system" },
];

const modeItems = [
  { href: "/auto", label: "AI Auto", icon: Bot, domain: "mode" },
  { href: "/hybrid", label: "Hybrid", icon: ArrowLeftRight, domain: "mode" },
  { href: "/human", label: "Manual", icon: User, domain: "mode" },
];

function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="relative h-8 w-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
        <div className="absolute inset-0 bg-gradient-to-br from-crimson to-crimson/70" />
        <div className="absolute inset-0 opacity-30 bg-gradient-to-t from-transparent to-white/10" />
        <Shield className="h-4 w-4 text-white relative z-10" />
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="font-bold text-base tracking-tight whitespace-nowrap">
              PMG <span className="text-crimson">OS</span>
            </div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest -mt-0.5 whitespace-nowrap">
              AI Operating System
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AiModeIndicator({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg glass-surface",
      collapsed && "justify-center px-2"
    )}>
      <div className="relative">
        <Bot className="h-4 w-4 text-info" />
        <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success animate-pulse" />
      </div>
      {!collapsed && (
        <div className="overflow-hidden">
          <div className="text-[10px] uppercase tracking-wider text-info font-medium whitespace-nowrap">AI Active</div>
          <div className="text-[9px] text-muted-foreground whitespace-nowrap">Hybrid Mode</div>
        </div>
      )}
    </div>
  );
}

function NavLink({
  item,
  isActive,
  collapsed,
}: {
  item: typeof navItems[0];
  isActive: boolean;
  collapsed?: boolean;
}) {
  return (
    <Link href={item.href}>
      <div
        className={cn(
          "nav-item-glow flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg transition-all duration-200 cursor-pointer group relative",
          isActive
            ? "nav-item-glow-active glass-surface text-foreground"
            : "text-muted-foreground hover:text-foreground hover:glass-surface",
          collapsed && "justify-center mx-1 px-2"
        )}
      >
        <item.icon className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive ? "text-crimson" : "group-hover:text-foreground"
        )} />
        {!collapsed && (
          <span className="text-sm font-medium truncate">{item.label}</span>
        )}
        {isActive && (
          <motion.div
            layoutId="navActive"
            className="absolute inset-0 rounded-lg glass-surface -z-10"
            transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
          />
        )}
      </div>
    </Link>
  );
}

function UserProfile({ collapsed }: { collapsed?: boolean }) {
  const { user, logout } = useAuth();
  const initials = user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() || "??";
  const roleName = user?.role?.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) || "User";

  return (
    <div className={cn("p-3 border-t border-border/30", collapsed && "p-2")}>
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg glass-surface",
        collapsed && "justify-center"
      )}>
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-crimson/80 to-crimson/40 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {initials}
        </div>
        {!collapsed && (
          <>
            <div className="overflow-hidden flex-1">
              <div className="text-xs font-medium truncate">{user?.name || "Unknown"}</div>
              <div className="text-[10px] text-muted-foreground truncate">{roleName}</div>
            </div>
            <button
              onClick={() => logout()}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row gradient-bg-atmosphere">
      <header className="md:hidden border-b border-border glass-panel p-4 flex items-center justify-between sticky top-0 z-50">
        <Logo />
        <div className="flex items-center gap-2">
          <AiModeIndicator collapsed />
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden btn-glass">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 border-r-border glass-panel">
              <div className="p-5 border-b border-border">
                <Logo />
              </div>
              <div className="p-3">
                <AiModeIndicator />
              </div>
              <nav className="space-y-0.5 mt-2 pb-4">
                {navItems.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={location === item.href}
                  />
                ))}
                <div className="mx-3 my-2 border-t border-border/30" />
                <div className="px-3 py-1">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Operating Mode</span>
                </div>
                {modeItems.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={location === item.href}
                  />
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <aside className={cn(
        "hidden md:flex flex-col border-r border-border/50 sticky top-0 h-screen shrink-0 transition-all duration-300",
        collapsed ? "w-16" : "w-60",
        "bg-gradient-to-b from-[hsl(222_47%_3%)] via-[hsl(214_65%_5%)] to-[hsl(222_47%_3%)]"
      )}>
        <div className={cn(
          "p-4 border-b border-border/30 flex items-center",
          collapsed ? "justify-center" : "justify-between"
        )}>
          <Logo collapsed={collapsed} />
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <div className={cn("p-2", collapsed ? "px-1.5" : "px-3")}>
          <AiModeToggle collapsed={collapsed} />
        </div>

        <div className={cn("px-2", collapsed ? "px-1.5" : "px-3")}>
          <WalletDisplay collapsed={collapsed} />
        </div>

        <nav className="flex-1 overflow-y-auto py-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={location === item.href}
              collapsed={collapsed}
            />
          ))}
          <div className={cn("my-2 border-t border-border/30", collapsed ? "mx-1.5" : "mx-3")} />
          {!collapsed && (
            <div className="px-5 py-1">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Operating Mode</span>
            </div>
          )}
          {modeItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={location === item.href}
              collapsed={collapsed}
            />
          ))}
        </nav>

        <UserProfile collapsed={collapsed} />
      </aside>

      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        <div className="hidden md:flex items-center justify-end gap-3 px-6 py-3 border-b border-border/30">
          <GlobalSearch />
          <NotificationBell />
        </div>
        <div className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
