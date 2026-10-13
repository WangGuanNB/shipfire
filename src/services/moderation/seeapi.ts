import type { ModerationConfig } from "@/config/moderation";

export type SeeApiInference = {
  id: string;
  status: string;
  result?: { type?: string; data?: { flagged?: boolean } } | null;
  error?: { code?: string; message?: string } | null;
};

const TERMINAL = new Set(["succeeded", "failed", "canceled", "refunded", "expired"]);

async function seeApiFetch(
  cfg: ModerationConfig,
  path: string,
  init: RequestInit & { idempotencyKey?: string },
): Promise<SeeApiInference> {
  if (!cfg.apiKey) throw new Error("SEEAPI_API_KEY is not configured");
  const headers: Record<string, string> = {
    Authorization: `Bearer ${cfg.apiKey}`,
    ...(init.headers as Record<string, string>),
  };
  if (init.idempotencyKey) headers["Idempotency-Key"] = init.idempotencyKey;
  const { idempotencyKey: _, ...rest } = init;
  const response = await fetch(`${cfg.apiBaseUrl}${path}`, {
    ...rest,
    headers,
    signal: AbortSignal.timeout(cfg.requestTimeoutMs),
  });
  const body = (await response.json().catch(() => ({}))) as SeeApiInference & { message?: string };
  if (!response.ok) {
    throw new Error(body.error?.message || body.message || `SeeAPI HTTP ${response.status}`);
  }
  return body;
}

export async function runSeeApiInference(
  cfg: ModerationConfig,
  payload: Record<string, unknown>,
  idempotencyKey: string,
): Promise<SeeApiInference> {
  let task = await seeApiFetch(cfg, "/v1/inferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    idempotencyKey,
  });
  if (TERMINAL.has(task.status)) return task;

  const deadline = Date.now() + cfg.pollTimeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 400));
    task = await seeApiFetch(cfg, `/v1/inferences/${encodeURIComponent(task.id)}`, { method: "GET" });
    if (TERMINAL.has(task.status)) return task;
  }
  throw new Error("SeeAPI inference timed out");
}

export function isInferenceFlagged(task: SeeApiInference): boolean {
  if (task.status === "failed" || task.error) throw new Error(task.error?.message || "SeeAPI inference failed");
  return task.result?.data?.flagged === true;
}
