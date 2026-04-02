import { db, communicationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";
import { broadcast } from "./websocket-service";
import { classifyConfidence } from "./confidence-handoff-service";
import { handleConfidenceHandoff } from "./confidence-handoff-service";

async function callCommAI(params: {
  systemPrompt: string;
  userPrompt: string;
  workflowKey: string;
  tool: string;
  domain: string;
  action: string;
  entityType?: string;
  entityId?: number;
}): Promise<{ result: string; confidence: number; runId: number }> {
  const { callAI } = await import("./ai-service");
  return callAI(params);
}

export interface TranscriptAnalysis {
  summary: string;
  actionItems: Array<{ task: string; assignee?: string; deadline?: string; priority: string }>;
  keyTopics: string[];
  sentiment: { overall: string; score: number; moments: Array<{ timestamp?: string; text: string; sentiment: string }> };
  objections: Array<{ text: string; category: string; severity: string; suggestedResponse: string }>;
  nextSteps: string[];
  confidence: number;
  runId: number;
}

export async function processTranscript(params: {
  communicationId?: number;
  transcript: string;
  type?: string;
  contactName?: string;
  companyName?: string;
}): Promise<TranscriptAnalysis> {
  const systemPrompt = `You are an expert communication analyst for PMG Group LLC, a cybersecurity and IT services company.
Analyze the following call/meeting transcript and extract structured intelligence.
Return a JSON object with these fields:
- summary: 2-3 sentence executive summary
- actionItems: array of {task, assignee (if mentioned), deadline (if mentioned), priority: "high"|"medium"|"low"}
- keyTopics: array of main discussion topics
- sentiment: {overall: "positive"|"neutral"|"negative"|"mixed", score: 0-100, moments: [{text, sentiment}]}
- objections: array of {text: the objection, category: "price"|"timing"|"authority"|"need"|"competition"|"technical"|"other", severity: "high"|"medium"|"low", suggestedResponse: how to handle}
- nextSteps: array of recommended follow-up actions
Return ONLY valid JSON.`;

  const userPrompt = `Type: ${params.type ?? "call"}
${params.contactName ? `Contact: ${params.contactName}` : ""}
${params.companyName ? `Company: ${params.companyName}` : ""}

TRANSCRIPT:
${params.transcript}`;

  const { result, confidence, runId } = await callCommAI({
    systemPrompt,
    userPrompt,
    workflowKey: "transcript_analysis",
    tool: "transcript_processor",
    domain: "communications",
    action: "process_transcript",
    entityType: "communication",
    entityId: params.communicationId,
  });

  let parsed: any;
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result);
  } catch {
    parsed = {
      summary: result.slice(0, 500),
      actionItems: [],
      keyTopics: [],
      sentiment: { overall: "neutral", score: 50, moments: [] },
      objections: [],
      nextSteps: [],
    };
  }

  if (params.communicationId) {
    await db.update(communicationsTable).set({
      summary: parsed.summary,
      sentiment: parsed.sentiment?.overall ?? "neutral",
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.join("; ") : parsed.nextSteps,
    }).where(eq(communicationsTable.id, params.communicationId));
  }

  await logAudit({
    eventType: "transcript_processed",
    domain: "communications",
    action: "process_transcript",
    description: `Transcript analyzed: ${parsed.actionItems?.length ?? 0} action items, ${parsed.objections?.length ?? 0} objections detected`,
    entityType: "communication",
    entityId: params.communicationId,
    actor: "communication_intelligence",
    actorType: "system",
  });

  broadcast("transcript_analyzed", {
    communicationId: params.communicationId,
    summary: parsed.summary,
    actionItemCount: parsed.actionItems?.length ?? 0,
    sentiment: parsed.sentiment?.overall,
    objectionCount: parsed.objections?.length ?? 0,
  });

  return {
    summary: parsed.summary ?? "",
    actionItems: parsed.actionItems ?? [],
    keyTopics: parsed.keyTopics ?? [],
    sentiment: parsed.sentiment ?? { overall: "neutral", score: 50, moments: [] },
    objections: parsed.objections ?? [],
    nextSteps: parsed.nextSteps ?? [],
    confidence,
    runId,
  };
}

export interface SentimentAnalysis {
  overall: string;
  score: number;
  breakdown: { positive: number; neutral: number; negative: number };
  trendDirection: string;
  keyPhrases: Array<{ phrase: string; sentiment: string }>;
  confidence: number;
  runId: number;
}

