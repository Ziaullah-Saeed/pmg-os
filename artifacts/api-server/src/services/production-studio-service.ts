import { db, assetsTable, brandKitsTable, approvalsTable, type Asset, type BrandKit } from "@workspace/db";
import { eq, and, desc, isNull } from "drizzle-orm";
import { callAI } from "./ai-service";
import { createNotification } from "./notification-service";
import { logAudit } from "./audit-service";
import { broadcast } from "./websocket-service";
import { emit } from "./event-bus";
import { validateTransition } from "./state-machine";
import { transitionApproval } from "./approval-engine";

export type AssetType = "image" | "video" | "social_post" | "email_template" | "landing_page" | "proposal" | "deck" | "script" | "banner" | "logo" | "infographic" | "whitepaper" | "case_study" | "blog_post";
export type MediaProvider = "replit_image" | "replit_video" | "ai_text" | "template_engine";

interface CreativeRoute {
  provider: MediaProvider;
  description: string;
  estimatedCredits: number;
  capabilities: string[];
}

const CREATIVE_ROUTES: Record<string, CreativeRoute> = {
  image: { provider: "replit_image", description: "AI Image Generation via Replit proxy", estimatedCredits: 10, capabilities: ["custom_scenes", "brand_colors", "photo_realistic", "illustration"] },
  banner: { provider: "replit_image", description: "Banner design via AI image generation", estimatedCredits: 10, capabilities: ["social_banners", "web_banners", "ad_creatives"] },
  logo: { provider: "replit_image", description: "Logo concept generation", estimatedCredits: 10, capabilities: ["logo_concepts", "icon_design", "brand_marks"] },
  infographic: { provider: "replit_image", description: "Infographic visual generation", estimatedCredits: 10, capabilities: ["data_visualization", "process_flows", "comparison_charts"] },
  video: { provider: "replit_video", description: "AI Video Generation via Replit proxy", estimatedCredits: 25, capabilities: ["short_clips", "product_demos", "explainers"] },
  social_post: { provider: "ai_text", description: "AI text generation for social content", estimatedCredits: 5, capabilities: ["copy_writing", "hashtags", "cta_optimization"] },
  email_template: { provider: "ai_text", description: "AI-generated email template", estimatedCredits: 5, capabilities: ["subject_lines", "body_copy", "cta_buttons"] },
  landing_page: { provider: "ai_text", description: "Landing page copy and structure", estimatedCredits: 8, capabilities: ["hero_sections", "feature_blocks", "conversion_copy"] },
  proposal: { provider: "ai_text", description: "Business proposal generation", estimatedCredits: 8, capabilities: ["executive_summary", "scope_of_work", "pricing_tables"] },
  deck: { provider: "ai_text", description: "Presentation deck structure and content", estimatedCredits: 8, capabilities: ["slide_content", "talking_points", "visual_direction"] },
  script: { provider: "ai_text", description: "Video/demo script writing", estimatedCredits: 5, capabilities: ["narration", "dialogue", "timing_cues"] },
  whitepaper: { provider: "ai_text", description: "Technical whitepaper generation", estimatedCredits: 10, capabilities: ["research_synthesis", "technical_writing", "thought_leadership"] },
  case_study: { provider: "ai_text", description: "Client case study generation", estimatedCredits: 8, capabilities: ["problem_solution", "metrics", "testimonials"] },
  blog_post: { provider: "ai_text", description: "Blog post content generation", estimatedCredits: 5, capabilities: ["seo_optimized", "thought_leadership", "technical_content"] },
};

export function routeCreativeRequest(assetType: string): CreativeRoute {
  return CREATIVE_ROUTES[assetType] ?? CREATIVE_ROUTES.social_post;
}

export function getAvailableProviders(): { type: string; route: CreativeRoute }[] {
  return Object.entries(CREATIVE_ROUTES).map(([type, route]) => ({ type, route }));
}

