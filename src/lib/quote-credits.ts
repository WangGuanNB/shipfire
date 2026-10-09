import type { ToolInput, ToolModel, MediaModel } from "@/ai/types";

/** Shared client/server credit estimate — keep in sync with billing. */
export function quoteCredits(model: ToolModel, input: ToolInput): number {
  const price = (model as MediaModel).pricing;
  const resolution = String(input.resolution ?? "");
  const duration = Number(input.duration ?? 0);
  const cost =
    price.fixed ??
    Math.max(price.minimum ?? 0, (price.perSecond?.[resolution] ?? NaN) * duration);
  if (!Number.isSafeInteger(cost) || cost < 0) {
    throw new Error("Invalid pricing configuration");
  }
  return cost;
}

/** Precompute all resolution × duration estimates for a media model. */
export function estimateVideoCredits(model: MediaModel): Record<string, number> {
  const estimates: Record<string, number> = {};
  for (const resolution of model.capabilities.resolutions) {
    for (const duration of model.capabilities.durations ?? []) {
      estimates[`${resolution}_${duration}s`] = quoteCredits(model, { resolution, duration });
    }
  }
  return estimates;
}
