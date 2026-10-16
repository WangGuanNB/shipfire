import type { ToolAdapter } from "../types";
import { imageAdapter } from "./image";
import { createKieVideoAdapter, kieSeedanceAdapter, kieSeedance2Adapter, kieWanAdapter } from "./kie-video";
import { mapReferenceVideoInput, quoteReferenceCredits, validateReferenceInput } from "../reference-video";
import { mapImageReferenceInput, quoteWorkbenchInput, validateImageReferenceInput } from "../workbench";

/** New vendors/tools implement this interface; billing and task storage stay unchanged. */
export const adapters: Record<string, ToolAdapter> = {
  "image-router": imageAdapter,
  "kie-seedance": kieSeedanceAdapter,
  "kie-seedance2": kieSeedance2Adapter,
  "kie-wan": kieWanAdapter,
  "kie-seedance2-reference": {
    ...createKieVideoAdapter(mapReferenceVideoInput),
    validate: validateReferenceInput,
    quote: (input, model) => typeof input.variantId === "string" ? quoteWorkbenchInput(input) : quoteReferenceCredits(input, model),
  },
  "kie-seedance2-image-reference": {
    ...createKieVideoAdapter(mapImageReferenceInput),
    validate: validateImageReferenceInput,
    quote: input => quoteWorkbenchInput(input),
  },
};
