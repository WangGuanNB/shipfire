import type { LocalizedCopy } from "./reference-video-types";

/** Internal generation strategies. Old task rows keep their existing mode values. */
export type GenerationStrategy = "text" | "first-frame" | "image-reference" | "video-reference";
export type PromptPolicyMode = "editable" | "prefilled" | "append" | "locked";
export type WorkbenchAudio = "off" | "generated";

export interface WorkbenchSlot {
  id: string;
  purpose: "identity" | "first-frame";
  label: LocalizedCopy;
  description: LocalizedCopy;
  required: boolean;
  maxCount: number;
}

export interface OperatorAsset {
  id: string;
  kind: "image" | "video";
  purpose: "scene" | "style" | "motion";
  url: string;
  durationSeconds?: number;
  label: LocalizedCopy;
}

export interface WorkbenchExample {
  id: string;
  src: string;
  label: LocalizedCopy;
}

export interface VideoVariant {
  id: string;
  enabled: boolean;
  title: LocalizedCopy;
  description: LocalizedCopy;
  strategy: GenerationStrategy;
  toolId: "video-generator" | "reference-video";
  modelId: string;
  inputSlots: WorkbenchSlot[];
  operatorAssets: OperatorAsset[];
  /** `instruction` stays on the server. `defaultPrompt` is the text shown in the box. */
  promptPolicy: { mode: PromptPolicyMode; instruction: string; showInstruction: boolean };
  defaultPrompt?: LocalizedCopy;
  output: {
    duration: number;
    durations: number[];
    resolution: string;
    resolutions: string[];
    aspectRatio: string;
    aspectRatios: string[];
    audio: WorkbenchAudio;
    audioOptions: WorkbenchAudio[];
  };
  /** Site retail credits. Independent from provider cost. */
  retailPricing: { perSecond: Record<string, number>; minimum: number };
  pricingVersion: string;
  examples: WorkbenchExample[];
}

export interface VideoPreset {
  id: string;
  version: string;
  enabled: boolean;
  title: LocalizedCopy;
  description: LocalizedCopy;
  defaultVariantId: string;
  variants: VideoVariant[];
}

export interface WorkbenchPageConfig {
  id: string;
  presetIds: string[];
  /** Omit to show every enabled variant on the bound presets. */
  variantIds?: string[];
  defaultPresetId: string;
  defaultVariantId: string;
  showPresetPicker: boolean;
  showOperatorPreview: boolean;
}

export interface PublicWorkbenchVariant {
  id: string;
  title: LocalizedCopy;
  description: LocalizedCopy;
  strategy: GenerationStrategy;
  toolId: "video-generator" | "reference-video";
  modelId: string;
  pricingVersion: string;
  slots: { id: string; purpose: WorkbenchSlot["purpose"]; label: LocalizedCopy; description: LocalizedCopy; required: boolean }[];
  operatorPreviews: { id: string; kind: OperatorAsset["kind"]; label: LocalizedCopy; src: string }[];
  promptMode: PromptPolicyMode;
  defaultPrompt?: LocalizedCopy;
  output: VideoVariant["output"];
  credits: Record<string, number>;
  examples: WorkbenchExample[];
  ready: boolean;
}

export interface PublicWorkbenchPreset {
  id: string;
  version: string;
  title: LocalizedCopy;
  description: LocalizedCopy;
  defaultVariantId: string;
  variants: PublicWorkbenchVariant[];
}

export interface PublicWorkbenchPage {
  id: string;
  showPresetPicker: boolean;
  showOperatorPreview: boolean;
  defaultPresetId: string;
  defaultVariantId: string;
  presets: PublicWorkbenchPreset[];
}

export function workbenchCreditKey(resolution: string, duration: number, audio: string): string {
  return `${resolution}:${duration}:${audio}`;
}
