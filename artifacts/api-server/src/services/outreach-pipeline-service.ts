import OpenAI from "openai";
import { db, aiRunsTable, leadsTable, companiesTable, contactsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { chargeWallet } from "./wallet-service";
import { shouldAiAct } from "./ai-mode-service";
import { getSemanticContext } from "./embedding-service";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const MODEL = "gpt-4o-mini";

async function callOutreachAI(systemPrompt: string, userPrompt: string, tool: string, action: string): Promise<{ result: string; confidence: number; runId: number }> {
  const modeCheck = await shouldAiAct("outreach_draft", undefined);
  if (!modeCheck.canAct) throw new Error(`AI_BLOCKED: ${modeCheck.reason}`);

  await chargeWallet({ tool, domain: "outreach", action });

  const startTime = Date.now();
  let result = "", confidence = 0, status = "completed" as string, errorMsg: string | undefined;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });
    result = response.choices[0]?.message?.content ?? "";
    const hasStructure = result.includes("\n") || result.includes("•");
    confidence = Math.min(95, 50 + (result.length > 100 ? 10 : 0) + (result.length > 300 ? 10 : 0) + (hasStructure ? 15 : 0) + 10);
  } catch (err: any) {
    status = "failed";
    errorMsg = err.message;
  }

  const [run] = await db.insert(aiRunsTable).values({
    runType: tool,
    status,
    prompt: userPrompt.slice(0, 2000),
    output: result ? result.slice(0, 2000) : null,
    model: MODEL,
    tokensUsed: result.length,
    durationMs: Date.now() - startTime,
    confidenceScore: confidence,
    domain: "outreach",
    error: errorMsg,
  }).returning();

  if (status === "failed") throw new Error(`AI_CALL_FAILED: ${errorMsg}`);
  return { result, confidence, runId: run.id };
}

export async function researchProspect(params: {
  leadName: string;
  company?: string;
  email?: string;
  industry?: string;
}): Promise<{ research: string; confidence: number; runId: number }> {
  const knowledgeContext = await getSemanticContext(
    `${params.company ?? ""} ${params.industry ?? ""} cybersecurity prospect`,
    "outreach", 3
  ).catch(() => "");

  const { result, confidence, runId } = await callOutreachAI(
    `You are a prospect research AI for PMG Group LLC (cybersecurity/IT services). Research the prospect and company to find actionable outreach angles.

Return:
1. COMPANY_OVERVIEW: What they do, size, industry, tech indicators
2. SECURITY_POSTURE: Likely cybersecurity maturity and gaps
3. PAIN_INDICATORS: Specific pain points based on industry/size
4. TRIGGER_EVENTS: Recent events that create urgency (compliance deadlines, breaches, growth)
5. OUTREACH_ANGLES: Top 3 angles to approach this prospect
6. DECISION_CONTEXT: Likely buying process and stakeholders`,
    `Research prospect:
Name: ${params.leadName}
Company: ${params.company ?? "Unknown"}
Email: ${params.email ?? "N/A"}
Industry: ${params.industry ?? "Unknown"}
${knowledgeContext ? `\nRelevant Knowledge:\n${knowledgeContext}` : ""}`,
    "ai-prospect-research",
    "research_prospect"
  );

  return { research: result, confidence, runId };
}

export async function personalizeOutreach(params: {
  leadName: string;
  company?: string;
  channel: string;
  research?: string;
  icpMatch?: string;
  previousInteractions?: string;
}): Promise<{ personalization: string; confidence: number; runId: number }> {
  const { result, confidence, runId } = await callOutreachAI(
    `You are a personalization engine for PMG Group LLC outreach. Create a personalization brief that will make outreach feel custom-crafted for this prospect.

Return:
1. PERSONALIZATION_HOOKS: 3-5 specific personalization elements (industry refs, company-specific pain, role-specific value props)
2. TONE_GUIDE: Recommended tone (formal/casual/consultative) based on role/industry
3. VALUE_PROP: PMG's most relevant value proposition for this prospect
4. OPENING_ANGLES: 3 opening line approaches ranked by likely effectiveness
5. CTA_RECOMMENDATION: Best call-to-action for ${params.channel}
6. AVOID: Things NOT to say based on prospect context`,
    `Personalize outreach for:
Name: ${params.leadName}
Company: ${params.company ?? "Unknown"}
Channel: ${params.channel}
${params.research ? `Research:\n${params.research}` : ""}
${params.icpMatch ? `ICP Match: ${params.icpMatch}` : ""}
${params.previousInteractions ? `Previous Interactions:\n${params.previousInteractions}` : ""}`,
    "ai-personalize-outreach",
    "personalize_outreach"
  );

  return { personalization: result, confidence, runId };
}

