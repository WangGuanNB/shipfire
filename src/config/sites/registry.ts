import type { VideoPreset, WorkbenchPageConfig } from "@/ai/workbench-types";
import { freeCreatePreset } from "./studio/free-create";
import { duoPerformancePreset } from "./studio/duo-performance";
import { studioWorkbenchPages } from "./studio/pages";
import { memeDuoVideoPreset } from "./meme-duo-video/preset";
import { memeDuoVideoPages } from "./meme-duo-video/pages";

/**
 * Active site presets for this deployment.
 * Clone a new meme site: copy `meme-duo-video/`, edit preset + pages, list them here.
 */
export function getSitePresets(): VideoPreset[] {
  return [
    freeCreatePreset,
    duoPerformancePreset(),
    memeDuoVideoPreset(),
  ];
}

export function getSiteWorkbenchPages(): WorkbenchPageConfig[] {
  return [
    ...studioWorkbenchPages,
    ...memeDuoVideoPages,
  ];
}
