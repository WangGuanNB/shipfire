import type { WorkbenchSlot } from "@/ai/workbench-types";

/** Two-person identity slots shared by duo / meme video-reference variants. */
export function duoIdentitySlots(): WorkbenchSlot[] {
  return [
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
  ];
}
