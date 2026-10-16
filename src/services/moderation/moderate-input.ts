import { createHash } from "node:crypto";
import { CONTENT_POLICY_MESSAGE, getModerationConfig } from "@/config/moderation";
import { ToolError, type ToolInput } from "@/ai/types";
import { isInferenceFlagged, runSeeApiInference } from "./seeapi";

const GENERATION_TOOLS = new Set(["image-generator", "video-generator", "reference-video"]);

function idempotencyKey(kind: string, value: string): string {
  return createHash("sha256").update(`mod:${kind}:${value}`).digest("hex").slice(0, 32);
}

async function moderateText(prompt: string): Promise<boolean> {
  const cfg = getModerationConfig();
  const task = await runSeeApiInference(
    cfg,
    {
      model: "text-nsfw-filter",
      endpoint: "text-moderation",
      provider: "seeapi",
      input: {
        text: prompt,
        threshold: cfg.textThreshold,
        categories: cfg.textCategories,
      },
    },
    idempotencyKey("text", prompt),
  );
  return isInferenceFlagged(task);
}

async function moderateImage(imageUrl: string): Promise<boolean> {
  const cfg = getModerationConfig();
  const task = await runSeeApiInference(
    cfg,
    {
      model: "nsfw-filter",
      endpoint: "image-moderation",
      provider: "seeapi",
      input: {
        image_url: imageUrl,
        threshold_offset: cfg.imageThresholdOffset,
        strict_special_care: cfg.imageStrictSpecialCare,
      },
    },
    idempotencyKey("image", imageUrl),
  );
  return isInferenceFlagged(task);
}

/**
 * Pre-generation content check via SeeAPI. Default mode `off` is a no-op.
 * `shadow`: log flagged inputs, still allow generation.
 * `enforce`: block flagged inputs before credits are reserved.
 */
export async function moderateGenerationInput(toolId: string, input: ToolInput): Promise<void> {
  const cfg = getModerationConfig();
  if (cfg.mode === "off" || !GENERATION_TOOLS.has(toolId)) return;
  const presetGeneration = toolId === "reference-video" || input.strategy === "image-reference" || input.strategy === "video-reference";
  if (!cfg.apiKey) {
    if (presetGeneration && cfg.mode === "enforce") throw new ToolError("Content review is not configured", 503);
    console.warn("[moderation] CONTENT_MODERATION_MODE is active but SEEAPI_API_KEY is missing; skipping");
    return;
  }

  const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
  const imageUrls = [...new Set([
    ...(typeof input.imageUrl === "string" ? [input.imageUrl] : []),
    ...(Array.isArray(input.imageUrls) ? input.imageUrls.filter((url): url is string => typeof url === "string") : []),
  ])];
  const jobs: { kind: "text" | "image"; run: () => Promise<boolean> }[] = [];
  if (prompt) jobs.push({ kind: "text", run: () => moderateText(prompt) });
  for (const imageUrl of imageUrls) jobs.push({ kind: "image", run: () => moderateImage(imageUrl) });
  if (!jobs.length) return;

  try {
    const results = await Promise.all(jobs.map(async (j) => ({ kind: j.kind, flagged: await j.run() })));
    const flagged = results.filter((r) => r.flagged);
    if (!flagged.length) return;

    if (cfg.mode === "shadow") {
      console.info("[moderation:shadow] flagged input", { toolId, kinds: flagged.map((f) => f.kind) });
      return;
    }
    throw new ToolError(CONTENT_POLICY_MESSAGE, 400);
  } catch (error) {
    if (error instanceof ToolError) throw error;
    console.error("[moderation] SeeAPI error", error instanceof Error ? error.message : error);
    if (cfg.onError === "allow") return;
    throw new ToolError("Content review is temporarily unavailable. Please try again in a moment.", 503);
  }
}
