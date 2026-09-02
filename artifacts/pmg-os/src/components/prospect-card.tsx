import { motion } from "framer-motion";
import {
  Building2,
  Users,
  DollarSign,
  BadgeCheck,
  ChevronRight,
  ArrowRight,
  Briefcase,
  MapPin,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ModeBadge } from "@/components/mode-badge";
import { ContactChannels } from "@/components/contact-channels";

/**
 * Rich prospect card + the reusable display bits (verified badge, tech/keyword
 * chips, company facts) shared by the pipeline list and the detail dialog. Every
 * value comes from the enriched Lead record (Apollo / PDL / website scan) — a
 * missing field is simply omitted, never fabricated.
 */

const SENIORITY_LABELS: Record<string, string> = {
  owner: "Owner",
  founder: "Founder",
  c_suite: "C-Suite",
  partner: "Partner",
  vp: "VP",
  head: "Head",
  director: "Director",
  manager: "Manager",
  senior: "Senior",
  entry: "Entry",
  intern: "Intern",
};

/** "c_suite" → "C-Suite"; unknown tokens are title-cased. */
export function humanizeSeniority(s?: string | null): string | null {
  if (!s) return null;
  const k = s.trim().toLowerCase();
  return SENIORITY_LABELS[k] ?? s.trim().replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Split a comma-joined string into trimmed, non-empty parts. */
function splitTags(s?: string | null): string[] {
  if (!s) return [];
  return s.split(",").map((t) => t.trim()).filter(Boolean);
}

/** Verified-email signal from the provider's email_status. */
export function VerifiedBadge({ status, className = "" }: { status?: string | null; className?: string }) {
  if (!status) return null;
  const s = status.toLowerCase();
  if (["verified", "valid", "likely"].includes(s)) {
    return (
      <Badge className={`bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] gap-0.5 ${className}`}>
        <BadgeCheck className="h-2.5 w-2.5" /> Verified
      </Badge>
    );
  }
  if (s.includes("catch")) {
    return (
      <Badge variant="outline" className={`text-[9px] text-amber-400/90 border-amber-400/30 ${className}`}>
        Catch-all
      </Badge>
    );
  }
  return null;
}

/** Company technology stack as compact chips (first `max`, then "+N"). */
export function TechChips({ technologies, max = 3, className = "" }: { technologies?: string | null; max?: number; className?: string }) {
  const techs = splitTags(technologies);
  if (techs.length === 0) return null;
  const shown = techs.slice(0, max);
  const extra = techs.length - shown.length;
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {shown.map((t) => (
        <span key={t} className="px-1.5 py-px rounded bg-sky-500/10 border border-sky-500/20 text-sky-300/90 text-[9px] leading-none">
          {t}
        </span>
      ))}
      {extra > 0 && <span className="text-[9px] text-muted-foreground">+{extra} tech</span>}
    </div>
  );
}

