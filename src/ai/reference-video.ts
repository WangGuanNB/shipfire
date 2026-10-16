import { getReferenceVideoPresets } from "@/config/reference-video";
import { httpsUrl, resolveReferenceMediaUrl } from "./media-url";
import { ToolError, type ToolInput, type ToolModel } from "./types";
import type { PublicReferencePreset, ReferenceVideoModel, ReferenceVideoPreset } from "./reference-video-types";
import { validateVideoReferenceVariant } from "./workbench";

export { httpsUrl, resolveReferenceMediaUrl };

export function referencePrompt(preset: ReferenceVideoPreset): string {
  return [preset.prompt.trim(), "Reference video 1 supplies the performance.",
    ...preset.roles.map((role, i) => `Reference image ${i + 1}: ${role.instruction}`)].join("\n");
}

export function quoteReferenceCredits(input: ToolInput, model: ToolModel): number {
  const price = (model as ReferenceVideoModel).pricing;
  const seconds = Number(input.duration);
  const rate = price.perSecond[String(input.resolution)];
  if (!Number.isFinite(seconds) || seconds <= 0 || !Number.isFinite(rate) || rate <= 0 ||
      !Number.isSafeInteger(price.minimum) || price.minimum < 0) throw new ToolError("Invalid reference video pricing", 503);
  const result = Math.max(price.minimum, Math.ceil(seconds * rate));
  if (!Number.isSafeInteger(result) || result <= 0) throw new ToolError("Invalid reference video pricing", 503);
  return result;
}

export function assertReferencePreset(preset: ReferenceVideoPreset, model: ReferenceVideoModel): void {
  const c = model.capabilities;
  try {
    httpsUrl(resolveReferenceMediaUrl(preset.referenceVideo.url));
    for (const example of preset.examples ?? []) resolveReferenceMediaUrl(example.src);
    if (preset.exampleVideoUrl) resolveReferenceMediaUrl(preset.exampleVideoUrl);
    if (!preset.enabled || !model.enabled || preset.modelId !== model.id ||
        !c.modes.includes("reference") || !preset.version || !preset.prompt.trim() ||
        preset.roles.length < 1 || preset.roles.length > c.maxImages ||
        new Set(preset.roles.map(r => r.id)).size !== preset.roles.length ||
        preset.roles.some(r => !/^[a-z0-9-]+$/.test(r.id) || !r.instruction.trim()) ||
        !Number.isInteger(preset.duration) || preset.duration < c.minOutputSeconds || preset.duration > c.maxOutputSeconds ||
        !c.aspectRatios.includes(preset.aspectRatio) || !preset.resolutions.length ||
        preset.resolutions.some(r => !c.resolutions.includes(r)) ||
        !["off", "generated"].includes(preset.audio) || referencePrompt(preset).length > c.maxPromptLength) throw new Error();
    for (const resolution of preset.resolutions) quoteReferenceCredits({ duration: preset.duration, resolution }, model);
  } catch { throw new ToolError("This reference preset is not configured or approved yet", 503); }
}

