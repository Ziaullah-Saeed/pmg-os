import { callAI } from "./ai-service";

export type CreativeCategory = "image" | "video" | "audio" | "3d" | "design" | "text" | "brand" | "photo" | "typography";
export type QualityTier = "studio" | "professional" | "standard" | "draft";
export type SpeedTier = "realtime" | "fast" | "standard" | "slow";

export interface CreativeProvider {
  id: string;
  name: string;
  category: CreativeCategory;
  capabilities: string[];
  assetTypes: string[];
  qualityTier: QualityTier;
  speedTier: SpeedTier;
  costPerCredit: number;
  maxResolution?: string;
  outputFormats: string[];
  description: string;
  status: "active" | "coming_soon" | "beta";
  icon: string;
  bestFor: string[];
}

export const CREATIVE_PROVIDERS: CreativeProvider[] = [
  {
    id: "midjourney",
    name: "Midjourney",
    category: "image",
    capabilities: ["photorealistic", "artistic", "concept_art", "illustration", "brand_imagery", "product_shots", "scene_composition"],
    assetTypes: ["image", "banner", "social_post", "infographic"],
    qualityTier: "studio",
    speedTier: "standard",
    costPerCredit: 15,
    maxResolution: "4096x4096",
    outputFormats: ["png", "jpg", "webp"],
    description: "Premier AI image generation — photorealistic and artistic styles",
    status: "active",
    icon: "🎨",
    bestFor: ["hero_images", "brand_campaigns", "concept_art", "editorial"],
  },
  {
    id: "flux",
    name: "FLUX Pro",
    category: "image",
    capabilities: ["photorealistic", "fast_generation", "text_rendering", "style_transfer", "inpainting", "outpainting"],
    assetTypes: ["image", "banner", "logo", "infographic"],
    qualityTier: "professional",
    speedTier: "fast",
    costPerCredit: 8,
    maxResolution: "2048x2048",
    outputFormats: ["png", "jpg", "webp"],
    description: "Fast high-quality image generation with excellent text rendering",
    status: "active",
    icon: "⚡",
    bestFor: ["rapid_iteration", "text_heavy_designs", "social_media", "ads"],
  },
  {
    id: "recraft",
    name: "Recraft",
    category: "design",
    capabilities: ["vector_generation", "icon_design", "illustration", "brand_consistent", "svg_output", "style_matching"],
    assetTypes: ["logo", "banner", "infographic", "image"],
    qualityTier: "professional",
    speedTier: "fast",
    costPerCredit: 10,
    maxResolution: "4096x4096",
    outputFormats: ["svg", "png", "jpg"],
    description: "AI design tool for vectors, icons, and brand-consistent illustrations",
    status: "active",
    icon: "✏️",
    bestFor: ["icons", "logos", "vector_graphics", "brand_assets"],
  },
  {
    id: "bannerbear",
    name: "Bannerbear",
    category: "design",
    capabilities: ["template_based", "dynamic_images", "batch_generation", "social_media_templates", "ad_creatives", "automated_variants"],
    assetTypes: ["banner", "social_post", "email_template"],
    qualityTier: "professional",
    speedTier: "realtime",
    costPerCredit: 3,
    maxResolution: "2048x2048",
    outputFormats: ["png", "jpg", "gif", "mp4"],
    description: "Automated image and video generation from templates — perfect for ads and social",
    status: "active",
    icon: "🐻",
    bestFor: ["ad_creatives", "social_variants", "dynamic_banners", "batch_generation"],
  },
  {
    id: "kittl",
    name: "Kittl",
    category: "design",
    capabilities: ["typography_design", "poster_design", "merch_design", "logo_design", "brand_templates"],
    assetTypes: ["logo", "banner", "social_post", "deck"],
    qualityTier: "professional",
    speedTier: "fast",
    costPerCredit: 6,
    maxResolution: "4096x4096",
    outputFormats: ["svg", "png", "pdf"],
    description: "Professional design tool for typography, logos, and print-ready assets",
    status: "active",
    icon: "🎯",
    bestFor: ["typography", "print_design", "merchandise", "brand_identity"],
  },
  {
    id: "runway",
    name: "Runway Gen-3",
    category: "video",
    capabilities: ["text_to_video", "image_to_video", "video_editing", "motion_brush", "style_transfer", "green_screen"],
    assetTypes: ["video"],
    qualityTier: "studio",
    speedTier: "slow",
    costPerCredit: 30,
    maxResolution: "1920x1080",
    outputFormats: ["mp4", "mov"],
    description: "Industry-leading AI video generation and editing",
    status: "active",
    icon: "🎬",
    bestFor: ["commercial_video", "product_demos", "explainers", "cinematic"],
  },
  {
    id: "kling",
    name: "Kling AI",
    category: "video",
    capabilities: ["text_to_video", "image_to_video", "lip_sync", "motion_generation", "long_form"],
    assetTypes: ["video"],
    qualityTier: "professional",
    speedTier: "standard",
    costPerCredit: 20,
    maxResolution: "1920x1080",
    outputFormats: ["mp4"],
    description: "High-quality AI video with excellent motion and lip-sync",
    status: "active",
    icon: "🎥",
    bestFor: ["talking_head", "product_showcase", "social_video", "lip_sync"],
  },
  {
    id: "luma",
    name: "Luma Dream Machine",
    category: "video",
    capabilities: ["text_to_video", "image_to_video", "3d_aware", "camera_control", "scene_generation"],
    assetTypes: ["video"],
    qualityTier: "professional",
    speedTier: "standard",
    costPerCredit: 20,
    maxResolution: "1920x1080",
    outputFormats: ["mp4"],
    description: "3D-aware video generation with cinematic camera control",
    status: "active",
    icon: "🌙",
    bestFor: ["3d_scenes", "architectural", "product_360", "cinematic_motion"],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    category: "audio",
    capabilities: ["text_to_speech", "voice_cloning", "multilingual", "emotion_control", "sound_effects", "music_generation"],
    assetTypes: ["script", "video"],
    qualityTier: "studio",
    speedTier: "fast",
    costPerCredit: 8,
    outputFormats: ["mp3", "wav", "ogg"],
    description: "Ultra-realistic AI voice synthesis and audio production",
    status: "active",
    icon: "🎙️",
    bestFor: ["voiceover", "narration", "podcast", "multilingual_content"],
  },
  {
    id: "descript",
    name: "Descript",
    category: "video",
    capabilities: ["video_editing", "transcript_editing", "filler_removal", "eye_contact", "overdub", "screen_recording"],
    assetTypes: ["video", "script"],
    qualityTier: "professional",
    speedTier: "fast",
    costPerCredit: 12,
    maxResolution: "4K",
    outputFormats: ["mp4", "wav", "srt"],
    description: "AI-powered video editing — edit video like editing a document",
    status: "active",
    icon: "📝",
    bestFor: ["video_editing", "podcast_editing", "transcript_cleanup", "screen_recordings"],
  },
  {
    id: "claid",
    name: "Claid.ai",
    category: "photo",
    capabilities: ["image_enhancement", "background_removal", "upscaling", "color_correction", "batch_processing", "product_enhancement"],
    assetTypes: ["image", "banner"],
    qualityTier: "professional",
    speedTier: "realtime",
    costPerCredit: 3,
    maxResolution: "8192x8192",
    outputFormats: ["png", "jpg", "webp"],
    description: "AI-powered image enhancement and product photo optimization",
    status: "active",
    icon: "🔍",
    bestFor: ["product_photos", "image_upscaling", "enhancement", "ecommerce"],
  },
  {
    id: "flair",
    name: "Flair AI",
    category: "photo",
    capabilities: ["product_photography", "scene_staging", "lifestyle_shots", "branded_backgrounds", "batch_variants"],
    assetTypes: ["image", "banner", "social_post"],
    qualityTier: "professional",
    speedTier: "fast",
    costPerCredit: 8,
    maxResolution: "2048x2048",
    outputFormats: ["png", "jpg"],
    description: "AI product photography — place products in stunning scenes",
    status: "active",
    icon: "📸",
    bestFor: ["product_staging", "lifestyle_photos", "ecommerce", "catalog"],
  },
  {
    id: "siliconflow",
    name: "SiliconFlow",
    category: "image",
    capabilities: ["fast_inference", "model_variety", "stable_diffusion", "sdxl", "controlnet", "lora_support"],
    assetTypes: ["image", "banner", "logo"],
    qualityTier: "standard",
    speedTier: "realtime",
    costPerCredit: 2,
    maxResolution: "2048x2048",
    outputFormats: ["png", "jpg"],
    description: "High-speed AI inference platform — fastest generation at lowest cost",
    status: "active",
    icon: "🚀",
    bestFor: ["rapid_prototyping", "bulk_generation", "a_b_testing", "drafts"],
  },
  {
    id: "photoroom",
    name: "Photoroom",
    category: "photo",
    capabilities: ["background_removal", "product_staging", "batch_editing", "shadow_generation", "resize_smart"],
    assetTypes: ["image", "banner", "social_post"],
    qualityTier: "professional",
    speedTier: "realtime",
    costPerCredit: 3,
    maxResolution: "4096x4096",
    outputFormats: ["png", "jpg", "webp"],
    description: "AI background removal and product photo studio",
    status: "active",
    icon: "🖼️",
    bestFor: ["background_removal", "product_photos", "catalog_images", "social_media"],
  },
  {
    id: "brandfetch",
    name: "Brandfetch",
    category: "brand",
    capabilities: ["brand_lookup", "logo_retrieval", "color_extraction", "font_detection", "brand_guidelines"],
    assetTypes: ["logo"],
    qualityTier: "professional",
    speedTier: "realtime",
    costPerCredit: 1,
    outputFormats: ["svg", "png"],
    description: "Retrieve any company's brand assets — logos, colors, fonts",
    status: "active",
    icon: "🏢",
    bestFor: ["competitor_analysis", "partner_branding", "brand_research", "co_branding"],
  },
  {
    id: "google_fonts",
    name: "Google Fonts",
    category: "typography",
    capabilities: ["font_library", "font_pairing", "variable_fonts", "web_fonts", "free_commercial"],
    assetTypes: ["landing_page", "deck", "email_template", "banner"],
    qualityTier: "professional",
    speedTier: "realtime",
    costPerCredit: 0,
    outputFormats: ["woff2", "ttf", "otf"],
    description: "Open-source font library — 1,500+ font families for any project",
    status: "active",
    icon: "🔤",
    bestFor: ["web_typography", "print_typography", "brand_fonts", "presentation_design"],
  },
];

