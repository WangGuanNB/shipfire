import { duoImagePrompt } from "@/ai/duo-image-prompt";
import { duoVideoPrompt } from "@/ai/duo-video-prompt";
import { quoteCredits } from "@/lib/quote-credits";
import { getToolCatalog } from "@/config/ai";
import { getVideoPresets, getWorkbenchPages } from "@/config/video-workbench";
import { httpsUrl, resolveReferenceMediaUrl } from "./media-url";
import { ToolError, type ToolInput, type ToolModel } from "./types";
import type {
  GenerationStrategy,
  PublicWorkbenchPage,
  PublicWorkbenchVariant,
  VideoPreset,
  VideoVariant,
  WorkbenchAudio,
  WorkbenchPageConfig,
} from "./workbench-types";
import { workbenchCreditKey } from "./workbench-types";

const CLIENT_FIELDS = new Set([
  "presetId", "presetVersion", "variantId", "pricingVersion", "images", "prompt",
  "resolution", "duration", "aspectRatio", "audio", "consent", "locale", "exampleId",
]);

function modelOf(variant: VideoVariant): ToolModel | undefined {
  const tool = getToolCatalog().find(item => item.id === variant.toolId && item.enabled);
  return tool?.models.find(item => item.id === variant.modelId && item.enabled);
}

function capabilityList(model: ToolModel, key: string): unknown[] {
  const value = (model.capabilities as Record<string, unknown>)[key];
  return Array.isArray(value) ? value : [];
}

function maxImages(model: ToolModel): number {
  const value = Number((model.capabilities as { maxImages?: number }).maxImages ?? 1);
  return Number.isInteger(value) ? value : 1;
}

export function quoteVariantRetail(variant: VideoVariant, resolution: string, duration: number): number {
  const rate = variant.retailPricing.perSecond[resolution];
  const templateSeconds = variant.strategy === "video-reference"
    ? Number(variant.operatorAssets.find(asset => asset.kind === "video")?.durationSeconds ?? 0)
    : 0;
  if (!Number.isInteger(duration) || duration <= 0 || !Number.isInteger(templateSeconds) || templateSeconds < 0 ||
      !Number.isFinite(rate) || rate <= 0 ||
      !Number.isSafeInteger(variant.retailPricing.minimum) || variant.retailPricing.minimum < 0) {
    throw new ToolError("Invalid workbench pricing", 503);
  }
  const result = Math.max(variant.retailPricing.minimum, Math.ceil((duration + templateSeconds) * rate));
  if (!Number.isSafeInteger(result) || result <= 0) throw new ToolError("Invalid workbench pricing", 503);
  return result;
}

function durationAllowed(model: ToolModel, duration: number): boolean {
  const listed = capabilityList(model, "durations").map(Number);
  if (listed.length) return listed.includes(duration);
  const min = Number((model.capabilities as { minOutputSeconds?: number }).minOutputSeconds);
  const max = Number((model.capabilities as { maxOutputSeconds?: number }).maxOutputSeconds);
  return Number.isInteger(duration) && duration >= min && duration <= max;
}

function outputAllowed(variant: VideoVariant, model: ToolModel): boolean {
  const resolutions = capabilityList(model, "resolutions").map(String);
  const aspects = capabilityList(model, "aspectRatios").map(String);
  const modes = capabilityList(model, "modes").map(String);
  const needsImage = variant.strategy === "first-frame" || variant.strategy === "image-reference";
  if (needsImage && !modes.includes("image")) return false;
  if (variant.strategy === "text" && !modes.includes("text")) return false;
  if (variant.strategy === "video-reference" && !modes.includes("reference")) return false;
  return variant.output.resolutions.every(item => resolutions.includes(item)) &&
    variant.output.aspectRatios.every(item => aspects.includes(item)) &&
    variant.output.durations.every(item => durationAllowed(model, item)) &&
    resolutions.includes(variant.output.resolution) &&
    aspects.includes(variant.output.aspectRatio) &&
    durationAllowed(model, variant.output.duration);
}

