import { duoImagePrompt } from "@/ai/duo-image-prompt";
import { duoVideoPrompt } from "@/ai/duo-video-prompt";
import type { VideoPreset, WorkbenchPageConfig } from "@/ai/workbench-types";
import { referenceSampleCatalog } from "./reference-video";

const R2_EXAMPLES = "https://cdn.shipstart.net/shipfire/index/examples";

/**
 * Retail credit examples, not vendor invoices.
 * Image reference is priced on output seconds only.
 * Video reference keeps the existing reference-video retail table.
 */
const IMAGE_RETAIL = { perSecond: { "480p": 4, "720p": 5, "1080p": 8 }, minimum: 16 };
/** One site credit per billable second. Billable seconds are template length plus output length, floored at 30 so one $9.90 pack buys one video. */
const VIDEO_RETAIL = { perSecond: { "480p": 1, "720p": 1, "1080p": 1 }, minimum: 30 };
const BASIC_RETAIL = { perSecond: { "480p": 4, "720p": 4, "1080p": 8 }, minimum: 20 };

function sceneAsset() {
  const url = process.env.WORKBENCH_SCENE_IMAGE_URL?.trim();
  if (!url) return [];
  return [{
    id: "scene",
    kind: "image" as const,
    purpose: "scene" as const,
    url,
    label: { en: "Preset scene", zh: "预设场景" },
  }];
}

/** One trend is a preset. Each variant is one priced way to generate it. */
export function getVideoPresets(): VideoPreset[] {
  const motionUrl = process.env.REFERENCE_VIDEO_URL ?? `${R2_EXAMPLES}/example-1.mp4`;
  return [
    {
      id: "free-create",
      version: "1",
      enabled: true,
      title: { en: "Free create", zh: "自由生成" },
      description: {
        en: "Describe a clip, or animate one uploaded photo as the opening frame.",
        zh: "用文字生成，或上传一张照片作为开头画面。",
      },
      defaultVariantId: "text",
      variants: [
        {
          id: "text",
          enabled: true,
          title: { en: "Text to video", zh: "文生视频" },
          description: { en: "Generate from a prompt only.", zh: "只根据提示词生成。" },
          strategy: "text",
          toolId: "video-generator",
          modelId: "basic",
          inputSlots: [],
          operatorAssets: [],
          promptPolicy: { mode: "editable", instruction: "", showInstruction: false },
          output: {
            duration: 5, durations: [5, 8, 10],
            resolution: "720p", resolutions: ["480p", "720p", "1080p"],
            aspectRatio: "9:16", aspectRatios: ["16:9", "9:16", "1:1"],
            audio: "off", audioOptions: ["off"],
          },
          retailPricing: BASIC_RETAIL,
          pricingVersion: "1",
          examples: [],
        },
        {
          id: "first-frame",
          enabled: true,
          title: { en: "Image to video", zh: "图生视频" },
          description: { en: "One photo becomes the opening frame.", zh: "一张照片作为视频的第一帧。" },
          strategy: "first-frame",
          toolId: "video-generator",
          modelId: "basic",
          inputSlots: [{
            id: "frame",
            purpose: "first-frame",
            label: { en: "Opening photo", zh: "开头照片" },
            description: { en: "This photo is the first frame, not a character reference.", zh: "这张照片是第一帧，不是人物参考。" },
            required: true,
            maxCount: 1,
          }],
          operatorAssets: [],
          promptPolicy: { mode: "editable", instruction: "", showInstruction: false },
          output: {
            duration: 5, durations: [5, 8, 10],
            resolution: "720p", resolutions: ["480p", "720p", "1080p"],
            aspectRatio: "9:16", aspectRatios: ["16:9", "9:16", "1:1"],
            audio: "off", audioOptions: ["off"],
          },
          retailPricing: BASIC_RETAIL,
          pricingVersion: "1",
          examples: [],
        },
      ],
    },
    {
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
          inputSlots: [
            {
              id: "left", purpose: "identity", required: true, maxCount: 1,
              label: { en: "First person", zh: "第一位" },
              description: { en: "One person, clear face.", zh: "一张照片一人，面部清晰。" },
            },
            {
              id: "right", purpose: "identity", required: true, maxCount: 1,
              label: { en: "Second person", zh: "第二位" },
              description: { en: "One person, clear face.", zh: "一张照片一人，面部清晰。" },
            },
          ],
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
          modelId: "seedance-2-reference",
          inputSlots: [
            {
              id: "left", purpose: "identity", required: true, maxCount: 1,
              label: { en: "First person", zh: "第一位" },
              description: { en: "One person, clear face.", zh: "一张照片一人，面部清晰。" },
            },
            {
              id: "right", purpose: "identity", required: true, maxCount: 1,
              label: { en: "Second person", zh: "第二位" },
              description: { en: "One person, clear face.", zh: "一张照片一人，面部清晰。" },
            },
          ],
          operatorAssets: [{
            id: "motion",
            kind: "video",
            purpose: "motion",
            url: motionUrl,
            durationSeconds: 4,
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
    },
  ];
}

export function getWorkbenchPages(): WorkbenchPageConfig[] {
  return [
    {
      id: "studio",
      presetIds: ["free-create", "duo-performance"],
      defaultPresetId: "free-create",
      defaultVariantId: "text",
      showPresetPicker: true,
      showOperatorPreview: true,
    },
    {
      id: "duo",
      presetIds: ["duo-performance"],
      defaultPresetId: "duo-performance",
      defaultVariantId: "image-reference",
      showPresetPicker: false,
      showOperatorPreview: false,
    },
    {
      id: "duo-image",
      presetIds: ["duo-performance"],
      variantIds: ["image-reference"],
      defaultPresetId: "duo-performance",
      defaultVariantId: "image-reference",
      showPresetPicker: false,
      showOperatorPreview: true,
    },
    {
      id: "duo-video",
      presetIds: ["duo-performance"],
      variantIds: ["video-reference"],
      defaultPresetId: "duo-performance",
      defaultVariantId: "video-reference",
      showPresetPicker: false,
      showOperatorPreview: false,
    },
  ];
}