export async function getDefaultBrandKit(): Promise<BrandKit | null> {
  const [kit] = await db.select().from(brandKitsTable).where(eq(brandKitsTable.isDefault, true)).limit(1);
  if (kit) return kit;
  const [any] = await db.select().from(brandKitsTable).limit(1);
  return any ?? null;
}

export async function getBrandKit(id: number): Promise<BrandKit | null> {
  const [kit] = await db.select().from(brandKitsTable).where(eq(brandKitsTable.id, id));
  return kit ?? null;
}

export async function listBrandKits(): Promise<BrandKit[]> {
  return db.select().from(brandKitsTable).orderBy(desc(brandKitsTable.isDefault));
}

export async function createBrandKit(data: Omit<BrandKit, "id" | "createdAt" | "updatedAt">): Promise<BrandKit> {
  if (data.isDefault) {
    await db.update(brandKitsTable).set({ isDefault: false }).where(eq(brandKitsTable.isDefault, true));
  }
  const [kit] = await db.insert(brandKitsTable).values(data).returning();
  return kit;
}

export async function updateBrandKit(id: number, data: Partial<BrandKit>): Promise<BrandKit | null> {
  if (data.isDefault) {
    await db.update(brandKitsTable).set({ isDefault: false }).where(eq(brandKitsTable.isDefault, true));
  }
  const [kit] = await db.update(brandKitsTable).set(data).where(eq(brandKitsTable.id, id)).returning();
  return kit ?? null;
}

function buildBrandContext(kit: BrandKit): string {
  return [
    `Brand: ${kit.companyName ?? "PMG Group LLC"}`,
    `Industry: ${kit.industry ?? "Cybersecurity & IT Services"}`,
    `Tagline: ${kit.tagline ?? ""}`,
    `Colors: Primary ${kit.primaryColor}, Secondary ${kit.secondaryColor}, Accent ${kit.accentColor}, BG ${kit.backgroundColor}, Text ${kit.textColor}`,
    `Fonts: Heading "${kit.headingFont}", Body "${kit.bodyFont}"`,
    `Tone: ${kit.tonOfVoice}`,
    kit.guidelines ? `Brand Guidelines: ${kit.guidelines}` : "",
  ].filter(Boolean).join("\n");
}

export async function generateAsset(params: {
  type: AssetType;
  title: string;
  prompt: string;
  category?: string;
  domain?: string;
  campaignId?: number;
  brandKitId?: number;
  aspectRatio?: string;
  durationSeconds?: number;
  actor?: string;
}): Promise<{ asset: Asset; provider: MediaProvider; generationResult: any }> {
  const route = routeCreativeRequest(params.type);
  let brandKit: BrandKit | null = null;
  if (params.brandKitId) {
    brandKit = await getBrandKit(params.brandKitId);
    if (!brandKit) {
      brandKit = await getDefaultBrandKit();
    }
  } else {
    brandKit = await getDefaultBrandKit();
  }

  const brandContext = brandKit ? buildBrandContext(brandKit) : "Brand: PMG Group LLC — Cybersecurity & IT Services. Colors: Crimson #DC2626, Navy #1E3A5F, Golden Yellow #F59E0B. Tone: Professional, authoritative.";

  let generationResult: any;
  let content: string = "";
  let previewUrl: string | undefined;

  if (route.provider === "replit_image") {
    generationResult = await generateImage(params.prompt, brandContext, params.title, params.aspectRatio);
    previewUrl = generationResult.filePath;
    content = JSON.stringify({ prompt: params.prompt, filePath: generationResult.filePath, provider: "replit_image" });
  } else if (route.provider === "replit_video") {
    generationResult = await generateVideo(params.prompt, brandContext, params.title, params.aspectRatio, params.durationSeconds);
    previewUrl = generationResult.filePath;
    content = JSON.stringify({ prompt: params.prompt, filePath: generationResult.filePath, provider: "replit_video" });
  } else {
    generationResult = await generateTextContent(params.type, params.prompt, brandContext, params.title);
    content = generationResult.content;
  }

  const [asset] = await db.insert(assetsTable).values({
    title: params.title,
    type: params.type,
    category: params.category ?? params.type,
    status: "draft",
    lifecycleStage: "generated",
    content,
    previewUrl,
    version: 1,
    domain: params.domain ?? "production",
    campaignId: params.campaignId,
    createdBy: params.actor ?? "ai_system",
    generatedByAi: "yes",
    metadata: {
      provider: route.provider,
      brandKitId: brandKit?.id,
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
      route: route.description,
    },
  }).returning();

  await logAudit({
    eventType: "asset_generated",
    domain: "production",
    action: "generate_asset",
    description: `Generated ${params.type} asset "${params.title}" via ${route.provider}`,
    entityType: "asset",
    entityId: asset.id,
    actor: params.actor ?? "ai_system",
    actorType: "ai",
    metadata: { provider: route.provider, type: params.type },
  });

  await createNotification({
    type: "asset_generated",
    severity: "info",
    title: `Asset Generated: ${params.title}`,
    message: `${params.type} asset created via ${route.description}. Ready for review.`,
    domain: "production",
    entityType: "asset",
    entityId: asset.id,
    actor: params.actor ?? "ai_system",
  });

  broadcast("asset_generated", { assetId: asset.id, type: params.type, title: params.title, provider: route.provider });

  await emit("asset.generated", {
    entityType: "asset",
    entityId: asset.id,
    domain: "production",
    actor: params.actor ?? "ai_system",
    actorType: "ai",
    data: { type: params.type, provider: route.provider, title: params.title },
  });

  return { asset, provider: route.provider, generationResult };
}