/** Reject a variant that cannot be submitted. Drafts stay visible with ready=false. */
export function assertVariant(variant: VideoVariant, model: ToolModel): void {
  const slots = variant.inputSlots;
  const images = [
    ...slots.filter(slot => slot.purpose === "identity" || slot.purpose === "first-frame"),
    ...variant.operatorAssets.filter(asset => asset.kind === "image"),
  ];
  try {
    if (!variant.enabled || !model.enabled || variant.modelId !== model.id) throw new Error("model");
    if (!outputAllowed(variant, model)) throw new Error("output");
    if (new Set(slots.map(slot => slot.id)).size !== slots.length) throw new Error("slots");
    if (slots.some(slot => !/^[a-z0-9-]+$/.test(slot.id) || slot.maxCount < 1)) throw new Error("slots");
    if (variant.strategy === "text" && (slots.length || variant.operatorAssets.length)) throw new Error("text");
    if (variant.strategy === "first-frame" && (slots.length !== 1 || slots[0].purpose !== "first-frame" || variant.operatorAssets.length)) throw new Error("frame");
    if (variant.strategy === "image-reference" && variant.operatorAssets.some(asset => asset.kind !== "image")) throw new Error("image");
    if (variant.strategy === "video-reference") {
      const videos = variant.operatorAssets.filter(asset => asset.kind === "video");
      if (videos.length !== 1 || !Number.isInteger(videos[0].durationSeconds) || videos[0].durationSeconds! <= 0) throw new Error("video");
      httpsUrl(resolveReferenceMediaUrl(videos[0].url));
    }
    for (const asset of variant.operatorAssets.filter(item => item.kind === "image")) httpsUrl(resolveReferenceMediaUrl(asset.url));
    if (variant.strategy === "image-reference" || variant.strategy === "video-reference") {
      const required = slots.filter(slot => slot.required).length + variant.operatorAssets.filter(asset => asset.kind === "image").length;
      if (required < 1 || images.length > maxImages(model)) throw new Error("count");
    }
    if (!["editable", "prefilled", "append", "locked"].includes(variant.promptPolicy.mode)) throw new Error("prompt");
    if (variant.promptPolicy.mode !== "editable" && !variant.promptPolicy.instruction.trim()) throw new Error("prompt");
    if (variant.promptPolicy.mode === "prefilled" && (!variant.defaultPrompt?.en.trim() || !variant.defaultPrompt.zh.trim())) throw new Error("prompt");
    if (variant.strategy === "image-reference" && /reference video/i.test(`${variant.promptPolicy.instruction}\n${variant.defaultPrompt?.en ?? ""}\n${variant.defaultPrompt?.zh ?? ""}`)) throw new Error("prompt");
    for (const resolution of variant.output.resolutions) {
      for (const duration of variant.output.durations) quoteVariantRetail(variant, resolution, duration);
    }
    const modelForBasic = variant.strategy === "text" || variant.strategy === "first-frame" ? model : undefined;
    if (modelForBasic) quoteCredits(modelForBasic, { resolution: variant.output.resolution, duration: variant.output.duration });
  } catch (error) {
    if (error instanceof ToolError) throw error;
    throw new ToolError("This workbench variant is not configured or approved yet", 503);
  }
}

function findPreset(presetId: unknown, presets: VideoPreset[]): VideoPreset {
  const preset = presets.find(item => item.id === presetId && item.enabled);
  if (!preset) throw new ToolError("Workbench preset not found", 404);
  return preset;
}

function findVariant(preset: VideoPreset, variantId: unknown): VideoVariant {
  const variant = preset.variants.find(item => item.id === variantId && item.enabled);
  if (!variant) throw new ToolError("Workbench variant not found", 404);
  return variant;
}

function choice<T extends string>(value: unknown, allowed: readonly T[], fallback: T, message: string): T {
  const picked = value == null || value === "" ? fallback : String(value);
  if (!allowed.includes(picked as T)) throw new ToolError(message);
  return picked as T;
}

