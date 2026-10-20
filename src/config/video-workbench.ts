import type { VideoPreset, WorkbenchPageConfig } from "@/ai/workbench-types";
import { getSitePresets, getSiteWorkbenchPages } from "./sites/registry";

/** One trend is a preset. Each variant is one priced way to generate it. */
export function getVideoPresets(): VideoPreset[] {
  return getSitePresets();
}

export function getWorkbenchPages(): WorkbenchPageConfig[] {
  return getSiteWorkbenchPages();
}