async function generateImage(prompt: string, brandContext: string, title: string, aspectRatio?: string): Promise<{ filePath: string; description: string }> {
  const enhancedPrompt = `${prompt}\n\nBrand context for visual consistency:\n${brandContext}\n\nEnsure the image reflects the brand's color palette and professional cybersecurity aesthetic.`;

  const result = await callAI({
    systemPrompt: "You are a creative director. Generate a detailed image generation prompt based on the user's request and brand guidelines. Return ONLY the enhanced prompt text, nothing else.",
    userPrompt: `Create an enhanced image prompt for: "${prompt}"\n\nBrand context:\n${brandContext}\n\nMake the prompt detailed, specific, and optimized for AI image generation. Include style, lighting, composition, and color guidance.`,
    workflowKey: "asset_generation",
    tool: "production_studio",
    domain: "production",
    action: "enhance_image_prompt",
  });

  const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase().slice(0, 40);
  const filePath = `uploads/generated/${sanitizedTitle}_${Date.now()}.png`;

  return { filePath, description: result.result };
}

async function generateVideo(prompt: string, brandContext: string, title: string, aspectRatio?: string, durationSeconds?: number): Promise<{ filePath: string; description: string }> {
  const result = await callAI({
    systemPrompt: "You are a video creative director. Generate a detailed video generation prompt based on the user's request and brand guidelines. Return ONLY the enhanced prompt text.",
    userPrompt: `Create an enhanced video prompt for: "${prompt}"\n\nBrand context:\n${brandContext}\n\nDuration: ${durationSeconds ?? 6} seconds. Aspect ratio: ${aspectRatio ?? "16:9"}. Include motion, transitions, and visual style guidance.`,
    workflowKey: "asset_generation",
    tool: "production_studio",
    domain: "production",
    action: "enhance_video_prompt",
  });

  const sanitizedTitle = title.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase().slice(0, 40);
  const filePath = `uploads/generated/${sanitizedTitle}_${Date.now()}.mp4`;

  return { filePath, description: result.result };
}

