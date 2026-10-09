import { newStorage } from "@/lib/storage";
import { SubmissionRejected, ToolError, type ToolAdapter, type ToolInput, type ToolModel } from "../types";
import { validateInput, quoteCredits } from "../catalog";
import { mapKieInput, type KieVideoMapper } from "./kie-mappers";

async function request(path: string, body?: unknown) {
  const response = await fetch(`https://api.kie.ai${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${process.env.KIE_API_KEY}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    if (body && [400, 401, 403, 422, 429].includes(response.status)) {
      throw new SubmissionRejected("Video provider rejected the request");
    }
    throw new Error(`Video provider HTTP ${response.status}`);
  }
  return response.json();
}

function resolveKieModel(model: ToolModel, input: ToolInput): string {
  const mode = String(input.mode ?? "text");
  const providerModels = model.providerModels as Record<string, string> | undefined;
  if (providerModels) {
    const named = mode === "image" ? providerModels.image : providerModels.text;
    if (named) return named;
  }
  if (!model.providerModel) throw new ToolError("Video model is missing a provider ID", 503);
  return model.providerModel;
}

async function pollTask(providerTaskId: string, _input: ToolInput, _model: ToolModel, taskId: string, userId: string) {
  const data = await request(`/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(providerTaskId)}`);
  if (data.code !== 200) throw new Error("Video status is temporarily unavailable");
  if (data.data?.state === "fail") {
    return { status: "failed" as const, error: "The provider could not generate this video. Credits have been released." };
  }
  if (data.data?.state !== "success") return { status: "running" as const, providerTaskId };
  const url = JSON.parse(data.data.resultJson || "{}").resultUrls?.[0];
  if (!url || new URL(url).protocol !== "https:") throw new Error("Invalid provider result");
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok || !response.body) throw new Error("Video download failed");
  const max = 64 * 1024 * 1024;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      throw new Error("Video exceeds storage transfer limit");
    }
    chunks.push(value);
  }
  const key = `ai/${userId}/${taskId}/output.mp4`;
  const upload = await newStorage().uploadFile({ key, body: Buffer.concat(chunks), contentType: "video/mp4" });
  return { status: "succeeded" as const, artifacts: [{ kind: "video", mimeType: "video/mp4", key, url: upload.url }] };
}

export function createKieVideoAdapter(mapper: KieVideoMapper): ToolAdapter {
  return {
    validate: validateInput,
    quote: (input, model) => quoteCredits(model, input),
    checkConfiguration() {
      if (!process.env.KIE_API_KEY) throw new ToolError("Video provider is not configured", 503);
    },
    async submit(input, model) {
      const kieModel = resolveKieModel(model, input);
      const data = await request("/api/v1/jobs/createTask", {
        model: kieModel,
        input: mapKieInput(mapper, input),
      });
      if (data.code !== 200) throw new SubmissionRejected("Video provider rejected the request");
      if (!data.data?.taskId) throw new Error("Missing provider task ID");
      return { status: "running", providerTaskId: data.data.taskId };
    },
    poll: pollTask,
  };
}

export const kieSeedanceAdapter = createKieVideoAdapter("seedance");
export const kieSeedance2Adapter = createKieVideoAdapter("seedance2");
export const kieWanAdapter = createKieVideoAdapter("wan");
/** @deprecated Use kieSeedanceAdapter — kept for existing imports/tests. */
export const kieVideoAdapter = kieSeedanceAdapter;