export async function draftStructuredOutreach(params: {
  leadName: string;
  company?: string;
  channel: string;
  personalization?: string;
  research?: string;
  stepNumber?: number;
  sequenceContext?: string;
}): Promise<{ draft: string; subject?: string; confidence: number; runId: number }> {
  const channelGuidance: Record<string, string> = {
    email: "Write a professional email with Subject line, body (3-5 short paragraphs), and clear CTA. Keep under 200 words.",
    linkedin: "Write a LinkedIn message/connection request. Keep under 300 characters for connection note, or under 150 words for InMail.",
    sms: "Write a brief, professional SMS. Max 160 characters. Include clear CTA.",
    phone: "Write a call script with: Opening hook (10 sec), Value prop (20 sec), Qualifying questions (3), Objection responses (2), CTA.",
  };

  const { result, confidence, runId } = await callOutreachAI(
    `You are an elite outreach copywriter for PMG Group LLC (cybersecurity/IT services). Draft outreach that gets responses.

PMG Services: Penetration Testing, SOC Monitoring, Compliance (HIPAA, PCI-DSS, SOC 2), Managed IT, Incident Response.

Rules:
- Never be pushy or salesy
- Lead with value and insight
- Reference specific pain points
- Be concise and scannable
- Include a low-friction CTA
${channelGuidance[params.channel] ?? "Write appropriate content for the channel."}

${params.stepNumber ? `This is step ${params.stepNumber} in a sequence — adjust tone and urgency accordingly.` : ""}`,
    `Draft ${params.channel} outreach for:
Name: ${params.leadName}
Company: ${params.company ?? "Unknown"}
${params.personalization ? `Personalization Brief:\n${params.personalization}` : ""}
${params.research ? `Research:\n${params.research}` : ""}
${params.sequenceContext ? `Sequence Context: ${params.sequenceContext}` : ""}`,
    "ai-draft-outreach",
    "draft_structured_outreach"
  );

  let subject: string | undefined;
  if (params.channel === "email") {
    const subjectMatch = result.match(/(?:Subject|SUBJECT):\s*(.+?)(?:\n|$)/);
    if (subjectMatch) subject = subjectMatch[1].trim();
  }

  return { draft: result, subject, confidence, runId };
}

export async function generateOutreachVariants(params: {
  leadName: string;
  company?: string;
  channel: string;
  baseDraft: string;
  variantCount?: number;
}): Promise<{ variants: string[]; confidence: number; runId: number }> {
  const count = params.variantCount ?? 2;

  const { result, confidence, runId } = await callOutreachAI(
    `You are an A/B testing specialist for PMG Group LLC outreach. Generate ${count} distinct variants of the given outreach draft. Each variant should test a different:
- Opening approach (question vs. statement vs. insight)
- Value prop angle
- CTA style
- Tone (consultative vs. direct vs. peer-to-peer)

Label each variant as VARIANT_A, VARIANT_B, etc. Keep same quality as original.`,
    `Generate ${count} variants of this ${params.channel} draft for ${params.leadName} (${params.company ?? "Unknown"}):

Original Draft:
${params.baseDraft}`,
    "ai-outreach-variants",
    "generate_variants"
  );

  const variants = result.split(/VARIANT_[A-Z]:/i).filter(v => v.trim().length > 20).map(v => v.trim());
  return { variants: variants.length > 0 ? variants : [result], confidence, runId };
}

export async function runFullOutreachPipeline(params: {
  leadId: number;
  channel: string;
  generateVariants?: boolean;
}): Promise<{
  research: string;
  personalization: string;
  draft: string;
  subject?: string;
  variants?: string[];
  totalConfidence: number;
  runIds: number[];
}> {
  const [lead] = await db.select().from(leadsTable).where(eq(leadsTable.id, params.leadId));
  if (!lead) throw new Error("Lead not found");

  // FK model: name/email live on the contact, company name on the company.
  let companyName: string | null = null;
  if (lead.companyId) {
    const [company] = await db.select().from(companiesTable).where(eq(companiesTable.id, lead.companyId));
    companyName = company?.name ?? null;
  }
  let contactName = "";
  let contactEmail: string | null = null;
  if (lead.contactId) {
    const [contact] = await db.select().from(contactsTable).where(eq(contactsTable.id, lead.contactId));
    if (contact) {
      contactName = `${contact.firstName ?? ""} ${contact.lastName ?? ""}`.trim();
      contactEmail = contact.email;
    }
  }
  const leadName = contactName || companyName || `Lead #${lead.id}`;

  const researchResult = await researchProspect({
    leadName,
    company: companyName ?? undefined,
    email: contactEmail ?? undefined,
  });

  const personalizationResult = await personalizeOutreach({
    leadName,
    company: companyName ?? undefined,
    channel: params.channel,
    research: researchResult.research,
  });

  const draftResult = await draftStructuredOutreach({
    leadName,
    company: companyName ?? undefined,
    channel: params.channel,
    personalization: personalizationResult.personalization,
    research: researchResult.research,
  });

  const runIds = [researchResult.runId, personalizationResult.runId, draftResult.runId];
  const totalConfidence = Math.round(
    (researchResult.confidence + personalizationResult.confidence + draftResult.confidence) / 3
  );

  let variants: string[] | undefined;
  if (params.generateVariants) {
    const variantResult = await generateOutreachVariants({
      leadName,
      company: companyName ?? undefined,
      channel: params.channel,
      baseDraft: draftResult.draft,
    });
    variants = variantResult.variants;
    runIds.push(variantResult.runId);
  }

  return {
    research: researchResult.research,
    personalization: personalizationResult.personalization,
    draft: draftResult.draft,
    subject: draftResult.subject,
    variants,
    totalConfidence,
    runIds,
  };
}
