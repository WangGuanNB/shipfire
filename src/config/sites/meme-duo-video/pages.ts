import type { WorkbenchPageConfig } from "@/ai/workbench-types";

/** Single-meme site page: multiple video templates, card picker, no preset switcher. */
export const memeDuoVideoPages: WorkbenchPageConfig[] = [
  {
    id: "meme-duo-video",
    presetIds: ["meme-duo-video"],
    defaultPresetId: "meme-duo-video",
    defaultVariantId: "template-original",
    showPresetPicker: false,
    showOperatorPreview: false,
    variantPicker: "modal",
  },
];