function userImages(raw: ToolInput, variant: VideoVariant): { slotId: string; url: string }[] {
  if (!Array.isArray(raw.images)) throw new ToolError("Upload the required photos");
  const rows = raw.images as { slotId?: string; url?: string }[];
  if (rows.some(row => !row || typeof row !== "object" || typeof row.slotId !== "string")) throw new ToolError("Invalid photo slots");
  if (new Set(rows.map(row => row.slotId)).size !== rows.length) throw new ToolError("Invalid photo slots");
  if (rows.some(row => !variant.inputSlots.some(slot => slot.id === row.slotId))) throw new ToolError("Invalid photo slots");
  const origins = [process.env.R2_PUBLIC_URL, process.env.STORAGE_DOMAIN].filter(Boolean).map(value => new URL(value!).origin);
  const ordered: { slotId: string; url: string }[] = [];
  for (const slot of variant.inputSlots) {
    const matches = rows.filter(row => row.slotId === slot.id);
    if (matches.length > slot.maxCount) throw new ToolError("Invalid photo slots");
    if (slot.required && matches.length !== 1) throw new ToolError("Upload the required photos");
    for (const match of matches) {
      try {
        const url = httpsUrl(match.url);
        if (!origins.includes(new URL(url).origin)) throw new Error("origin");
        ordered.push({ slotId: slot.id, url });
      } catch {
        throw new ToolError("Upload each photo to this site's storage first");
      }
    }
  }
  return ordered;
}

function compilePrompt(variant: VideoVariant, userText: string, identities: { label: string }[], scenes: number, locale: "en" | "zh", duration: number, resolution: string, aspectRatio: string): string {
  if (variant.promptPolicy.mode === "locked" && userText) throw new ToolError("Unsupported workbench input field");
  if (variant.strategy === "text" || variant.strategy === "first-frame") {
    if (!userText) throw new ToolError("Prompt must contain 1–5000 characters");
    return userText;
  }
  const generated = variant.strategy === "image-reference"
    ? duoImagePrompt(locale, duration, aspectRatio)
    : variant.strategy === "video-reference"
      ? duoVideoPrompt(locale, duration, resolution)
      : "";
  const settings = variant.strategy === "video-reference"
    ? `${duration} seconds, ${resolution}`
    : `${duration} seconds, ${aspectRatio}`;
  const fallback = generated || (locale === "zh" ? variant.defaultPrompt?.zh : variant.defaultPrompt?.en)?.trim() || "";
  const visible = userText && userText !== generated
    ? `${userText}\nOutput settings: ${settings}.`
    : (userText || fallback);
  if (!visible) throw new ToolError("Prompt must contain 1–5000 characters");
  const lines = [
    visible,
    variant.promptPolicy.instruction.trim(),
    ...identities.map((item, index) => `Reference image ${index + 1}: ${item.label}. Keep this identity.`),
  ];
  if (variant.strategy === "video-reference") lines.splice(2, 0, "Reference video 1 supplies the performance.");
  for (let index = 0; index < scenes; index++) {
    lines.push(`Reference image ${identities.length + index + 1} is scene and style only. Do not copy a face from it.`);
  }
  return lines.filter(Boolean).join("\n");
}

/**
 * Compile a workbench submission. Client URLs, prompts, strategy and prices are not trusted.
 * `expectedToolId` is the task route the caller already resolved.
 */
