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
  Menu
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Command Center", icon: BarChart3 },
  { href: "/intelligence", label: "Intelligence", icon: BrainCircuit },
  { href: "/outreach", label: "Outreach", icon: Target },
  { href: "/marketing", label: "Marketing", icon: Megaphone },
  { href: "/production", label: "Production", icon: Palette },
  { href: "/crm", label: "CRM Pipeline", icon: Briefcase },
  { href: "/communications", label: "Communications", icon: MessagesSquare },
  { href: "/execution", label: "Execution", icon: Zap },
  { href: "/finance", label: "Finance & Legal", icon: Landmark },
  { href: "/reports", label: "Reports", icon: FileBox },
  { href: "/system", label: "System", icon: Settings },
];

export function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const NavLinks = () => (
    <nav className="space-y-1 mt-6">
      {navItems.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex items-center gap-3 px-4 py-2.5 mx-2 rounded-md transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              }`}
            >
              <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
              <span className="text-sm">{item.label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Nav */}
      <header className="md:hidden border-b border-border bg-card p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-primary rounded-sm flex items-center justify-center">
            <div className="h-3 w-3 bg-background rounded-full" />
          </div>
          <span className="font-bold text-lg tracking-tight">PMG OS</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0 border-r-border bg-background">
            <div className="p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 bg-primary rounded-sm flex items-center justify-center">
                  <div className="h-3 w-3 bg-background rounded-full" />
                </div>
                <span className="font-bold text-lg tracking-tight">PMG OS</span>
              </div>
            </div>
            <NavLinks />
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-sm sticky top-0 h-screen shrink-0">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
             <div className="h-6 w-6 bg-primary rounded-sm flex items-center justify-center">
              <div className="h-3 w-3 bg-background rounded-full" />
            </div>
            <span className="font-bold text-lg tracking-tight">PMG OS</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-none py-4">
          <NavLinks />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