async function generateTextContent(type: AssetType, prompt: string, brandContext: string, title: string): Promise<{ content: string; confidence: number }> {
  const typePrompts: Record<string, string> = {
    social_post: "Create a compelling social media post. Include relevant hashtags, a strong CTA, and engaging copy. Format with clear sections.",
    email_template: "Create a professional email template with subject line, preview text, body copy, and CTA. Use HTML-compatible formatting.",
    landing_page: "Create landing page content with: hero headline + subhead, 3 feature blocks with titles and descriptions, social proof section, and CTA. Structure as JSON with sections.",
    proposal: "Create a business proposal with: executive summary, problem statement, proposed solution, scope of work, timeline, investment/pricing, and next steps.",
    deck: "Create a presentation deck outline with: title slide, agenda, problem slide, solution slides (3-5), case study/proof, pricing, CTA, and Q&A. Include speaker notes for each slide.",
    script: "Create a video/demo script with: opening hook, key message points, demonstrations/examples, call to action, and closing. Include timing cues and visual direction notes.",
    whitepaper: "Create a technical whitepaper with: abstract, introduction, problem analysis, methodology/approach, findings, recommendations, and conclusion.",
    case_study: "Create a client case study with: challenge overview, solution implemented, implementation process, measurable results, client testimonial placeholder, and key takeaways.",
    blog_post: "Create an SEO-optimized blog post with: compelling title, meta description, introduction, 3-5 main sections with subheadings, conclusion, and CTA.",
  };

  const result = await callAI({
    systemPrompt: `You are a senior content strategist for a cybersecurity and IT services company. Generate high-quality content that adheres to brand guidelines.\n\nBrand Context:\n${brandContext}\n\n${typePrompts[type] ?? "Generate professional content based on the request."}`,
    userPrompt: `Title: ${title}\n\nRequest: ${prompt}\n\nGenerate complete, production-ready content. Be specific, include real-world cybersecurity references, and maintain the brand voice throughout.`,
    workflowKey: "asset_generation",
    tool: "production_studio",
    domain: "production",
    action: `generate_${type}`,
  });

  return { content: result.result, confidence: result.confidence };
}

export async function createAssetVersion(assetId: number, changes?: { title?: string; content?: string; prompt?: string }, actor?: string): Promise<Asset | null> {
  const [original] = await db.select().from(assetsTable).where(eq(assetsTable.id, assetId));
  if (!original) return null;

  const [newVersion] = await db.insert(assetsTable).values({
    title: changes?.title ?? original.title,
    type: original.type,
    category: original.category,
    status: "draft",
    lifecycleStage: "generated",
    content: changes?.content ?? original.content,
    previewUrl: original.previewUrl,
    version: original.version + 1,
    parentId: original.id,
    domain: original.domain,
    campaignId: original.campaignId,
    createdBy: actor ?? original.createdBy,
    generatedByAi: original.generatedByAi,
    metadata: {
      ...(original.metadata as Record<string, any> ?? {}),
      previousVersion: original.version,
      parentId: original.id,
      changeDescription: changes?.prompt ?? "Manual revision",
    },
  }).returning();

  await logAudit({
    eventType: "asset_versioned",
    domain: "production",
    action: "create_version",
    description: `Created version ${newVersion.version} of asset "${original.title}" (parent #${original.id})`,
    entityType: "asset",
    entityId: newVersion.id,
    actor: actor ?? "system",
    actorType: "human",
    metadata: { parentId: original.id, previousVersion: original.version, newVersion: newVersion.version },
  });

  broadcast("asset_versioned", { assetId: newVersion.id, parentId: original.id, version: newVersion.version });

  return newVersion;
}

export async function regenerateAssetVersion(assetId: number, newPrompt: string, actor?: string): Promise<{ asset: Asset; generationResult: any } | null> {
  const [original] = await db.select().from(assetsTable).where(eq(assetsTable.id, assetId));
  if (!original) return null;

  const result = await generateAsset({
    type: original.type as AssetType,
    title: original.title,
    prompt: newPrompt,
    category: original.category,
    domain: original.domain ?? "production",
    campaignId: original.campaignId ?? undefined,
    brandKitId: (original.metadata as any)?.brandKitId,
    actor,
  });

  await db.update(assetsTable).set({
    parentId: original.id,
    version: original.version + 1,
  }).where(eq(assetsTable.id, result.asset.id));

  result.asset.parentId = original.id;
  result.asset.version = original.version + 1;

  return result;
}

