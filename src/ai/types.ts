/** Shared contracts: the task engine does not know about images, video or vendors. */
export type TaskStatus = "queued" | "submitting" | "running" | "succeeded" | "failed" | "needs_review";
export type ToolInput = Record<string, unknown>;
export interface Artifact { kind: string; url?: string; text?: string; mimeType?: string; key?: string }
export interface ToolModel {
  id: string;
  label: string;
  adapter: string;
  providerModel?: string;
  /** Mode-specific KIE model IDs (e.g. Wan T2V vs I2V). Falls back to providerModel. */
  providerModels?: { text?: string; image?: string };
  enabled: boolean;
  capabilities: Record<string, unknown>;
  pricing: Record<string, unknown>;
  requiredEntitlements?: string[];
  /** UI metadata — optional, used by video tool model picker. */
  description?: string;
  tags?: string[];
  tier?: "free" | "pro";
  default?: boolean;
}
/** Shared image/video form contract. Other tools can define entirely different capabilities. */
export interface MediaModel extends ToolModel {
  capabilities: { modes: string[]; resolutions: string[]; durations?: number[]; aspectRatios: string[]; maxPromptLength: number };
  pricing: { fixed?: number; perSecond?: Record<string, number>; minimum?: number };
}
export interface ToolDefinition { id: string; label: string; enabled: boolean; models: ToolModel[] }
export type AdapterResult =
  | { status: "running"; providerTaskId: string }
  | { status: "succeeded"; artifacts: Artifact[] }
  | { status: "failed"; error: string };
export interface ToolAdapter {
  checkConfiguration(): void;
  validate(input: ToolInput, model: ToolModel): ToolInput;
  quote(input: ToolInput, model: ToolModel): number;
  submit(input: ToolInput, model: ToolModel, taskId: string, userId: string): Promise<AdapterResult>;
  poll?(providerTaskId: string, input: ToolInput, model: ToolModel, taskId: string, userId: string): Promise<AdapterResult>;
}
export interface PublicTask { id: string; toolId: string; modelId: string; status: TaskStatus; credits: number; artifacts: Artifact[]; error?: string; createdAt: number }
export class ToolError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
/** Only use when the provider has definitively rejected/failed a submission. */
export class SubmissionRejected extends Error {}
