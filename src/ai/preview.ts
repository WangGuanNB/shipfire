import { adapters } from "./adapters";
import { resolveTool } from "./catalog";
import { mapReferenceVideoInput } from "./reference-video";
import { ToolError, type ToolInput } from "./types";
import { mapImageReferenceInput } from "./workbench";

/** Compiled provider body for the homepage tool. Does not create a task, charge credits, or call the provider. */
export function buildGenerationPreview(toolId: string, modelId: string, rawInput: ToolInput) {
  const { model } = resolveTool(toolId, modelId);
  const adapter = adapters[model.adapter];
  if (!adapter) throw new ToolError("Tool adapter is not installed", 503);
  const input = adapter.validate(rawInput, model);
  const credits = adapter.quote(input, model);
  const request = providerBody(model.adapter, input);
  const videos = request.reference_video_urls;
  return {
    credits,
    providerModel: model.providerModel,
    includesReferenceVideo: Array.isArray(videos) && videos.length > 0,
    request,
  };
}

function providerBody(adapterId: string, input: ToolInput): Record<string, unknown> {
  if (adapterId === "kie-seedance2-image-reference") return mapImageReferenceInput(input);
  if (adapterId === "kie-seedance2-reference") return mapReferenceVideoInput(input);
  throw new ToolError("Preview is available for the photo and higher-fidelity routes", 400);
}