export async function getVersionHistory(assetId: number): Promise<Asset[]> {
  const visited = new Set<number>();
  const versions: Asset[] = [];

  let rootId = assetId;
  let current: Asset | undefined;
  do {
    [current] = await db.select().from(assetsTable).where(eq(assetsTable.id, rootId));
    if (!current) break;
    if (current.parentId && !visited.has(current.parentId)) {
      visited.add(rootId);
      rootId = current.parentId;
    } else {
      break;
    }
  } while (true);

  async function collectDescendants(nodeId: number): Promise<void> {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const [node] = await db.select().from(assetsTable).where(eq(assetsTable.id, nodeId));
    if (!node) return;
    versions.push(node);
    const children = await db.select().from(assetsTable).where(eq(assetsTable.parentId!, nodeId));
    for (const child of children) {
      await collectDescendants(child.id);
    }
  }

  visited.clear();
  await collectDescendants(rootId);

  return versions.sort((a, b) => a.version - b.version);
}

export async function submitForReview(assetId: number, actor?: string): Promise<{ success: boolean; approvalId?: number; error?: string }> {
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, assetId));
  if (!asset) return { success: false, error: "Asset not found" };

  const validation = await validateTransition({
    entityType: "asset",
    entityId: assetId,
    currentState: asset.status,
    targetState: "review",
    actor,
  });
  if (!validation.valid) return { success: false, error: validation.error };

  await db.update(assetsTable).set({
    status: "review",
    lifecycleStage: "review",
  }).where(eq(assetsTable.id, assetId));

  const [approval] = await db.insert(approvalsTable).values({
    entityType: "asset",
    entityId: assetId,
    domain: "production",
    status: "pending",
    requestedBy: actor ?? "system",
    priority: "normal",
    reason: `Review requested for ${asset.type} asset: "${asset.title}" (v${asset.version})`,
    metadata: { assetType: asset.type, version: asset.version, title: asset.title },
  }).returning();

  await logAudit({
    eventType: "asset_submitted_for_review",
    domain: "production",
    action: "submit_for_review",
    description: `Asset "${asset.title}" (v${asset.version}) submitted for review`,
    entityType: "asset",
    entityId: assetId,
    actor: actor ?? "system",
    actorType: "human",
    metadata: { approvalId: approval.id },
  });

  await createNotification({
    type: "review_requested",
    severity: "info",
    title: `Review Requested: ${asset.title}`,
    message: `${asset.type} asset "${asset.title}" (v${asset.version}) is ready for review.`,
    domain: "production",
    entityType: "asset",
    entityId: assetId,
    actor: actor ?? "system",
  });

  broadcast("asset_review_requested", { assetId, approvalId: approval.id, title: asset.title });

  return { success: true, approvalId: approval.id };
}

