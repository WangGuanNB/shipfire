import { canUseAiDiagnostics } from "@/lib/ai-diagnostics-access";
import { buildGenerationPreview } from "./preview";
import { resolveTool } from "./catalog";
import { adapters } from "./adapters";
import { ToolError, type ToolInput } from "./types";

/** Deliberately has no task/credit service calls and never calls adapter.submit/poll. */
export async function handleAiDiagnostics(req: Request, actor?: { email?: string | null }) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
  // actor is supplied by the session route, NEVER from the request body.
  if (!canUseAiDiagnostics(actor?.email)) return reply({ error: "Forbidden" }, 403);
  if (req.headers.get("X-AI-Diagnostics") !== "1" || !req.headers.get("Content-Type")?.startsWith("application/json")) {
    return reply({ error: "Invalid diagnostic request" }, 400);
  }
  try {
    const text = await req.text();
    if (text.length > 64 * 1024) throw new ToolError("Diagnostic request is too large", 413);
    let body;
    try { body = JSON.parse(text); } catch { throw new ToolError("Invalid JSON"); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ToolError("Invalid diagnostic request");
    const safety = { diagnostic: true, providerCalled: false, charged: false, taskCreated: false };
    if (body.action !== "request" || !body.input || typeof body.input !== "object" || Array.isArray(body.input)) {
      throw new ToolError("Invalid diagnostic action or input");
    }
    const preview = buildGenerationPreview(String(body.toolId), String(body.modelId), body.input as ToolInput);
    const { model } = resolveTool(String(body.toolId), String(body.modelId));
    const adapter = adapters[model.adapter];
    const input = adapter.validate(body.input as ToolInput, model);
    const urls = preview.request.reference_image_urls;
    if (!Array.isArray(urls) || urls.length > 12 || urls.some(url => typeof url !== "string")) throw new ToolError("Unsupported diagnostic image inputs");
    const checks: { stage: string; ok: boolean; detail?: unknown; error?: string }[] = [{ stage: "parameters", ok: true }];
    try {
      adapter.checkConfiguration(); // Environment validation only; never submit/poll.
      checks.push({ stage: "provider-configuration", ok: true });
    } catch (error) { checks.push({ stage: "provider-configuration", ok: false, error: safeMessage(error) }); }
    checks.push(...await Promise.all([...new Set(urls as string[])].map(async (url, index) => {
      try {
        const bytes = await checkImageReadable(url);
        return { stage: `image-${index + 1}`, ok: true, detail: { bytes } };
      } catch (error) {
        return { stage: `image-${index + 1}`, ok: false, error: safeMessage(error) };
      }
    })));
    // Reuse the exact read-only preflight used before a real task reserves credits.
    if (input.strategy === "video-reference") {
      try {
        if (!adapter.preflight) throw new ToolError("Template preflight is unavailable", 503);
        await adapter.preflight(input, model);
        checks.push({ stage: "template-preflight", ok: true });
      } catch (error) { checks.push({ stage: "template-preflight", ok: false, error: safeMessage(error) }); }
    }
    return reply({ ...preview, ...safety, ok: checks.every(check => check.ok), checks,
      providerConfigured: !!process.env.KIE_API_KEY,
      note: "Pre-generation checks only: parameters, provider configuration, images and any required template preflight. No Kie call, moderation, task, credit reservation, output processing or storage write. This does not guarantee generation success." });
  } catch (error) {
    return reply({ error: safeMessage(error), diagnostic: true, providerCalled: false, charged: false, taskCreated: false }, error instanceof ToolError ? error.status : 500);
  }
}

function safeMessage(error: unknown) {
  return (error instanceof Error ? error.message : "Diagnostic failed").replace(/https?:\/\/\S+/g, "[URL]").slice(0, 400);
}

/** URLs have already passed the real submission compiler's origin/asset validation. */
async function checkImageReadable(url: string) {
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(10000), cache: "no-store" });
  const reader = response.body?.getReader();
  try {
    if (!response.ok || !reader) throw new Error(`Image HTTP ${response.status}`);
    if (!/^image\/(png|jpeg|webp)(?:;|$)/i.test(response.headers.get("content-type") || "")) throw new Error("Expected a PNG, JPEG or WebP image response");
    let size = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 10 * 1024 * 1024) throw new Error("Image exceeds 10MB");
    }
    if (!size) throw new Error("Image is empty");
    return size;
  } finally { await reader?.cancel(); }
}
