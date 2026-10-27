import type { LocalizedCopy } from "@/ai/reference-video-types";
import type { VideoVariant, WorkbenchExample, WorkbenchSlot } from "@/ai/workbench-types";
import { referenceVideoModelId } from "@/config/reference-video";
import { duoIdentitySlots } from "./slots";
import { VIDEO_RETAIL } from "./pricing";

export interface VideoTemplateVariantOptions {
  id: string;
  title: LocalizedCopy;
  description: LocalizedCopy;
  motionUrl: string;
  durationSeconds: number;
  examples: WorkbenchExample[];
  pricingVersion: string;
  outputDuration?: number;
  outputDurations?: number[];
  modelId?: string;
  inputSlots?: WorkbenchSlot[];
  prompt?: LocalizedCopy;
  instruction?: string;
  promptMode?: VideoVariant["promptPolicy"]["mode"];
  output?: Partial<VideoVariant["output"]>;
  retailPricing?: VideoVariant["retailPricing"];
}

/** New reference tools configure roles, model, prompt, output and prices independently. */
export function createVideoTemplateVariant(options: VideoTemplateVariantOptions): VideoVariant {
  const duration = options.output?.duration ?? options.outputDuration ?? options.durationSeconds;
  const resolution = options.output?.resolution ?? "720p";
  const audio = options.output?.audio ?? "template";
  return {
    id: options.id, enabled: true, title: options.title, description: options.description,
    strategy: "video-reference", toolId: "reference-video", modelId: options.modelId ?? referenceVideoModelId(),
    inputSlots: options.inputSlots ?? duoIdentitySlots(),
    operatorAssets: [{ id: "motion", kind: "video", purpose: "motion", url: options.motionUrl, durationSeconds: options.durationSeconds, label: options.title }],
    promptPolicy: { mode: options.promptMode ?? "locked", source: "preset", showInstruction: false,
      instruction: options.instruction ?? "Follow the reference performance and camera timing. Keep every uploaded identity in its assigned role. Do not add captions or logos." },
    defaultPrompt: options.prompt ?? { en: "Cast the uploaded people in their assigned roles in the reference video. Preserve each person's identity and outfit.", zh: "将上传人物按指定角色放入参考视频，保留各自的身份和服装。" },
    output: { duration, durations: options.output?.durations ?? options.outputDurations ?? [duration], resolution,
      resolutions: options.output?.resolutions ?? [resolution], aspectRatio: "9:16", aspectRatios: ["9:16"],
      ...options.output, audio, audioOptions: options.output?.audioOptions ?? [audio] },
    retailPricing: options.retailPricing ?? VIDEO_RETAIL, pricingVersion: options.pricingVersion, examples: options.examples,
  };
}