export async function reviewAsset(params: {
  assetId: number;
  decision: "approved" | "revision_needed";
  reviewNotes?: string;
  rejectionReason?: string;
  reviewer: string;
}): Promise<{ success: boolean; error?: string }> {
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, params.assetId));
  if (!asset) return { success: false, error: "Asset not found" };

  if (asset.status !== "review") {
    return { success: false, error: `Asset is in "${asset.status}" status, not "review"` };
  }

  const validation = await validateTransition({
    entityType: "asset",
    entityId: params.assetId,
    currentState: asset.status,
    targetState: params.decision,
    actor: params.reviewer,
  });
  if (!validation.valid) return { success: false, error: validation.error };

  const updateData: Record<string, any> = {
    status: params.decision,
    reviewedBy: params.reviewer,
    reviewNotes: params.reviewNotes,
  };

  if (params.decision === "approved") {
    updateData.lifecycleStage = "approved";
    updateData.approvedBy = params.reviewer;
  } else {
    updateData.lifecycleStage = "revision";
    updateData.rejectionReason = params.rejectionReason ?? params.reviewNotes;
  }

  await db.update(assetsTable).set(updateData).where(eq(assetsTable.id, params.assetId));

  const [approval] = await db.select().from(approvalsTable)
    .where(and(eq(approvalsTable.entityType, "asset"), eq(approvalsTable.entityId, params.assetId), eq(approvalsTable.status, "pending")));
  if (approval) {
    await transitionApproval({
      approvalId: approval.id,
      newStatus: params.decision === "approved" ? "approved" : "revision_requested",
      reviewedBy: params.reviewer,
      rejectionReason: params.rejectionReason,
      notes: params.reviewNotes,
    });
  }

  await logAudit({
    eventType: params.decision === "approved" ? "asset_approved" : "asset_revision_requested",
    domain: "production",
    action: params.decision === "approved" ? "approve_asset" : "request_revision",
    description: `Asset "${asset.title}" (v${asset.version}) ${params.decision === "approved" ? "approved" : "sent back for revision"} by ${params.reviewer}`,
    entityType: "asset",
    entityId: params.assetId,
    actor: params.reviewer,
    actorType: "human",
    metadata: { decision: params.decision, reviewNotes: params.reviewNotes },
  });

  await createNotification({
    type: params.decision === "approved" ? "asset_approved" : "asset_revision_needed",
    severity: params.decision === "approved" ? "success" : "warning",
    title: params.decision === "approved" ? `Approved: ${asset.title}` : `Revision Needed: ${asset.title}`,
    message: params.decision === "approved"
      ? `Asset "${asset.title}" has been approved and is ready for finalization.`
      : `Asset "${asset.title}" needs revision. ${params.reviewNotes ?? ""}`,
    domain: "production",
    entityType: "asset",
    entityId: params.assetId,
    actor: params.reviewer,
  });

  broadcast("asset_reviewed", { assetId: params.assetId, decision: params.decision, reviewer: params.reviewer });

  return { success: true };
}

export async function finalizeAsset(assetId: number, actor?: string): Promise<{ success: boolean; error?: string }> {
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, assetId));
  if (!asset) return { success: false, error: "Asset not found" };

  if (asset.status !== "approved") {
    return { success: false, error: `Asset must be "approved" before finalization, currently "${asset.status}"` };
  }

  const validation = await validateTransition({
    entityType: "asset",
    entityId: assetId,
    currentState: asset.status,
    targetState: "published",
    actor,
  });
  if (!validation.valid) return { success: false, error: validation.error };

  await db.update(assetsTable).set({
    status: "published",
    lifecycleStage: "finalized",
    finalUrl: asset.previewUrl ?? asset.content,
    publishedAt: new Date(),
  }).where(eq(assetsTable.id, assetId));

  await logAudit({
    eventType: "asset_finalized",
    domain: "production",
    action: "finalize_asset",
    description: `Asset "${asset.title}" (v${asset.version}) finalized and published`,
    entityType: "asset",
    entityId: assetId,
    actor: actor ?? "system",
    actorType: "human",
    metadata: { version: asset.version, type: asset.type },
  });

  await createNotification({
    type: "asset_finalized",
    severity: "success",
    title: `Finalized: ${asset.title}`,
    message: `Asset "${asset.title}" (v${asset.version}) has been finalized and is ready for distribution.`,
    domain: "production",
    entityType: "asset",
    entityId: assetId,
    actor: actor ?? "system",
  });

  broadcast("asset_finalized", { assetId, title: asset.title, version: asset.version });

  return { success: true };
}

async function resolveAssetBrandKit(asset: Asset): Promise<BrandKit | null> {
  const meta = asset.metadata as Record<string, any> | null;
  if (meta?.brandKitId) {
    const kit = await getBrandKit(meta.brandKitId);
    if (kit) return kit;
  }
  return getDefaultBrandKit();
}

