import type { ToolDefinition, ToolModel } from "@/ai/types";
import { getAIChatCreditCost } from "@/services/config";
import { getReferenceVideoModels } from "./reference-video";

/** Site catalog. Add tools/models here; credentials always stay in server env. */
export function getToolCatalog(): ToolDefinition[] {
  const enabled = new Set((process.env.AI_ENABLED_TOOLS ?? "image-generator,video-generator,reference-video").split(",").map(x => x.trim()));
  const videoModes = (process.env.AI_VIDEO_MODES ?? "text,image").split(",").map(x => x.trim()).filter(x => x === "text" || x === "image");
  return [
    {
      id: "image-generator", label: "Image generator", enabled: enabled.has("image-generator"),
      models: [{
        id: "default", label: "Default", adapter: "image-router", enabled: true,
        capabilities: { modes: ["text"], resolutions: ["1K", "2K", "4K"], aspectRatios: ["auto", "1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"], maxPromptLength: 5000 },
        pricing: { fixed: getAIChatCreditCost() },
      }],
    },
    {
      id: "video-generator", label: "Video generator", enabled: enabled.has("video-generator") && videoModes.length > 0,
      models: ([
        {
          id: "basic",
          label: "Basic",
          description: "Seedance 1.5 Pro — fast, affordable clips for social posts.",
          tags: ["480p", "720p"],
          tier: "free",
          default: true,
          adapter: "kie-seedance",
          enabled: true,
          providerModel: process.env.KIE_VIDEO_MODEL || "bytedance/seedance-1.5-pro",
          capabilities: {
            modes: ["text", "image"],
            resolutions: ["480p", "720p", "1080p"],
            durations: [5, 8, 10],
            aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
            maxPromptLength: 5000,
          },
          pricing: { perSecond: { "480p": 4, "720p": 4, "1080p": 8 }, minimum: 20 },
        },
        {
          id: "seedance-2-fast",
          label: "Seedance 2 Fast",
          description: "Faster Seedance 2.0 — good for quick iteration and social clips.",
          tags: ["720p", "15s"],
          tier: "free",
          adapter: "kie-seedance2",
          enabled: true,
          providerModel: "bytedance/seedance-2-fast",
          capabilities: {
            modes: ["text", "image"],
            resolutions: ["480p", "720p"],
            durations: [5, 8, 10, 15],
            aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
            maxPromptLength: 5000,
          },
          pricing: { perSecond: { "480p": 4, "720p": 5 }, minimum: 20 },
        },
        {
          id: "seedance-2",
          label: "Seedance 2",
          description: "Higher-quality Seedance 2.0 with 1080p and richer motion.",
          tags: ["1080p"],
          tier: "pro",
          adapter: "kie-seedance2",
          enabled: true,
          providerModel: "bytedance/seedance-2",
          capabilities: {
            modes: ["text", "image"],
            resolutions: ["480p", "720p", "1080p"],
            durations: [5, 8, 10, 15],
            aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
            maxPromptLength: 5000,
          },
          pricing: { perSecond: { "480p": 6, "720p": 7, "1080p": 14 }, minimum: 35 },
        },
        {
          id: "wan-2.6",
          label: "Wan 2.6",
          description: "Higher quality motion and detail — best for Pro output.",
          tags: ["1080p", "15s"],
          tier: "pro",
          adapter: "kie-wan",
          enabled: true,
          providerModels: {
            text: "wan/2-6-text-to-video",
            image: "wan/2-6-image-to-video",
          },
          capabilities: {
            modes: ["text", "image"],
            resolutions: ["720p", "1080p"],
            durations: [5, 10, 15],
            aspectRatios: ["16:9", "9:16", "1:1"],
            maxPromptLength: 5000,
          },
          pricing: { perSecond: { "720p": 10, "1080p": 20 }, minimum: 50 },
        },
        {
          id: "seedance-2-image-reference",
          label: "Seedance 2 Image Reference",
          description: "Multimodal photo reference for preset trends. Not a first-frame model.",
          audience: "workbench",
          adapter: "kie-seedance2-image-reference",
          enabled: true,
          providerModel: "bytedance/seedance-2",
          capabilities: {
            modes: ["image"],
            resolutions: ["480p", "720p", "1080p"],
            durations: [4, 5, 8, 10, 15],
            aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"],
            maxPromptLength: 5000,
            maxImages: 9,
          },
          pricing: { perSecond: { "480p": 4, "720p": 5, "1080p": 8 }, minimum: 16 },
        },
      ] satisfies ToolModel[]).map(model => ({ ...model, capabilities: { ...model.capabilities, modes: model.capabilities.modes.filter(mode => videoModes.includes(mode as "text" | "image")) } })),
    },
    { id: "reference-video", label: "Reference video", enabled: enabled.has("reference-video"), models: getReferenceVideoModels() },
  ];
}

export { taskPolicy } from "@/ai/task-policy";
