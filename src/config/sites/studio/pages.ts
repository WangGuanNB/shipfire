import type { WorkbenchPageConfig } from "@/ai/workbench-types";

export const studioWorkbenchPages: WorkbenchPageConfig[] = [
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
