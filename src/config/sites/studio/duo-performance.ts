import { duoImagePrompt } from "@/ai/duo-image-prompt";
import { duoVideoPrompt } from "@/ai/duo-video-prompt";
import type { VideoPreset } from "@/ai/workbench-types";
import { referenceSampleCatalog, referenceVideoModelId } from "@/config/reference-video";
import { duoIdentitySlots } from "../shared/slots";
import { sceneAsset } from "../shared/scene-asset";
import { IMAGE_RETAIL, VIDEO_RETAIL } from "../shared/pricing";
import { publicMedia, referenceMotionUrl } from "@/config/public-media";


export function duoPerformancePreset(): VideoPreset {
  const motionUrl = referenceMotionUrl();
  return {
    id: "duo-performance",
    version: "10",
    enabled: true,
    title: { en: "Duo performance", zh: "双人表演" },
    description: {
      en: "Upload photos of two people. Choose image reference or video reference. Likeness and timing can vary.",
      zh: "上传两个人的照片，选择图片参考或视频参考。相似度和动作节奏可能变化。",
    },
    defaultVariantId: "image-reference",
    variants: [
      {
        id: "image-reference",
        enabled: true,
        title: { en: "Photo reference", zh: "图片参考" },
        description: {
          en: "Your photos set identity. Optional preset images set scene and style. No reference video is sent.",
          zh: "你的照片用于人物，预设图只用于场景和风格。不会发送参考视频。",
        },
        strategy: "image-reference",
        toolId: "video-generator",
        modelId: "seedance-2-image-reference",
        inputSlots: duoIdentitySlots(),
        operatorAssets: sceneAsset(),
        promptPolicy: {
          mode: "prefilled",
          showInstruction: false,
          instruction: "Keep the two people separate and consistent. Do not add people, captions or logos. Scene and style images must not replace either face.",
        },
        defaultPrompt: {
          en: duoImagePrompt("en", 4, "9:16"),
          zh: duoImagePrompt("zh", 4, "9:16"),
        },
        output: {
          duration: 4, durations: [4, 5, 8],
          resolution: "720p", resolutions: ["480p", "720p", "1080p"],
          aspectRatio: "9:16", aspectRatios: ["16:9", "9:16", "1:1"],
          audio: "generated", audioOptions: ["generated"],
        },
        retailPricing: IMAGE_RETAIL,
        pricingVersion: "2",
        examples: [],
      },
      {
        id: "video-reference",
        enabled: true,
        title: { en: "Video reference", zh: "视频参考" },
        description: {
          en: "Your photos set identity. A site-owned clip supplies motion. Sample previews do not change that clip.",
          zh: "你的照片用于人物，站内配置的视频提供动作。切换示例只改预览。",
        },
        strategy: "video-reference",
        toolId: "reference-video",
        modelId: referenceVideoModelId(),
        inputSlots: duoIdentitySlots(),
        operatorAssets: [{
          id: "motion",
          kind: "video",
          purpose: "motion",
          url: motionUrl,
          durationSeconds: publicMedia.templates[0].durationSeconds,
          label: { en: "Preset motion", zh: "预设动作" },
        }],
        promptPolicy: {
          mode: "prefilled",
          showInstruction: false,
          instruction: "Use the reference video for scene, camera and performance timing. Cast the people from the reference images in the assigned roles. Preserve their identity through turns. Keep the two characters separate. Do not add people, captions or logos.",
        },
        defaultPrompt: {
          en: duoVideoPrompt("en", 4, "720p"),
          zh: duoVideoPrompt("zh", 4, "720p"),
        },
        output: {
          duration: 4, durations: [4, 5, 8],
          resolution: "720p", resolutions: ["480p", "720p", "1080p"],
          aspectRatio: "9:16", aspectRatios: ["9:16"],
          audio: "generated", audioOptions: ["generated"],
        },
        retailPricing: VIDEO_RETAIL,
        pricingVersion: "3",
        examples: referenceSampleCatalog(),
      },
    ],
  };
}
