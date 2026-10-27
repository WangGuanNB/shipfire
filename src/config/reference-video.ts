import type { LocalizedCopy, ReferenceVideoModel, ReferenceVideoPreset } from "@/ai/reference-video-types";
import { publicMedia, referenceMotionUrl } from "./public-media";

/** Only real, enabled local templates appear in the sample catalog. */
export function referenceSampleCatalog(): { id: string; src: string; label: LocalizedCopy }[] {
  return publicMedia.templates.filter(item => item.enabled).map((item, index) => ({
    id: `sample-${index + 1}`,
    src: item.src,
    label: item.title,
  }));
}

/** Server-side operator configuration. Prices are retail CREDIT examples, not vendor prices. */
export function getReferenceVideoModels(): ReferenceVideoModel[] {
  const standard: ReferenceVideoModel = {
    id: "seedance-2-reference", label: "Seedance 2 Reference", enabled: true,
    adapter: "kie-seedance2-reference", providerModel: "bytedance/seedance-2",
    capabilities: {
      modes: ["reference"], resolutions: ["480p", "720p", "1080p"],
      aspectRatios: ["16:9", "9:16", "1:1", "4:3", "3:4"], maxImages: 9,
      minOutputSeconds: 4, maxOutputSeconds: 15, maxPromptLength: 5000,
    },
    // Credits = ceil(output seconds × resolution rate), with a floor (same idea as text/image video).
    pricing: { perSecond: { "480p": 1, "720p": 1, "1080p": 1 }, minimum: 30 },
  };
  return [standard, { ...standard, id: "seedance-2-fast-reference", label: "Seedance 2 Fast Reference", providerModel: "bytedance/seedance-2-fast", capabilities: { ...standard.capabilities, resolutions: ["480p", "720p"] } }];
}

/** Template sites: switch reference-video backend via wrangler / `.env.local` without code edits. */
export function referenceVideoModelId(): string {
  const selected = (process.env.REFERENCE_VIDEO_MODEL ?? "standard").trim().toLowerCase();
  if (selected === "standard") return "seedance-2-reference";
  if (selected === "fast") return "seedance-2-fast-reference";
  throw new Error("REFERENCE_VIDEO_MODEL must be standard or fast");
}

/** Copy a preset to add a trend. Increment version whenever its inputs or instructions change. */
export function getReferenceVideoPresets(): ReferenceVideoPreset[] {
  return [{
    id: "duo-performance", version: "4", enabled: true,
    title: { en: "Duo performance", zh: "双人表演" },
    description: {
      en: "Cast two people in an operator-approved performance. Motion and likeness may vary.",
      zh: "上传两张照片，参考站长配置的表演生成新视频。动作和人物相似度可能变化。",
    },
    modelId: referenceVideoModelId(),
    roles: [
      { id: "left", label: { en: "First performer", zh: "第一位角色" },
        description: { en: "One person, clear face and upper body.", zh: "一张照片一人，面部和上半身清晰。" },
        instruction: "The performer starting on the viewer's left. Keep this identity with that performer throughout." },
      { id: "right", label: { en: "Second performer", zh: "第二位角色" },
        description: { en: "One person, clear face and upper body.", zh: "一张照片一人，面部和上半身清晰。" },
        instruction: "The performer starting on the viewer's right. Keep this identity with that performer throughout." },
    ],
    referenceVideo: {
      /** Public HTTPS URL Kie can fetch (MP4/MOV). Override with `REFERENCE_VIDEO_URL` in env / Wrangler. */
      url: referenceMotionUrl(),
    },
    examples: referenceSampleCatalog(),
    prompt: "Use the reference video for scene, camera and performance timing. Cast the people from the reference images in the assigned roles. Preserve their identity through turns. Keep the two characters separate. Do not add people, captions or logos.",
    /** Kie Seedance 2 rejects very short outputs; 4s is the practical minimum for testing. */
    duration: 4, aspectRatio: "9:16", resolutions: ["720p"],
    audio: "off",
  }];
}
