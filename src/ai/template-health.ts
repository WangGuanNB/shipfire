import { attachTemplateAudio, inspectTemplateVideo, verifyTemplateForPreflight } from "./template-audio";
import { resolveReferenceMediaUrl } from "./media-url";
import { newStorage } from "@/lib/storage";
import { loadTemplateVideo } from "./template-source";
import { memeDuoVideoPreset } from "@/config/sites/meme-duo-video/preset";

/** Uses only the operator-owned template. No KIE requests, tasks, users or credits. */
export async function checkTemplateHealth(checkStorage = false, preset = memeDuoVideoPreset()) {
  const checks: { templateId: string; stage: string; ok: boolean; detail?: unknown; error?: string }[] = [];
  const variants = preset.enabled ? preset.variants.filter(item => item.enabled && item.strategy === "video-reference") : [];
  if (!variants.length) checks.push({ templateId: preset.id, stage: "configuration", ok: false, error: "No enabled reference template is configured" });
  for (const variant of variants) {
    const template = variant.operatorAssets.find(item => item.kind === "video" && item.purpose === "motion");
    const requiresAudio = variant.output.audio === "template";
    async function step<T>(stage: string, run: () => Promise<T>): Promise<T> {
      try { const value = await run(); checks.push({ templateId: variant.id, stage, ok: true }); return value; }
      catch (error) {
        checks.push({ templateId: variant.id, stage, ok: false, error: error instanceof Error ? error.message.replace(/https?:\/\/\S+/g, "[URL]").slice(0, 500) : "Unknown error" });
        throw error;
      }
    }
    try {
      const loaded = await step("template-fetch", async () => {
        if (!template || !Number.isFinite(template.durationSeconds) || template.durationSeconds! <= 0) throw new Error("Template source/duration is not configured");
        return loadTemplateVideo(resolveReferenceMediaUrl(template.url));
      });
      checks[checks.length - 1].detail = { source: loaded.source, bytes: loaded.bytes.length };
      const bytes = loaded.bytes;
      const info = await step("template-verify", () => verifyTemplateForPreflight(bytes, template!.durationSeconds, requiresAudio));
      checks[checks.length - 1].detail = info;
      const output = requiresAudio ? await step("audio-remux", () => attachTemplateAudio(bytes, bytes)) : bytes;
      const outputInfo = await step("result-verify", () => inspectTemplateVideo(output, template!.durationSeconds, requiresAudio));
      checks[checks.length - 1].detail = { ...outputInfo, bytes: output.length };
      if (checkStorage) {
        const storage = newStorage();
        const key = `ai/diagnostics/${crypto.randomUUID()}/output.mp4`;
        try {
          const uploaded = await step("storage-write", () => storage.uploadFile({ key, body: output, contentType: "video/mp4" }));
          await step("storage-read", async () => {
            const response = await fetch(uploaded.url, { signal: AbortSignal.timeout(15000), headers: { Range: "bytes=0-31" } });
            if (!response.ok) throw new Error(`Stored video HTTP ${response.status}`);
            const reader = response.body?.getReader();
            try {
              const prefix = new Uint8Array(32); let filled = 0;
              while (filled < prefix.length) {
                const chunk = await reader?.read();
                if (!chunk?.value?.length) throw new Error("Stored video is empty or truncated");
                const take = Math.min(chunk.value.length, prefix.length - filled);
                prefix.set(chunk.value.subarray(0, take), filled); filled += take;
              }
              if (prefix.some((value, index) => value !== output[index])) throw new Error("Stored video does not match the uploaded MP4");
            } finally { await reader?.cancel(); }
          });
        } finally { await step("storage-cleanup", () => storage.deleteFile(key)); }
      }
    } catch { /* Report the failed stage without exposing credentials or sending a model request. */ }
  }
  return { ok: variants.length > 0 && checks.every(check => check.ok), paidGeneration: false, storageChecked: checkStorage,
    templateCount: variants.length, modelId: variants[0]?.modelId, checks };
}