export async function analyzeCallSentiment(params: {
  communicationId?: number;
  transcript?: string;
  summary?: string;
  contactName?: string;
}): Promise<SentimentAnalysis> {
  const text = params.transcript ?? params.summary ?? "";
  if (!text) throw new Error("transcript or summary required for sentiment analysis");

  const { result, confidence, runId } = await callCommAI({
    systemPrompt: `You are a sentiment analysis specialist for PMG Group LLC sales and service calls.
Analyze the communication and return JSON:
- overall: "positive"|"neutral"|"negative"|"mixed"
- score: 0-100 (0=very negative, 100=very positive)
- breakdown: {positive: %, neutral: %, negative: %} (must sum to 100)
- trendDirection: "improving"|"stable"|"declining"
- keyPhrases: [{phrase, sentiment: "positive"|"neutral"|"negative"}] (max 5)
Return ONLY valid JSON.`,
    userPrompt: `${params.contactName ? `Contact: ${params.contactName}\n` : ""}Communication:\n${text}`,
    workflowKey: "call_sentiment",
    tool: "sentiment_analyzer",
    domain: "communications",
    action: "analyze_sentiment",
    entityType: "communication",
    entityId: params.communicationId,
  });

  let parsed: any;
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result);
  } catch {
    parsed = { overall: "neutral", score: 50, breakdown: { positive: 33, neutral: 34, negative: 33 }, trendDirection: "stable", keyPhrases: [] };
  }

  if (params.communicationId) {
    await db.update(communicationsTable).set({
      sentiment: parsed.overall ?? "neutral",
    }).where(eq(communicationsTable.id, params.communicationId));
  }

  return {
    overall: parsed.overall ?? "neutral",
    score: parsed.score ?? 50,
    breakdown: parsed.breakdown ?? { positive: 33, neutral: 34, negative: 33 },
    trendDirection: parsed.trendDirection ?? "stable",
    keyPhrases: parsed.keyPhrases ?? [],
    confidence,
    runId,
  };
}

export interface ObjectionDetection {
  objections: Array<{
    text: string;
    category: string;
    severity: string;
    suggestedResponse: string;
    talkingPoints: string[];
  }>;
  objectionCount: number;
  primaryConcern: string;
  overallRisk: string;
  confidence: number;
  runId: number;
}

export async function detectObjections(params: {
  communicationId?: number;
  transcript?: string;
  summary?: string;
  contactName?: string;
  dealContext?: string;
}): Promise<ObjectionDetection> {
  const text = params.transcript ?? params.summary ?? "";
  if (!text) throw new Error("transcript or summary required for objection detection");

  const { result, confidence, runId } = await callCommAI({
    systemPrompt: `You are an objection detection specialist for PMG Group LLC, a cybersecurity/IT services company.
Analyze the conversation for buyer objections, concerns, and hesitations.
Return JSON:
- objections: [{text: exact objection, category: "price"|"timing"|"authority"|"need"|"competition"|"technical"|"trust"|"scope", severity: "high"|"medium"|"low", suggestedResponse: how to handle, talkingPoints: [3 relevant talking points]}]
- objectionCount: total count
- primaryConcern: the main area of concern
- overallRisk: "high"|"medium"|"low" deal risk based on objections
Return ONLY valid JSON.`,
    userPrompt: `${params.contactName ? `Contact: ${params.contactName}\n` : ""}${params.dealContext ? `Deal Context: ${params.dealContext}\n` : ""}Communication:\n${text}`,
    workflowKey: "objection_detection",
    tool: "objection_detector",
    domain: "communications",
    action: "detect_objections",
    entityType: "communication",
    entityId: params.communicationId,
  });

  let parsed: any;
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result);
  } catch {
    parsed = { objections: [], objectionCount: 0, primaryConcern: "none", overallRisk: "low" };
  }

  if (parsed.objections?.length > 0 && params.communicationId) {
    await createNotification({
      type: "objections_detected",
      severity: parsed.overallRisk === "high" ? "error" : "warning",
      title: `${parsed.objectionCount} Objection(s) Detected`,
      message: `Primary concern: ${parsed.primaryConcern}. Risk level: ${parsed.overallRisk}`,
      domain: "communications",
      entityType: "communication",
      entityId: params.communicationId,
      actor: "objection_detector",
    });
  }

  return {
    objections: parsed.objections ?? [],
    objectionCount: parsed.objectionCount ?? 0,
    primaryConcern: parsed.primaryConcern ?? "none",
    overallRisk: parsed.overallRisk ?? "low",
    confidence,
    runId,
  };
}

