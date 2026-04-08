import { useState, useRef, useEffect } from "react";
import { useNotifications, useUnreadCount, useMarkNotificationRead, useMarkAllRead, useDismissNotification } from "@/hooks/use-api";
import { Button } from "@/components/ui/button";
import { Bell, Check, CheckCheck, X, Bot, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

const domainRoutes: Record<string, string> = {
  outreach: "/outreach",
  crm: "/crm",
  marketing: "/marketing",
  production: "/production",
  admin: "/admin",
  finance: "/finance",
  settings: "/settings",
  system: "/settings",
  intelligence: "/outreach",
  pipeline: "/crm",
  communications: "/outreach",
  execution: "/admin",
  billing: "/finance",
  command_center: "/",
  library: "/admin",
  compliance: "/admin",
  finance_legal: "/finance",
  integration: "/settings",
  legal: "/admin",
  reports: "/admin",
};

const severityConfig: Record<string, { icon: typeof Info; color: string }> = {
  info: { icon: Info, color: "text-blue-400" },
  warning: { icon: AlertTriangle, color: "text-yellow-400" },
  error: { icon: AlertCircle, color: "text-red-400" },
  success: { icon: Check, color: "text-green-400" },
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: notifications } = useNotifications(20);
  const { data: unread } = useUnreadCount();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const dismiss = useDismissNotification();
  const [, navigate] = useLocation();

  const count = unread?.count ?? 0;
  const items = notifications ?? [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="icon" className="relative text-slate-400 hover:text-white" onClick={() => setOpen(!open)}>
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-crimson-500 text-[10px] font-bold text-white flex items-center justify-center animate-in zoom-in-50">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] rounded-lg border border-white/10 bg-[hsl(214,65%,6%)] shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {count > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => markAll.mutate()}
                className="text-xs text-slate-400 hover:text-white h-7"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No notifications
              </div>
            ) : (
              items.map((n: any) => {
                const sev = severityConfig[n.severity] ?? severityConfig.info;
                const Icon = sev.icon;
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer",
                      !n.isRead && "bg-white/[0.02]"
                    )}
                    onClick={() => {
                      if (!n.isRead) markRead.mutate(n.id);
                      const route = n.actionUrl || domainRoutes[n.domain] || null;
                      if (route) {
                        navigate(route);
                        setOpen(false);
                      }
                    }}
                  >
                    <div className={cn("mt-0.5 flex-shrink-0", sev.color)}>
                      {n.actor === "ai_system" ? <Bot className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium", n.isRead ? "text-slate-400" : "text-white")}>
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-slate-600 mt-1">
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-600 hover:text-slate-300 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        dismiss.mutate(n.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
