import type { OperatorAsset } from "@/ai/workbench-types";

export function sceneAsset(): OperatorAsset[] {
  const url = process.env.WORKBENCH_SCENE_IMAGE_URL?.trim();
  if (!url) return [];
  return [{
    id: "scene",
    kind: "image",
    purpose: "scene",
    url,
    label: { en: "Preset scene", zh: "预设场景" },
  }];
}
