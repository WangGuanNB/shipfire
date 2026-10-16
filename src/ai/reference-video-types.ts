import type { ToolModel } from "./types";

export type LocalizedCopy = { en: string; zh: string };
export interface ReferenceVideoModel extends ToolModel {
  capabilities: {
    modes: ["reference"];
    resolutions: string[];
    aspectRatios: string[];
    maxImages: number;
    minOutputSeconds: number;
    maxOutputSeconds: number;
    maxPromptLength: number;
  };
  pricing: { perSecond: Record<string, number>; minimum: number };
}
export interface ReferenceVideoPreset {
  id: string;
  version: string;
  enabled: boolean;
  title: LocalizedCopy;
  description: LocalizedCopy;
  modelId: string;
  roles: { id: string; label: LocalizedCopy; description: LocalizedCopy; instruction: string }[];
  /** Server-owned generation input. Never inferred from the display example. */
  /** Operator-owned clip sent to the model (must be public HTTPS MP4/MOV). */
  referenceVideo: { url: string };
  /**
   * Display-only clips. The Example player uses the one the visitor selects.
   * These paths are never submitted to the model.
   */
  examples?: { id: string; src: string; label: LocalizedCopy }[];
  /** @deprecated Prefer `examples`. Kept so a single configured path still works. */
  exampleVideoUrl?: string;
  prompt: string;
  duration: number;
  aspectRatio: string;
  resolutions: string[];
  audio: "off" | "generated";
}
export interface PublicReferencePreset {
  id: string;
  version: string;
  title: LocalizedCopy;
  description: LocalizedCopy;
  modelId: string;
  roles: { id: string; label: LocalizedCopy; description: LocalizedCopy }[];
  examples: { id: string; src: string; label: LocalizedCopy }[];
  duration: number;
  aspectRatio: string;
  resolutions: string[];
  audio: "off" | "generated";
  credits: Record<string, number>;
  ready: boolean;
}
