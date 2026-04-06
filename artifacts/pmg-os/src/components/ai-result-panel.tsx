import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Copy, Check, ChevronDown, ChevronUp, UserPlus, CheckCircle2, Loader2 } from "lucide-react";

interface AiResultPanelProps {
  result: any;
  onClose: () => void;
  title?: string;
  onSaveProspect?: (prospect: Record<string, any>) => Promise<void>;
}

function tryParseJSON(str: string) {
  try {
    const cleaned = str.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function renderValue(val: any, depth = 0): React.ReactElement {
  if (val === null || val === undefined) return <span className="text-muted-foreground">—</span>;
  if (typeof val === "boolean") return <span className={val ? "text-green-400" : "text-red-400"}>{val ? "Yes" : "No"}</span>;
  if (typeof val === "number") return <span className="text-blue-400 font-mono">{val}</span>;
  if (typeof val === "string") {
    const parsed = tryParseJSON(val);
    if (parsed) return renderValue(parsed, depth);
    if (val.length > 300) return <p className="text-sm text-foreground/80 whitespace-pre-wrap">{val}</p>;
    return <span className="text-foreground/90">{val}</span>;
  }
  if (Array.isArray(val)) {
    if (val.length === 0) return <span className="text-muted-foreground">None</span>;
    if (typeof val[0] === "string" || typeof val[0] === "number") {
      return <span className="text-foreground/80">{val.join(", ")}</span>;
    }
    return (
      <div className="space-y-2 mt-1">
        {val.map((item, i) => (
          <div key={i} className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
            {typeof item === "object" ? (
              <div className="space-y-1.5">
                {Object.entries(item).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-sm">
                    <span className="text-muted-foreground min-w-[120px] capitalize">{k.replace(/_/g, " ")}:</span>
                    <div className="flex-1">{renderValue(v, depth + 1)}</div>
                  </div>
                ))}
              </div>
            ) : (
              renderValue(item, depth + 1)
            )}
          </div>
        ))}
      </div>
    );
  }
  if (typeof val === "object") {
    return (
      <div className={`space-y-1.5 ${depth > 0 ? "pl-2 border-l border-white/5" : ""}`}>
        {Object.entries(val).map(([k, v]) => (
          <div key={k} className="text-sm">
            <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}: </span>
            {typeof v === "object" ? <div className="mt-1 ml-2">{renderValue(v, depth + 1)}</div> : renderValue(v, depth + 1)}
          </div>
        ))}
      </div>
    );
  }
  return <span>{String(val)}</span>;
}

function ProspectSaveButton({ prospect, onSave, forceSaved }: { prospect: Record<string, any>; onSave: (p: Record<string, any>) => Promise<void>; forceSaved?: boolean }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(prospect);
      setSaved(true);
    } catch {
      setSaving(false);
    }
  };

  if (saved || forceSaved) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-green-400 px-2 py-1 rounded bg-green-500/10">
        <CheckCircle2 className="h-3 w-3" />Saved to CRM
      </span>
    );
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); handleSave(); }}
      disabled={saving}
      className="inline-flex items-center gap-1 text-[10px] text-crimson px-2 py-1 rounded bg-crimson/10 hover:bg-crimson/20 transition-colors disabled:opacity-50"
    >
      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
      {saving ? "Saving..." : "Save as Lead"}
    </button>
  );
}

function extractProspects(data: any): Record<string, any>[] | null {
  if (!data) return null;
  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === "object" && (data[0].company_name || data[0].companyName || data[0].company || data[0].decision_maker || data[0].name)) {
      return data;
    }
  }
  if (typeof data === "object" && !Array.isArray(data)) {
    for (const key of Object.keys(data)) {
      const prospects = extractProspects(data[key]);
      if (prospects) return prospects;
    }
  }
  return null;
}