export function validateWorkbenchInput(
  raw: ToolInput,
  model: ToolModel,
  expectedToolId: "video-generator" | "reference-video",
  presets = getVideoPresets(),
): ToolInput {
  if (Object.keys(raw).some(key => !CLIENT_FIELDS.has(key))) throw new ToolError("Unsupported workbench input field");
  const preset = findPreset(raw.presetId, presets);
  const variant = findVariant(preset, raw.variantId);
  if (variant.toolId !== expectedToolId || variant.modelId !== model.id) throw new ToolError("Unsupported workbench input field");
  assertVariant(variant, model);
  if (raw.presetVersion !== preset.version || raw.pricingVersion !== variant.pricingVersion) {
    throw new ToolError("This preset has changed. Reload before generating.", 409);
  }
  const needsConsent = variant.inputSlots.length > 0;
  if (needsConsent && raw.consent !== true) throw new ToolError("Confirm permission to use every uploaded photo");
  const resolution = choice(raw.resolution, variant.output.resolutions, variant.output.resolution, "Unsupported resolution");
  const aspectRatio = choice(raw.aspectRatio, variant.output.aspectRatios, variant.output.aspectRatio, "Unsupported aspect ratio");
  const duration = Number(raw.duration ?? variant.output.duration);
  if (!variant.output.durations.includes(duration)) throw new ToolError("Unsupported duration");
  const audio = choice<WorkbenchAudio>(raw.audio, variant.output.audioOptions, variant.output.audio, "Unsupported audio option");
  const userText = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
  if (userText.length > 5000) throw new ToolError("Prompt must contain 1–5000 characters");
  const uploads = variant.inputSlots.length ? userImages(raw, variant) : [];
  if (!variant.inputSlots.length && raw.images != null) throw new ToolError("Unsupported workbench input field");
  const operatorImages = variant.operatorAssets.filter(asset => asset.kind === "image").map(asset => httpsUrl(resolveReferenceMediaUrl(asset.url)));
  const imageUrls = [...uploads.map(item => item.url), ...operatorImages];
  if ((variant.strategy === "image-reference" || variant.strategy === "video-reference") && imageUrls.length > maxImages(model)) {
    throw new ToolError("Too many reference images");
  }
  const locale = raw.locale === "zh" ? "zh" : "en";
  const identities = uploads.map(item => ({ label: variant.inputSlots.find(slot => slot.id === item.slotId)?.label.en || item.slotId }));
  const prompt = compilePrompt(variant, userText, identities, operatorImages.length, locale, duration, resolution, aspectRatio);
  const limit = Number((model.capabilities as { maxPromptLength?: number }).maxPromptLength ?? 5000);
  if (!prompt || prompt.length > limit) throw new ToolError(`Prompt must contain 1–${limit} characters`);
  const exampleId = raw.exampleId == null || raw.exampleId === "" ? undefined : String(raw.exampleId);
  if (exampleId && !variant.examples.some(item => item.id === exampleId)) throw new ToolError("Unknown sample video");
  const motion = variant.operatorAssets.find(asset => asset.kind === "video");
  const credits = quoteVariantRetail(variant, resolution, duration);
  const snapshot: ToolInput = {
    strategy: variant.strategy,
    presetId: preset.id,
    presetVersion: preset.version,
    variantId: variant.id,
    pricingVersion: variant.pricingVersion,
    quotedCredits: credits,
    prompt,
    duration,
    resolution,
    aspectRatio,
    generateAudio: audio === "generated",
    consent: needsConsent ? true : undefined,
    locale,
    ...(exampleId ? { displayExampleId: exampleId } : {}),
  };
  if (variant.strategy === "text") return { ...snapshot, mode: "text" };
  if (variant.strategy === "first-frame") return { ...snapshot, mode: "image", imageUrl: uploads[0].url };
  if (variant.strategy === "image-reference") {
    return { ...snapshot, mode: "image-reference", images: uploads, imageUrls };
  }
  return {
    ...snapshot,
    mode: "reference",
    images: uploads,
    imageUrls,
    referenceVideoUrl: httpsUrl(resolveReferenceMediaUrl(motion!.url)),
  };
}

export function quoteWorkbenchInput(input: ToolInput, presets = getVideoPresets()): number {
  const preset = findPreset(input.presetId, presets);
  const variant = findVariant(preset, input.variantId);
  if (input.pricingVersion !== variant.pricingVersion) throw new ToolError("This preset has changed. Reload before generating.", 409);
  const quoted = quoteVariantRetail(variant, String(input.resolution), Number(input.duration));
  if (input.quotedCredits !== undefined && input.quotedCredits !== quoted) throw new ToolError("Invalid workbench pricing", 503);
  return quoted;
}

/** Seedance multimodal image reference. No video field and no first-frame field. */
export function mapImageReferenceInput(input: ToolInput): Record<string, unknown> {
  return {
    prompt: input.prompt,
    reference_image_urls: input.imageUrls,
    duration: input.duration,
    resolution: input.resolution,
    aspect_ratio: input.aspectRatio,
    generate_audio: input.generateAudio === true,
    return_last_frame: false,
    web_search: false,
  };
}