export interface FollowUpDraft {
  draft: string;
  subject?: string;
  channel: string;
  tone: string;
  keyPoints: string[];
  confidence: number;
  runId: number;
}

export async function generateFollowUp(params: {
  communicationId?: number;
  transcript?: string;
  summary?: string;
  actionItems?: string[];
  contactName?: string;
  companyName?: string;
  channel?: string;
  tone?: string;
}): Promise<FollowUpDraft> {
  const channel = params.channel ?? "email";
  const tone = params.tone ?? "professional";
  const context = params.transcript ?? params.summary ?? "";
  if (!context) throw new Error("transcript or summary required for follow-up generation");

  const channelInstructions: Record<string, string> = {
    email: "Write a professional follow-up email with subject line. Include 'Subject:' on the first line.",
    sms: "Write a concise SMS follow-up (max 160 chars per message, 2 messages max).",
    linkedin: "Write a LinkedIn message follow-up (professional but conversational, max 300 words).",
    phone_script: "Write a phone call script for follow-up with key talking points.",
  };

  const { result, confidence, runId } = await callCommAI({
    systemPrompt: `You are a follow-up communication specialist for PMG Group LLC, a cybersecurity and IT services company.
Generate a ${channel} follow-up based on the previous conversation.
${channelInstructions[channel] ?? channelInstructions.email}
Tone: ${tone}
Reference specific discussion points and action items from the conversation.
Include any commitments made during the conversation.
Return JSON:
- draft: the full follow-up text
- subject: email subject line (only for email channel)
- keyPoints: array of key points referenced from the conversation
Return ONLY valid JSON.`,
    userPrompt: `Contact: ${params.contactName ?? "the prospect"}
${params.companyName ? `Company: ${params.companyName}` : ""}
Channel: ${channel}
${params.actionItems?.length ? `Action Items:\n${params.actionItems.join("\n")}` : ""}

Previous Conversation:
${context.slice(0, 3000)}`,
    workflowKey: "followup_generation",
    tool: "followup_drafter",
    domain: "communications",
    action: "generate_followup",
    entityType: "communication",
    entityId: params.communicationId,
  });

  let parsed: any;
  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : result);
  } catch {
    let subject: string | undefined;
    let draft = result;
    const subjectMatch = result.match(/Subject:\s*(.+)/i);
    if (subjectMatch) {
      subject = subjectMatch[1].trim();
      draft = result.replace(/Subject:\s*.+\n?/, "").trim();
    }
    parsed = { draft, subject, keyPoints: [] };
  }

  return {
    draft: parsed.draft ?? result,
    subject: parsed.subject,
    channel,
    tone,
    keyPoints: parsed.keyPoints ?? [],
    confidence,
    runId,
  };
}

export async function processTranscriptWithHandoff(params: {
  communicationId?: number;
  transcript: string;
  type?: string;
  contactName?: string;
  companyName?: string;
}): Promise<{ analysis: TranscriptAnalysis; handoff: any }> {
  const analysis = await processTranscript(params);

  const handoff = await handleConfidenceHandoff({
    confidence: analysis.confidence,
    actionType: "transcript_analysis",
    workflowKey: "transcript_analysis",
    domain: "communications",
    entityType: "communication",
    entityId: params.communicationId,
    aiResult: analysis,
    aiResultSummary: `${analysis.actionItems.length} action items, ${analysis.objections.length} objections, sentiment: ${analysis.sentiment.overall}`,
    executeAction: async () => {
      return analysis;
    },
  });

  return { analysis, handoff };
}

export async function generateFollowUpWithHandoff(params: {
  communicationId?: number;
  transcript?: string;
  summary?: string;
  actionItems?: string[];
  contactName?: string;
  companyName?: string;
  channel?: string;
  tone?: string;
}): Promise<{ followUp: FollowUpDraft; handoff: any }> {
  const followUp = await generateFollowUp(params);

  const handoff = await handleConfidenceHandoff({
    confidence: followUp.confidence,
    actionType: "followup_generation",
    workflowKey: "followup_generation",
    domain: "communications",
    entityType: "communication",
    entityId: params.communicationId,
    aiResult: followUp,
    aiResultSummary: `${followUp.channel} follow-up drafted (${followUp.keyPoints.length} key points)`,
    executeAction: async () => {
      return followUp;
    },
  });

  return { followUp, handoff };
}