export function AiResultPanel({ result, onClose, title, onSaveProspect }: AiResultPanelProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [savingAll, setSavingAll] = useState(false);
  const [allSaved, setAllSaved] = useState(false);

  if (!result) return null;

  const data = result.data || result.result || result.strategy || result.unifiedInbox || result.content || result;
  const confidence = result.confidence;
  const agent = result.agent;
  const section = result.section;

  let parsedData = data;
  if (typeof data === "string") {
    parsedData = tryParseJSON(data) || data;
  }

  const prospects = onSaveProspect ? extractProspects(parsedData) : null;

  const handleCopy = () => {
    const text = typeof parsedData === "string" ? parsedData : JSON.stringify(parsedData, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveAll = async () => {
    if (!prospects || !onSaveProspect) return;
    setSavingAll(true);
    try {
      for (const p of prospects) {
        await onSaveProspect(p);
      }
      setAllSaved(true);
    } catch {}
    setSavingAll(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="rounded-xl border border-crimson/20 bg-gradient-to-br from-crimson/5 to-transparent overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-2.5 bg-crimson/10 border-b border-crimson/10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-crimson" />
            <span className="text-sm font-semibold text-foreground">{title || "AI Result"}</span>
            {agent && <span className="text-[10px] px-1.5 py-0.5 rounded bg-crimson/20 text-crimson">{agent}</span>}
            {confidence && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">{confidence}% confidence</span>}
          </div>
          <div className="flex items-center gap-1">
            {prospects && prospects.length > 0 && onSaveProspect && !allSaved && (
              <button
                onClick={handleSaveAll}
                disabled={savingAll}
                className="inline-flex items-center gap-1 text-[10px] text-white px-2 py-1 rounded bg-crimson hover:bg-crimson/80 transition-colors disabled:opacity-50 mr-1"
              >
                {savingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
                {savingAll ? "Saving..." : `Save All ${prospects.length} to CRM`}
              </button>
            )}
            {allSaved && (
              <span className="inline-flex items-center gap-1 text-[10px] text-green-400 px-2 py-1 rounded bg-green-500/10 mr-1">
                <CheckCircle2 className="h-3 w-3" />All Saved
              </span>
            )}
            <button onClick={handleCopy} className="p-1 hover:bg-white/10 rounded transition-colors" title="Copy">
              {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            <button onClick={() => setExpanded(!expanded)} className="p-1 hover:bg-white/10 rounded transition-colors">
              {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
            </button>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded transition-colors">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="p-4 max-h-[400px] overflow-y-auto scrollbar-thin">
            {prospects && prospects.length > 0 && onSaveProspect ? (
              <div className="space-y-2">
                {prospects.map((prospect, i) => {
                  const name = prospect.company_name || prospect.companyName || prospect.company || prospect.name || `Prospect ${i + 1}`;
                  const contact = prospect.decision_maker || prospect.contact || prospect.contactName || "";
                  const score = prospect.fit_score || prospect.fitScore || prospect.score || prospect.estimated_fit || "";
                  return (
                    <div key={i} className="rounded-lg bg-white/[0.03] border border-white/5 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{name}</span>
                          {score && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">Score: {score}</span>}
                        </div>
                        <ProspectSaveButton prospect={prospect} onSave={onSaveProspect} forceSaved={allSaved} />
                      </div>
                      {contact && <p className="text-xs text-muted-foreground mb-1">Contact: {contact}</p>}
                      <div className="space-y-1">
                        {Object.entries(prospect).filter(([k]) => !["company_name", "companyName", "company", "name", "decision_maker", "contact", "contactName", "fit_score", "fitScore", "score", "estimated_fit"].includes(k)).map(([k, v]) => (
                          <div key={k} className="flex gap-2 text-[11px]">
                            <span className="text-muted-foreground min-w-[100px] capitalize">{k.replace(/_/g, " ")}:</span>
                            <span className="text-foreground/80">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : typeof parsedData === "string" ? (
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{parsedData}</p>
            ) : (
              renderValue(parsedData)
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
