import { useState, useRef, useEffect } from "react";
import { useGlobalSearch } from "@/hooks/use-api";
import { Search, X, Building2, User, Target, Briefcase, CheckSquare, FileText, Megaphone } from "lucide-react";
import { useLocation } from "wouter";

const entityIcons: Record<string, React.ReactNode> = {
  company: <Building2 className="h-3.5 w-3.5" />,
  contact: <User className="h-3.5 w-3.5" />,
  lead: <Target className="h-3.5 w-3.5" />,
  opportunity: <Briefcase className="h-3.5 w-3.5" />,
  task: <CheckSquare className="h-3.5 w-3.5" />,
  document: <FileText className="h-3.5 w-3.5" />,
  campaign: <Megaphone className="h-3.5 w-3.5" />,
};

const entityRoutes: Record<string, string> = {
  company: "/crm",
  contact: "/crm",
  lead: "/crm",
  opportunity: "/crm",
  task: "/admin",
  document: "/admin",
  campaign: "/marketing",
};

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useGlobalSearch(query);
  const ref = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass-surface border border-white/5 hover:border-white/10 transition-colors text-sm text-muted-foreground min-w-[200px]"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Search...</span>
        <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono">⌘K</kbd>
      </button>

      {open && (
        <div className="absolute top-full mt-2 left-0 right-0 w-[400px] glass-panel border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-white/5">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search leads, companies, contacts, deals..."
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-[320px] overflow-y-auto">
            {isLoading && query.length >= 2 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">Searching...</div>
            )}

            {data?.results && data.results.length > 0 && (
              <div className="py-1">
                {data.results.map((r, i) => (
                  <button
                    key={`${r.entityType}-${r.id}-${i}`}
                    onClick={() => {
                      navigate(entityRoutes[r.entityType] ?? "/");
                      setOpen(false);
                      setQuery("");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="text-muted-foreground">{entityIcons[r.entityType] ?? <FileText className="h-3.5 w-3.5" />}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{r.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{r.entityType}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {data?.results && data.results.length === 0 && query.length >= 2 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">No results for "{query}"</div>
            )}

            {query.length < 2 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search across all entities
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
