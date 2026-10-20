import { duoVideoPrompt } from "@/ai/duo-video-prompt";
import type { LocalizedCopy } from "@/ai/reference-video-types";
import type { VideoVariant, WorkbenchExample } from "@/ai/workbench-types";
import { duoIdentitySlots } from "./slots";
import { VIDEO_RETAIL } from "./pricing";

const VIDEO_REFERENCE_INSTRUCTION =
  "Use the reference video for scene, camera and performance timing. Cast the people from the reference images in the assigned roles. Preserve their identity through turns. Keep the two characters separate. Do not add people, captions or logos.";

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
}

/** One meme motion template = one video-reference variant (scenario A). */
export function createVideoTemplateVariant(options: VideoTemplateVariantOptions): VideoVariant {
  const duration = options.outputDuration ?? options.durationSeconds;
  const durations = options.outputDurations ?? [duration, 5, 8].filter((value, index, list) => list.indexOf(value) === index);
  return {
    id: options.id,
    enabled: true,
    title: options.title,
    description: options.description,
    strategy: "video-reference",
    toolId: "reference-video",
    modelId: "seedance-2-reference",
    inputSlots: duoIdentitySlots(),
    operatorAssets: [{
      id: "motion",
      kind: "video",
      purpose: "motion",
      url: options.motionUrl,
      durationSeconds: options.durationSeconds,
      label: options.title,
    }],
    promptPolicy: {
      mode: "prefilled",
      showInstruction: false,
      instruction: VIDEO_REFERENCE_INSTRUCTION,
    },
    defaultPrompt: {
      en: duoVideoPrompt("en", duration, "720p"),
      zh: duoVideoPrompt("zh", duration, "720p"),
    },
    output: {
      duration,
      durations,
      resolution: "720p",
      resolutions: ["480p", "720p", "1080p"],
      aspectRatio: "9:16",
      aspectRatios: ["9:16"],
      audio: "generated",
      audioOptions: ["generated"],
    },
    retailPricing: VIDEO_RETAIL,
    pricingVersion: options.pricingVersion,
    examples: options.examples,
  };
}
