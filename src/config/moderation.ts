export type ModerationMode = "off" | "shadow" | "enforce";
export type ModerationOnError = "allow" | "block";

export interface ModerationConfig {
  mode: ModerationMode;
  onError: ModerationOnError;
  apiKey?: string;
  apiBaseUrl: string;
  textThreshold: number;
  textCategories: string[];
  imageThresholdOffset: number;
  imageStrictSpecialCare: boolean;
  requestTimeoutMs: number;
  pollTimeoutMs: number;
}

const DEFAULT_TEXT_CATEGORIES = [
  "sexual_explicit",
  "sexual_suggestive",
  "sexual_minors",
  "violence",
  "hate",
  "harassment",
  "self_harm",
];

function parseMode(raw: string | undefined): ModerationMode {
  const v = (raw ?? "off").trim().toLowerCase();
  if (v === "shadow" || v === "enforce") return v;
  return "off";
}

function parseOnError(raw: string | undefined): ModerationOnError {
  return (raw ?? "allow").trim().toLowerCase() === "block" ? "block" : "allow";
}

/** SeeAPI content moderation. Default mode `off` — no effect on generation. */
export function getModerationConfig(): ModerationConfig {
  const categories = (process.env.MODERATION_TEXT_CATEGORIES ?? DEFAULT_TEXT_CATEGORIES.join(","))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const threshold = Number(process.env.MODERATION_TEXT_THRESHOLD ?? "0.3");
  return {
    mode: parseMode(process.env.CONTENT_MODERATION_MODE),
    onError: parseOnError(process.env.CONTENT_MODERATION_ON_ERROR),
    apiKey: process.env.SEEAPI_API_KEY?.trim() || undefined,
    apiBaseUrl: (process.env.SEEAPI_API_BASE_URL ?? "https://api.seeapi.com").replace(/\/$/, ""),
    textThreshold: Number.isFinite(threshold) ? threshold : 0.3,
    textCategories: categories.length ? categories : DEFAULT_TEXT_CATEGORIES,
    imageThresholdOffset: Number(process.env.MODERATION_IMAGE_THRESHOLD_OFFSET ?? "0.02"),
    imageStrictSpecialCare: (process.env.MODERATION_IMAGE_STRICT_SPECIAL_CARE ?? "true") !== "false",
    requestTimeoutMs: Number(process.env.MODERATION_REQUEST_TIMEOUT_MS ?? "8000"),
    pollTimeoutMs: Number(process.env.MODERATION_POLL_TIMEOUT_MS ?? "12000"),
  };
}

export const CONTENT_POLICY_MESSAGE =
  "This prompt or image doesn't meet our content policy. Please revise and try again.";