export function validateImageReferenceInput(raw: ToolInput, model: ToolModel): ToolInput {
  const input = validateWorkbenchInput(raw, model, "video-generator");
  if (input.strategy !== "image-reference") throw new ToolError("Unsupported workbench input field");
  return input;
}

export function validateVideoReferenceVariant(raw: ToolInput, model: ToolModel): ToolInput {
  const input = validateWorkbenchInput(raw, model, "reference-video");
  if (input.strategy !== "video-reference") throw new ToolError("Unsupported workbench input field");
  return input;
}

function publicExamples(variant: VideoVariant): PublicWorkbenchVariant["examples"] {
  return variant.examples.flatMap(item => {
    try {
      const src = item.src.startsWith("/") ? item.src : httpsUrl(resolveReferenceMediaUrl(item.src));
      return [{ id: item.id, src, label: item.label }];
    } catch {
      return [];
    }
  });
}

function publicVariant(variant: VideoVariant, model: ToolModel | undefined, showOperatorPreview: boolean): PublicWorkbenchVariant {
  const credits: Record<string, number> = {};
  let ready = false;
  try {
    if (!model) throw new Error("model");
    assertVariant(variant, model);
    for (const resolution of variant.output.resolutions) {
      for (const duration of variant.output.durations) {
        const amount = variant.strategy === "text" || variant.strategy === "first-frame"
          ? quoteCredits(model, { resolution, duration })
          : quoteVariantRetail(variant, resolution, duration);
        for (const audio of variant.output.audioOptions) credits[workbenchCreditKey(resolution, duration, audio)] = amount;
      }
    }
    ready = true;
  } catch { /* Drafts can be shown and cannot be purchased. */ }
  const operatorPreviews = showOperatorPreview ? variant.operatorAssets.flatMap(asset => {
    try {
      const src = asset.url.startsWith("/") ? asset.url : httpsUrl(resolveReferenceMediaUrl(asset.url));
      return [{ id: asset.id, kind: asset.kind, label: asset.label, src }];
    } catch {
      return [];
    }
  }) : [];
  return {
    id: variant.id,
    title: variant.title,
    description: variant.description,
    strategy: variant.strategy,
    toolId: variant.toolId,
    modelId: variant.modelId,
    pricingVersion: variant.pricingVersion,
    slots: variant.inputSlots.map(({ id, purpose, label, description, required }) => ({ id, purpose, label, description, required })),
    operatorPreviews,
    promptMode: variant.promptPolicy.mode,
    ...(variant.defaultPrompt ? { defaultPrompt: variant.defaultPrompt } : {}),
    output: variant.output,
    credits,
    examples: publicExamples(variant),
    ready,
  };
}

export function publicWorkbench(pageId: string, presets = getVideoPresets(), pages = getWorkbenchPages()): PublicWorkbenchPage | null {
  const page = pages.find(item => item.id === pageId);
  if (!page) return null;
  return {
    id: page.id,
    showPresetPicker: page.showPresetPicker,
    showOperatorPreview: page.showOperatorPreview,
    variantPicker: page.variantPicker ?? "auto",
    defaultPresetId: page.defaultPresetId,
    defaultVariantId: page.defaultVariantId,
    presets: page.presetIds.flatMap(presetId => {
      const preset = presets.find(item => item.id === presetId && item.enabled);
      if (!preset) return [];
      const variants = preset.variants.filter(variant => variant.enabled && (!page.variantIds || page.variantIds.includes(variant.id)));
      const defaultVariantId = variants.some(item => item.id === page.defaultVariantId)
        ? page.defaultVariantId
        : variants.some(item => item.id === preset.defaultVariantId)
          ? preset.defaultVariantId
          : variants[0]?.id ?? preset.defaultVariantId;
      return [{
        id: preset.id,
        version: preset.version,
        title: preset.title,
        description: preset.description,
        defaultVariantId,
        variants: variants.map(variant => publicVariant(variant, modelOf(variant), page.showOperatorPreview)),
      }];
    }),
  };
}

export function workbenchPages(): WorkbenchPageConfig[] {
  return getWorkbenchPages();
}

export type { GenerationStrategy };