/** Industry/intent keywords as subtle chips. */
export function KeywordChips({ keywords, max = 6, className = "" }: { keywords?: string | null; max?: number; className?: string }) {
  const kws = splitTags(keywords);
  if (kws.length === 0) return null;
  const shown = kws.slice(0, max);
  const extra = kws.length - shown.length;
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className}`}>
      {shown.map((k) => (
        <span key={k} className="px-1.5 py-px rounded-full bg-crimson/10 border border-crimson/20 text-crimson/90 text-[9px] leading-none capitalize">
          {k}
        </span>
      ))}
      {extra > 0 && <span className="text-[9px] text-muted-foreground">+{extra}</span>}
    </div>
  );
}

/** Employees display — exact count wins, else the coarse size bucket. */
export function employeesLabel(lead: any): string | null {
  if (lead?.employeeCount != null && Number.isFinite(Number(lead.employeeCount))) {
    return `${Number(lead.employeeCount).toLocaleString()} employees`;
  }
  if (lead?.companySize) return `${lead.companySize} employees`;
  return null;
}

/** Labeled company-facts grid for the detail dialog. */
export function CompanyFacts({ lead }: { lead: any }) {
  const facts: Array<{ icon: any; label: string; value: string }> = [];
  const push = (icon: any, label: string, value?: string | null) => {
    if (value != null && String(value).trim()) facts.push({ icon, label, value: String(value) });
  };
  push(Building2, "Industry", lead.industry);
  push(Briefcase, "Sub-industry", lead.subIndustry);
  push(Users, "Company size", employeesLabel(lead));
  push(DollarSign, "Revenue", lead.revenue);
  push(TrendingUp, "Funding", lead.funding);
  push(MapPin, "Location", lead.contactLocation || lead.location);
  if (facts.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2">
      {facts.map((f) => (
        <div key={f.label} className="p-2 rounded-lg glass-surface">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <f.icon className="h-3 w-3" />
            {f.label}
          </p>
          <p className="text-xs font-medium mt-0.5 truncate" title={f.value}>{f.value}</p>
        </div>
      ))}
    </div>
  );
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)) || "?";
}

const CRM_STATUSES = ["qualified", "routing", "routed", "active", "closed_won", "closed_lost"];

/**
 * The pipeline prospect card — full-fidelity: name + verified badge + mode,
 * title · seniority · department, company · industry · size · revenue, a
 * technology-chip row, and the unified contact-channel icons.
 */
export function ProspectCard({
  lead,
  selected,
  onToggleSelect,
  onOpen,
  onMoveToCrm,
  showAiScored = false,
}: {
  lead: any;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onMoveToCrm: () => void;
  showAiScored?: boolean;
}) {
  const name = lead.contactName || `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || `Lead #${lead.id}`;
  const company = lead.companyName || lead.company || "";
  const seniority = humanizeSeniority(lead.seniority);
  const inCrm = CRM_STATUSES.includes(lead.status);
  const score = lead.confidenceScore ?? lead.fitScore;

  // title · seniority · department (dedupe if seniority already in the title).
  const roleParts = [
    lead.contactTitle,
    seniority && !(lead.contactTitle ?? "").toLowerCase().includes(seniority.toLowerCase()) ? seniority : null,
    lead.department,
  ].filter(Boolean);

  // company · industry · size · revenue.
  const companyParts = [company, lead.industry, employeesLabel(lead), lead.revenue].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-lg p-4 cursor-pointer hover:glass-card-interactive transition-all"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <input
            type="checkbox"
            className="h-4 w-4 accent-crimson cursor-pointer shrink-0 mt-1"
            checked={selected}
            onClick={(e) => e.stopPropagation()}
            onChange={onToggleSelect}
          />
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-crimson/30 to-crimson/10 flex items-center justify-center text-crimson text-sm font-bold shrink-0 mt-0.5">
            {initialsFor(name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium truncate">{name}</p>
              <VerifiedBadge status={lead.emailStatus} />
              <Badge variant="outline" className="text-[10px] capitalize shrink-0">{(lead.status ?? "new").replace(/_/g, " ")}</Badge>
              {lead.createdByMode && <ModeBadge mode={lead.createdByMode} />}
              {showAiScored && lead.fitScore && <Badge variant="outline" className="text-[9px] border-crimson/30 text-crimson shrink-0">AI Scored</Badge>}
            </div>
            {roleParts.length > 0 && (
              <p className="text-[11px] text-foreground/70 truncate mt-0.5">{roleParts.join(" · ")}</p>
            )}
            {companyParts.length > 0 && (
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 min-w-0">
                <Building2 className="h-3 w-3 shrink-0" />
                <span className="truncate">{companyParts.join(" · ")}</span>
              </div>
            )}
            <TechChips technologies={lead.technologies} className="mt-1" />
            <ContactChannels data={lead} sources={lead.fieldSources} className="mt-1.5" />
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {score ? (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Score</p>
              <p className="text-sm font-semibold text-crimson">{score}%</p>
            </div>
          ) : null}
          {inCrm ? (
            <Badge className="bg-success/20 text-success text-[9px] border-success/30 shrink-0">In CRM</Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="text-[10px] h-7 px-2 border-crimson/30 text-crimson shrink-0"
              onClick={(e) => { e.stopPropagation(); onMoveToCrm(); }}
            >
              <ArrowRight className="h-3 w-3 mr-1" />CRM
            </Button>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </motion.div>
  );
}
