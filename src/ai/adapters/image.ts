import { ProviderRouter } from "@/aisdk/provider-router";
import { createProvider } from "@/aisdk/provider-adapters";
import type { ImageConfig } from "@/aisdk/image-provider";
import { newStorage } from "@/lib/storage";
import { ToolError, type ToolAdapter } from "../types";
import { validateInput, quoteCredits } from "../catalog";

function provider(name: string) {
  const definitions: Record<string, [string | undefined, string]> = {
    kie: [process.env.KIE_API_KEY, process.env.KIE_MODEL || "nano-banana-pro"],
    fal: [process.env.FAL_KEY, process.env.FAL_MODEL || "fal-ai/nano-banana-2"],
    replicate: [process.env.REPLICATE_API_TOKEN, process.env.REPLICATE_MODEL || "google/nano-banana"],
  };
  const config = definitions[name];
  if (!config?.[0]) throw new ToolError("Image provider is not configured", 503);
  return createProvider(name as "kie" | "fal" | "replicate", config[0], config[1]);
}
export const imageAdapter: ToolAdapter = {
  validate: validateInput,
  quote: (input, model) => quoteCredits(model, input),
  checkConfiguration() { provider(process.env.PRIMARY_PROVIDER || "replicate"); },
  async submit(input, _model, taskId, userId) {
    const primary = provider(process.env.PRIMARY_PROVIDER || "replicate");
    const fallback = provider(process.env.FALLBACK_PROVIDER || process.env.PRIMARY_PROVIDER || "replicate");
    const router = new ProviderRouter({ primary, fallback, timeout: 180000 });
    const result = await router.generateWithFallback(String(input.prompt), {
      aspect_ratio: (input.aspectRatio === "auto" ? "16:9" : input.aspectRatio) as ImageConfig["aspect_ratio"],
      resolution: input.resolution as ImageConfig["resolution"], output_format: input.outputFormat as "png" | "jpg",
    }, String(input.locale));
    if (!result.images?.[0]?.imageBytes) return { status: "failed", error: "No image was returned" };
    const mimeType = input.outputFormat === "jpg" ? "image/jpeg" : "image/png";
    const key = `ai/${userId}/${taskId}/output.${input.outputFormat}`;
    const upload = await newStorage().uploadFile({ key, body: Buffer.from(result.images[0].imageBytes, "base64"), contentType: mimeType });
    return { status: "succeeded", artifacts: [{ kind: "image", mimeType, key, url: upload.url }] };
  },
};