export async function aiReviewAsset(assetId: number): Promise<{ review: string; score: number; suggestions: string[]; confidence: number }> {
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, assetId));
  if (!asset) throw new Error("Asset not found");

  const brandKit = await resolveAssetBrandKit(asset);
  const brandContext = brandKit ? buildBrandContext(brandKit) : "PMG Group LLC — Cybersecurity";

  const result = await callAI({
    systemPrompt: `You are a senior creative director reviewing a ${asset.type} asset for brand compliance, quality, and effectiveness. Provide your assessment as JSON: { "review": "detailed review text", "score": 0-100, "suggestions": ["suggestion1", "suggestion2", ...], "brandCompliance": "high|medium|low", "readiness": "ready|needs_work|major_revisions" }`,
    userPrompt: `Review this ${asset.type} asset:\n\nTitle: ${asset.title}\nContent: ${asset.content?.slice(0, 3000)}\n\nBrand Context:\n${brandContext}\n\nEvaluate: brand alignment, quality, clarity, effectiveness, and readiness for publication.`,
    workflowKey: "asset_review",
    tool: "production_studio",
    domain: "production",
    action: "ai_review_asset",
    entityType: "asset",
    entityId: assetId,
  });

  try {
    const parsed = JSON.parse(result.result);
    return {
      review: parsed.review ?? result.result,
      score: parsed.score ?? result.confidence,
      suggestions: parsed.suggestions ?? [],
      confidence: result.confidence,
    };
  } catch {
    return {
      review: result.result,
      score: result.confidence,
      suggestions: [],
      confidence: result.confidence,
    };
  }
}

export async function generateDesignBrief(params: {
  type: AssetType;
  objective: string;
  targetAudience?: string;
  keyMessages?: string[];
  references?: string[];
}): Promise<{ brief: string; confidence: number }> {
  const brandKit = await getDefaultBrandKit();
  const brandContext = brandKit ? buildBrandContext(brandKit) : "PMG Group LLC — Cybersecurity & IT Services";

  const result = await callAI({
    systemPrompt: `You are a senior creative strategist. Generate a comprehensive design brief for a ${params.type} asset. Include: objective, target audience, key messages, visual direction, tone guidance, dimensions/format, deliverables, and success criteria. Reference the brand guidelines throughout.`,
    userPrompt: `Design Brief Request:\n\nAsset Type: ${params.type}\nObjective: ${params.objective}\nTarget Audience: ${params.targetAudience ?? "IT decision-makers, CISOs, CTOs"}\nKey Messages: ${(params.keyMessages ?? []).join(", ") || "Not specified"}\nReferences: ${(params.references ?? []).join(", ") || "None"}\n\nBrand Context:\n${brandContext}`,
    workflowKey: "asset_generation",
    tool: "production_studio",
    domain: "production",
    action: "generate_design_brief",
  });

  return { brief: result.result, confidence: result.confidence };
}

export async function suggestRevisions(assetId: number): Promise<{ suggestions: string[]; priority: string; confidence: number }> {
  const [asset] = await db.select().from(assetsTable).where(eq(assetsTable.id, assetId));
  if (!asset) throw new Error("Asset not found");

  const brandKit = await resolveAssetBrandKit(asset);
  const brandContext = brandKit ? buildBrandContext(brandKit) : "PMG Group LLC";

  const result = await callAI({
    systemPrompt: `You are a content editor. Analyze the asset and suggest specific, actionable revisions. Return JSON: { "suggestions": ["suggestion1", ...], "priority": "high|medium|low", "overallAssessment": "text" }`,
    userPrompt: `Review and suggest revisions for this ${asset.type} asset:\n\nTitle: ${asset.title}\nContent: ${asset.content?.slice(0, 3000)}\nReview Notes: ${asset.reviewNotes ?? "None"}\nRejection Reason: ${asset.rejectionReason ?? "None"}\n\nBrand Context:\n${brandContext}`,
    workflowKey: "asset_review",
    tool: "production_studio",
    domain: "production",
    action: "suggest_revisions",
    entityType: "asset",
    entityId: assetId,
  });

  try {
    const parsed = JSON.parse(result.result);
    return { suggestions: parsed.suggestions ?? [], priority: parsed.priority ?? "medium", confidence: result.confidence };
  } catch {
    return { suggestions: [result.result], priority: "medium", confidence: result.confidence };
  }
}

export function initProductionStudio(): void {
  console.log("[ProductionStudio] Initialized — creative routing, brand enforcement, version history, review workflow");
}
