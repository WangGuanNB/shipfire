import type { VideoPreset } from "@/ai/workbench-types";
import { createVideoTemplateVariant } from "../shared/video-template";

const R2_EXAMPLES = "https://cdn.shipstart.net/shipfire/index/examples";

function templateUrl(index: number): string {
  if (index === 1) return process.env.REFERENCE_VIDEO_URL ?? `${R2_EXAMPLES}/example-1.mp4`;
  return `${R2_EXAMPLES}/example-${index}.mp4`;
}

/**
 * Scenario A: one meme trend, multiple motion templates, same upload slots.
 * Copy this folder when launching a new hot-meme site.
 */
export function memeDuoVideoPreset(): VideoPreset {
  return {
    id: "meme-duo-video",
    version: "1",
    enabled: true,
    title: { en: "Duo meme video", zh: "双人热梗视频" },
    description: {
      en: "Upload two photos and pick a dance template. Each template ships its own motion clip and prompt.",
      zh: "上传两张照片，选择一个舞蹈模板。每个模板都有独立的参照视频和提示词。",
    },
    defaultVariantId: "template-original",
    variants: [
      createVideoTemplateVariant({
        id: "template-original",
        title: { en: "Original", zh: "原版" },
        description: { en: "The classic motion clip.", zh: "经典原版动作。" },
        motionUrl: templateUrl(1),
        durationSeconds: 4,
        pricingVersion: "1",
        examples: [{
          id: "demo-original",
          src: templateUrl(1),
          label: { en: "Original demo", zh: "原版示例" },
        }],
      }),
      createVideoTemplateVariant({
        id: "template-remix",
        title: { en: "Remix", zh: "Remix 版" },
        description: { en: "A faster remix of the trend.", zh: "节奏更快的 remix 版本。" },
        motionUrl: templateUrl(2),
        durationSeconds: 4,
        pricingVersion: "1",
        examples: [{
          id: "demo-remix",
          src: templateUrl(2),
          label: { en: "Remix demo", zh: "Remix 示例" },
        }],
      }),
      createVideoTemplateVariant({
        id: "template-slow",
        title: { en: "Slow motion", zh: "慢动作版" },
        description: { en: "A slower take on the same trend.", zh: "同一热梗的慢动作版本。" },
        motionUrl: templateUrl(3),
        durationSeconds: 6,
        outputDuration: 6,
        outputDurations: [6, 8],
        pricingVersion: "1",
        examples: [{
          id: "demo-slow",
          src: templateUrl(3),
          label: { en: "Slow demo", zh: "慢动作示例" },
        }],
      }),
    ],
  };
}
