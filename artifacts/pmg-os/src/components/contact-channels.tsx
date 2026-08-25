import type { ReactNode } from "react";
import {
  Mail,
  Phone,
  Globe,
  Building2,
  Linkedin,
  Twitter,
  Facebook,
  Instagram,
  Youtube,
  Music2,
  type LucideIcon,
} from "lucide-react";

/**
 * Unified contact/channel display for a prospect, lead, or deal. Renders the
 * full set the enrichment cascade fills — email, phone (mobile + office),
 * website, and every social handle — as clickable icons/links. Missing channels
 * are simply omitted (never fabricated). Used on every list + detail surface so
 * the data shows "everywhere" consistently.
 */

export interface ContactChannelsData {
  email?: string | null;
  /** Lead/Opportunity objects carry the email as `contactEmail` — accepted too. */
  contactEmail?: string | null;
  /** Person's direct/mobile number. */
  phone?: string | null;
  contactPhone?: string | null;
  /** Company / office line. */
  companyPhone?: string | null;
  website?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  tiktokUrl?: string | null;
}

/** field key -> provider that supplied it ("apollo" | "pdl" | "website"). */
export type FieldSources = Record<string, string> | null | undefined;

/** Ensure a stored value (often a bare host like "acme.com") is a real URL. */
function href(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

const SOURCE_LABEL: Record<string, { label: string; cls: string }> = {
  apollo: { label: "Apollo", cls: "text-crimson/90 border-crimson/40" },
  pdl: { label: "PDL", cls: "text-sky-400/90 border-sky-400/40" },
  website: { label: "Web", cls: "text-emerald-400/90 border-emerald-400/40" },
};

/** Tiny provenance chip shown next to a value: which provider supplied it. */
function SourceTag({ source }: { source?: string | null }) {
  if (!source) return null;
  const s = SOURCE_LABEL[source] ?? { label: source, cls: "text-muted-foreground border-border" };
  return (
    <span
      title={`Source: ${s.label}`}
      className={`text-[8px] uppercase tracking-wide leading-none px-1 py-px rounded border ${s.cls} shrink-0`}
    >
      {s.label}
    </span>
  );
}

interface SocialDef {
  key: keyof ContactChannelsData;
  label: string;
  Icon: LucideIcon;
  hoverClass: string;
}

const SOCIALS: SocialDef[] = [
  { key: "linkedinUrl", label: "LinkedIn", Icon: Linkedin, hoverClass: "hover:text-[#0a66c2]" },
  { key: "twitterUrl", label: "X / Twitter", Icon: Twitter, hoverClass: "hover:text-sky-400" },
  { key: "facebookUrl", label: "Facebook", Icon: Facebook, hoverClass: "hover:text-[#1877f2]" },
  { key: "instagramUrl", label: "Instagram", Icon: Instagram, hoverClass: "hover:text-pink-500" },
  { key: "youtubeUrl", label: "YouTube", Icon: Youtube, hoverClass: "hover:text-red-500" },
  { key: "tiktokUrl", label: "TikTok", Icon: Music2, hoverClass: "hover:text-foreground" },
];

function IconLink({
  href: to,
  label,
  Icon,
  hoverClass,
}: {
  href: string;
  label: string;
  Icon: LucideIcon;
  hoverClass: string;
}) {
  return (
    <a
      href={to}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
      className={`text-muted-foreground ${hoverClass} transition-colors shrink-0`}
    >
      <Icon className="h-4 w-4" />
    </a>
  );
}

/**
 * Compact single-row of channel icons for list cards. Renders nothing when the
 * prospect has no contact data yet (caller can show its own "enrich" hint).
 */
export function ContactChannels({
  data,
  sources,
  className = "",
}: {
  data: ContactChannelsData;
  sources?: FieldSources;
  className?: string;
}) {
  const email = data.email ?? data.contactEmail ?? null;
  const emailSrc = sources?.contactEmail ?? sources?.email;
  const usingMobile = !!(data.phone ?? data.contactPhone);
  const phone = data.phone ?? data.contactPhone ?? data.companyPhone ?? null;
  const phoneSrc = usingMobile ? sources?.contactPhone : sources?.companyPhone;
  const socials = SOCIALS.filter((s) => !!data[s.key]);
  const hasAny = !!(email || phone || data.website || socials.length);
  if (!hasAny) return null;

  // One channel = icon link + optional provider chip, kept together on wrap.
  const Chip = ({ children, source }: { children: ReactNode; source?: string | null }) => (
    <span className="inline-flex items-center gap-1 shrink-0">
      {children}
      <SourceTag source={source} />
    </span>
  );

  return (
    <div className={`flex items-center gap-x-2.5 gap-y-1 flex-wrap ${className}`}>
      {email && (
        <Chip source={emailSrc}>
          <IconLink href={`mailto:${email}`} label={email} Icon={Mail} hoverClass="hover:text-crimson" />
        </Chip>
      )}
      {phone && (
        <Chip source={phoneSrc}>
          <IconLink href={`tel:${phone.replace(/[^\d+]/g, "")}`} label={phone} Icon={Phone} hoverClass="hover:text-emerald-400" />
        </Chip>
      )}
      {data.website && (
        <Chip source={sources?.website}>
          <IconLink href={href(data.website)} label={data.website} Icon={Globe} hoverClass="hover:text-sky-300" />
        </Chip>
      )}
      {socials.map((s) => (
        <Chip key={s.key} source={sources?.[s.key]}>
          <IconLink href={href(String(data[s.key]))} label={s.label} Icon={s.Icon} hoverClass={s.hoverClass} />
        </Chip>
      ))}
    </div>
  );
}

/** One labeled line: icon + value (linked when a href is given) + source chip. */
function DetailRow({
  Icon,
  children,
  to,
  source,
}: {
  Icon: LucideIcon;
  children: ReactNode;
  to?: string;
  source?: string | null;
}) {
  const body = to ? (
    <a href={to} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="hover:text-crimson transition-colors truncate">
      {children}
    </a>
  ) : (
    <span className="truncate">{children}</span>
  );
  return (
    <div className="flex items-center gap-2 text-sm min-w-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      {body}
      <SourceTag source={source} />
    </div>
  );
}

/**
 * Expanded labeled block for detail dialogs/panels. Shows email, mobile, office
 * phone, website as labeled rows and every social handle as an icon row. Each
 * missing field shows an honest "not found yet" hint rather than being hidden,
 * so it's clear enrichment can still fill it.
 */
export function ContactChannelsDetail({ data, sources }: { data: ContactChannelsData; sources?: FieldSources }) {
  const email = data.email ?? data.contactEmail ?? null;
  const mobile = data.phone ?? data.contactPhone ?? null;
  const socials = SOCIALS.filter((s) => !!data[s.key]);

  return (
    <div className="space-y-2.5">
      <DetailRow Icon={Mail} to={email ? `mailto:${email}` : undefined} source={sources?.contactEmail ?? sources?.email}>
        {email || <span className="text-muted-foreground text-xs">No email yet — enrich to discover</span>}
      </DetailRow>
      <DetailRow Icon={Phone} to={mobile ? `tel:${mobile.replace(/[^\d+]/g, "")}` : undefined} source={sources?.contactPhone}>
        {mobile || <span className="text-muted-foreground text-xs">No direct phone yet — enrich to discover</span>}
      </DetailRow>
      {data.companyPhone && data.companyPhone !== mobile && (
        <DetailRow Icon={Building2} to={`tel:${data.companyPhone.replace(/[^\d+]/g, "")}`} source={sources?.companyPhone}>
          <span className="text-xs">Office: {data.companyPhone}</span>
        </DetailRow>
      )}
      <DetailRow Icon={Globe} to={data.website ? href(data.website) : undefined} source={sources?.website}>
        {data.website || <span className="text-muted-foreground text-xs">No website yet — enrich to discover</span>}
      </DetailRow>
      {socials.length > 0 ? (
        <div className="flex items-center gap-3 pt-1 flex-wrap">
          {socials.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1">
              <IconLink href={href(String(data[s.key]))} label={s.label} Icon={s.Icon} hoverClass={s.hoverClass} />
              <SourceTag source={sources?.[s.key]} />
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground pt-0.5">No social profiles found yet — enrich to discover</p>
      )}
    </div>
  );
}
