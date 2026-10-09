import type { ToolAdapter } from "../types";
import { imageAdapter } from "./image";
import { kieSeedanceAdapter, kieSeedance2Adapter, kieWanAdapter } from "./kie-video";

/** New vendors/tools implement this interface; billing and task storage stay unchanged. */
export const adapters: Record<string, ToolAdapter> = {
  "image-router": imageAdapter,
  "kie-seedance": kieSeedanceAdapter,
  "kie-seedance2": kieSeedance2Adapter,
  "kie-wan": kieWanAdapter,
};