export interface RoutingRecommendation {
  primary: CreativeProvider;
  alternatives: CreativeProvider[];
  reason: string;
  estimatedCredits: number;
  estimatedTime: string;
  pipeline: RoutingPipelineStep[];
}

export interface RoutingPipelineStep {
  step: number;
  provider: CreativeProvider;
  action: string;
  outputType: string;
}

export function getProviderById(id: string): CreativeProvider | undefined {
  return CREATIVE_PROVIDERS.find(p => p.id === id);
}

export function getProvidersByCategory(category: CreativeCategory): CreativeProvider[] {
  return CREATIVE_PROVIDERS.filter(p => p.category === category && p.status === "active");
}

export function getProvidersForAssetType(assetType: string): CreativeProvider[] {
  return CREATIVE_PROVIDERS.filter(p => p.status === "active" && p.assetTypes.includes(assetType));
}

export function routeCreativeTask(
  assetType: string,
  options: {
    qualityPreference?: QualityTier;
    speedPreference?: SpeedTier;
    budgetSensitive?: boolean;
    specificProvider?: string;
    needsAudio?: boolean;
    needsEditing?: boolean;
  } = {}
): RoutingRecommendation {
  if (options.specificProvider) {
    const provider = getProviderById(options.specificProvider);
    if (provider) {
      return {
        primary: provider,
        alternatives: getProvidersForAssetType(assetType).filter(p => p.id !== provider.id).slice(0, 3),
        reason: `User selected ${provider.name}`,
        estimatedCredits: provider.costPerCredit,
        estimatedTime: speedToTime(provider.speedTier),
        pipeline: [{ step: 1, provider, action: "generate", outputType: assetType }],
      };
    }
  }

  const candidates = getProvidersForAssetType(assetType).filter(p => p.status === "active");
  if (candidates.length === 0) {
    const fallback = CREATIVE_PROVIDERS.find(p => p.id === "flux") ?? CREATIVE_PROVIDERS[0];
    return {
      primary: fallback,
      alternatives: [],
      reason: "Fallback provider — no specialized provider for this asset type",
      estimatedCredits: fallback.costPerCredit,
      estimatedTime: speedToTime(fallback.speedTier),
      pipeline: [{ step: 1, provider: fallback, action: "generate", outputType: assetType }],
    };
  }

  let scored = candidates.map(p => {
    let score = 0;
    if (options.qualityPreference) {
      const qualityMap: Record<QualityTier, number> = { studio: 4, professional: 3, standard: 2, draft: 1 };
      const target = qualityMap[options.qualityPreference];
      const actual = qualityMap[p.qualityTier];
      score += (4 - Math.abs(target - actual)) * 10;
    } else {
      score += p.qualityTier === "studio" ? 30 : p.qualityTier === "professional" ? 25 : 15;
    }

    if (options.speedPreference) {
      const speedMap: Record<SpeedTier, number> = { realtime: 4, fast: 3, standard: 2, slow: 1 };
      const target = speedMap[options.speedPreference];
      const actual = speedMap[p.speedTier];
      score += (4 - Math.abs(target - actual)) * 8;
    }

    if (options.budgetSensitive) {
      score += Math.max(0, 20 - p.costPerCredit);
    }

    score += p.capabilities.length * 2;

    return { provider: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const primary = scored[0].provider;
  const alternatives = scored.slice(1, 4).map(s => s.provider);

  const pipeline: RoutingPipelineStep[] = [{ step: 1, provider: primary, action: "generate", outputType: assetType }];

  if (options.needsAudio && primary.category !== "audio") {
    const audioProvider = CREATIVE_PROVIDERS.find(p => p.id === "elevenlabs");
    if (audioProvider) pipeline.push({ step: 2, provider: audioProvider, action: "add_voiceover", outputType: "audio" });
  }

  if (options.needsEditing && !primary.capabilities.includes("video_editing")) {
    const editor = CREATIVE_PROVIDERS.find(p => p.id === "descript");
    if (editor) pipeline.push({ step: pipeline.length + 1, provider: editor, action: "post_production", outputType: "video" });
  }

  const reason = buildRoutingReason(primary, assetType, options);

  return {
    primary,
    alternatives,
    reason,
    estimatedCredits: pipeline.reduce((sum, step) => sum + step.provider.costPerCredit, 0),
    estimatedTime: speedToTime(primary.speedTier),
    pipeline,
  };
}

function speedToTime(tier: SpeedTier): string {
  switch (tier) {
    case "realtime": return "< 10 seconds";
    case "fast": return "30-60 seconds";
    case "standard": return "2-5 minutes";
    case "slow": return "5-15 minutes";
  }
}

function buildRoutingReason(provider: CreativeProvider, assetType: string, options: any): string {
  const parts: string[] = [`${provider.name} selected for ${assetType} generation`];
  if (options.qualityPreference) parts.push(`${options.qualityPreference} quality requested`);
  if (options.speedPreference) parts.push(`${options.speedPreference} speed preferred`);
  if (options.budgetSensitive) parts.push(`budget-optimized`);
  parts.push(`${provider.qualityTier} tier, ${provider.speedTier} speed, ${provider.costPerCredit} credits`);
  return parts.join(" — ");
}

export async function getAIRoutingRecommendation(
  assetType: string,
  prompt: string,
  brandContext?: string
): Promise<{ providerId: string; reason: string; confidence: number }> {
  try {
    const providerList = getProvidersForAssetType(assetType)
      .map(p => `${p.id}: ${p.name} (${p.qualityTier}, ${p.speedTier}, ${p.costPerCredit}cr) — ${p.description}. Best for: ${p.bestFor.join(", ")}`)
      .join("\n");

    const aiResult = await callAI({
      systemPrompt: `You are a Creative Director at PMG Group, a cybersecurity/IT agency. Given this creative brief, recommend the BEST AI provider. Respond ONLY with JSON: {"providerId":"...","reason":"...","confidence":0.0-1.0}`,
      userPrompt: `Asset type: ${assetType}\nPrompt: ${prompt}\n${brandContext ? `Brand: ${brandContext}\n` : ""}\nAvailable providers:\n${providerList}`,
      workflowKey: "creative_routing",
      tool: "creative_router",
      domain: "production",
      action: "ai_route_creative",
    });

    const parsed = JSON.parse(aiResult.result.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    return {
      providerId: parsed.providerId ?? "flux",
      reason: parsed.reason ?? "AI-recommended provider",
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.7)),
    };
  } catch {
    return { providerId: "flux", reason: "Default fallback — AI recommendation unavailable", confidence: 0.5 };
  }
}
