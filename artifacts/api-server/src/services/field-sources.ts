/**
 * Flatten the per-field enrichment-provenance maps stored on a contact and its
 * company (`enrichment_sources` JSONB) into the flat field keys the Lead /
 * Opportunity API exposes. Mirrors the COALESCE(contact, company) the routes use
 * for linkedin/twitter (contact value wins → contact source wins). Lets the UI
 * tag every value with the provider that supplied it ("apollo" | "pdl" | "website").
 */
type SourceMap = Record<string, string> | null | undefined;

export function buildFieldSources(contactSources: SourceMap, companySources: SourceMap): Record<string, string> | null {
  const cs = contactSources ?? {};
  const co = companySources ?? {};
  const out: Record<string, string> = {};
  if (cs.email) out.contactEmail = cs.email;
  if (cs.phone) out.contactPhone = cs.phone;
  if (co.website) out.website = co.website;
  if (co.phone) out.companyPhone = co.phone;
  const linkedin = cs.linkedinUrl ?? co.linkedinUrl;
  if (linkedin) out.linkedinUrl = linkedin;
  const twitter = cs.twitterUrl ?? co.twitterUrl;
  if (twitter) out.twitterUrl = twitter;
  if (co.facebookUrl) out.facebookUrl = co.facebookUrl;
  if (co.instagramUrl) out.instagramUrl = co.instagramUrl;
  if (co.youtubeUrl) out.youtubeUrl = co.youtubeUrl;
  if (co.tiktokUrl) out.tiktokUrl = co.tiktokUrl;
  return Object.keys(out).length ? out : null;
}
