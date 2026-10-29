import type { VideoPreset } from "@/ai/workbench-types";
import { publicMedia, referenceMotionUrl } from "@/config/public-media";
import { referenceVideoModelId } from "@/config/reference-video";
import { createVideoTemplateVariant } from "../shared/video-template";

/** Register genuine local assets in public-media.ts; unconfigured variants stay absent. */
export function memeDuoVideoPreset(): VideoPreset {
  const templates = publicMedia.templates.filter(item => item.enabled);
  return {
    id: "meme-duo-video", version: "3", enabled: true,
    title: { en: "Reference video", zh: "参考视频" },
    description: { en: "Upload photos and follow a local template performance.", zh: "上传照片，参考本地模板中的表演制作视频。" },
    defaultVariantId: `template-${templates[0]?.id ?? "original"}`,
    variants: templates.map((item, index) => createVideoTemplateVariant({
      id: `template-${item.id}`, title: item.title,
      description: { en: "Template motion and original template sound.", zh: "模板动作和模板原音。" },
      modelId: referenceVideoModelId(),
      motionUrl: index === 0 ? referenceMotionUrl() : item.src,
      durationSeconds: item.durationSeconds, pricingVersion: "3",
      output: { resolution: "480p", resolutions: ["480p", "720p"] },
      examples: [{ id: `sample-${index + 1}`, src: item.src, label: item.title }],
    })),
  };
}