/** Do not trust client video URLs, prompt, role order, duration, audio or credit amounts. */
export function validateReferenceInput(raw: ToolInput, model: ToolModel, presets = getReferenceVideoPresets()): ToolInput {
  if (typeof raw.variantId === "string") return validateVideoReferenceVariant(raw, model);
  const allowed = new Set(["presetId", "presetVersion", "images", "resolution", "consent", "locale", "exampleId"]);
  if (Object.keys(raw).some(key => !allowed.has(key))) throw new ToolError("Unsupported reference input field");
  const preset = presets.find(p => p.id === raw.presetId && p.enabled && p.modelId === model.id);
  if (!preset) throw new ToolError("Reference preset not found", 404);
  assertReferencePreset(preset, model as ReferenceVideoModel);
  if (raw.presetVersion !== preset.version) throw new ToolError("This preset has changed. Reload before generating.", 409);
  if (raw.consent !== true) throw new ToolError("Confirm permission to use every uploaded photo");
  const resolution = String(raw.resolution ?? preset.resolutions[0]);
  if (!preset.resolutions.includes(resolution)) throw new ToolError("Unsupported resolution");
  if (!Array.isArray(raw.images) || raw.images.length !== preset.roles.length) throw new ToolError("Upload one image for every role");
  const origins = [process.env.R2_PUBLIC_URL, process.env.STORAGE_DOMAIN].filter(Boolean).map(v => new URL(v!).origin);
  const images = raw.images as { roleId: string; url: string }[];
  if (images.some(image => !image || typeof image !== "object") || new Set(images.map(i => i.roleId)).size !== images.length) throw new ToolError("Invalid character roles");
  const ordered = preset.roles.map(role => {
    const image = images.find(i => i.roleId === role.id);
    if (!image) throw new ToolError("Invalid character roles");
    try {
      const url = httpsUrl(image.url);
      if (!origins.includes(new URL(url).origin)) throw new Error();
      return { roleId: role.id, url };
    } catch { throw new ToolError("Upload each reference image to this site's storage first"); }
  });
  const exampleId = raw.exampleId == null || raw.exampleId === "" ? undefined : String(raw.exampleId);
  const chosen = exampleId ? preset.examples?.find(item => item.id === exampleId) : undefined;
  if (exampleId && !chosen) throw new ToolError("Unknown sample video");
  // The task row snapshots these values, so later preset edits cannot alter an in-flight job.
  // Example ids only select a preview. The operator clip is the generation input.
  return {
    mode: "reference", presetId: preset.id, presetVersion: preset.version,
    images: ordered, imageUrls: ordered.map(i => i.url), prompt: referencePrompt(preset),
    referenceVideoUrl: httpsUrl(resolveReferenceMediaUrl(preset.referenceVideo.url)),
    ...(chosen ? { displayExampleId: chosen.id } : {}),
    duration: preset.duration, resolution, aspectRatio: preset.aspectRatio,
    generateAudio: preset.audio === "generated", consent: true, locale: raw.locale === "zh" ? "zh" : "en",
  };
}

function publicExamples(preset: ReferenceVideoPreset): PublicReferencePreset["examples"] {
  const source = preset.examples?.length
    ? preset.examples
    : preset.exampleVideoUrl
      ? [{ id: "demo", src: preset.exampleVideoUrl, label: { en: "Example", zh: "示例" } }]
      : [];
  return source.flatMap((item) => {
    try {
      const src = item.src.startsWith("/") ? item.src : httpsUrl(resolveReferenceMediaUrl(item.src));
      return [{ id: item.id, src, label: item.label }];
    } catch {
      return [];
    }
  });
}

/** Whitelist public fields: never ship reference inputs or internal prompt with the form. */
export function publicReferencePresets(models: ToolModel[], presets = getReferenceVideoPresets()): PublicReferencePreset[] {
  return presets.filter(p => p.enabled).map(preset => {
    const model = models.find(m => m.enabled && m.id === preset.modelId) as ReferenceVideoModel | undefined;
    let ready = false;
    const credits: Record<string, number> = {};
    try {
      if (!model) throw new Error();
      assertReferencePreset(preset, model);
      for (const resolution of preset.resolutions) credits[resolution] = quoteReferenceCredits({ resolution, duration: preset.duration }, model);
      ready = true;
    } catch { /* A draft is visible but cannot be purchased. */ }
    return {
      id: preset.id, version: preset.version, title: preset.title, description: preset.description,
      modelId: preset.modelId, roles: preset.roles.map(({ id, label, description }) => ({ id, label, description })),
      examples: publicExamples(preset),
      duration: preset.duration, aspectRatio: preset.aspectRatio, resolutions: preset.resolutions,
      audio: preset.audio, credits, ready,
    };
  });
}

/** KIE multimodal reference mode, NOT first-frame/image-to-video mode. */
export function mapReferenceVideoInput(input: ToolInput): Record<string, unknown> {
  return {
    prompt: input.prompt, reference_image_urls: input.imageUrls,
    reference_video_urls: [input.referenceVideoUrl], duration: input.duration,
    resolution: input.resolution, aspect_ratio: input.aspectRatio,
    generate_audio: input.generateAudio === true, return_last_frame: false, web_search: false,
  };
}
