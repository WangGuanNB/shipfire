import { getToolCatalog } from "@/config/ai";
import { quoteCredits as computeQuoteCredits } from "@/lib/quote-credits";
import { ToolError, type ToolInput, type ToolModel, type MediaModel } from "./types";

export function resolveTool(toolId: string, modelId: string) {
  const tool = getToolCatalog().find(t => t.id === toolId && t.enabled);
  const model = tool?.models.find(m => m.id === modelId && m.enabled);
  if (!tool || !model) throw new ToolError("Tool or model is unavailable", 404);
  return { tool, model };
}

export function validateInput(input: ToolInput, model: ToolModel): ToolInput {
  const c = (model as MediaModel).capabilities;
  const mode = String(input.mode ?? "text");
  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  const resolution = String(input.resolution ?? c.resolutions[0]);
  const aspectRatio = String(input.aspectRatio ?? c.aspectRatios[0]);
  const duration = c.durations ? Number(input.duration ?? c.durations[0]) : undefined;
  if (!c.modes.includes(mode) || !c.resolutions.includes(resolution) || !c.aspectRatios.includes(aspectRatio)) throw new ToolError("Unsupported generation parameters");
  if (!prompt || prompt.length > c.maxPromptLength) throw new ToolError(`Prompt must contain 1–${c.maxPromptLength} characters`);
  if (c.durations && !c.durations.includes(duration!)) throw new ToolError("Unsupported duration");
  let imageUrl: string | undefined;
  if (mode === "image") {
    try {
      const url = new URL(String(input.imageUrl));
      const origins = [process.env.R2_PUBLIC_URL, process.env.STORAGE_DOMAIN].filter(Boolean).map(v => new URL(v!).origin);
      if (url.protocol !== "https:" || !origins.includes(url.origin) || url.username || url.password) throw new Error();
      imageUrl = url.href;
    } catch { throw new ToolError("Upload a reference image to this site's storage first"); }
  }
  return { mode, prompt, resolution, aspectRatio, ...(duration === undefined ? {} : { duration }), ...(imageUrl ? { imageUrl } : {}), outputFormat: input.outputFormat === "jpg" ? "jpg" : "png", locale: input.locale === "zh" ? "zh" : "en" };
}

export function quoteCredits(model: ToolModel, input: ToolInput): number {
  try {
    return computeQuoteCredits(model, input);
  } catch {
    throw new ToolError("Invalid pricing configuration", 503);
  }
}
