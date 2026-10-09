import { getToolCatalog } from "@/config/ai";
import type { MediaModel } from "@/ai/types";
import { estimateVideoCredits } from "@/lib/quote-credits";

export async function GET(req: Request) {
  const tool = getToolCatalog().find((item) => item.id === "video-generator" && item.enabled);
  if (!tool) {
    return Response.json({ code: 1, message: "Video generator is unavailable" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const inputMode = searchParams.get("inputMode");
  const models = tool.models
    .filter((model) => model.enabled)
    .filter((model) => {
      if (inputMode !== "text" && inputMode !== "image") return true;
      const modes = (model as MediaModel).capabilities.modes;
      return modes.includes(inputMode);
    })
    .map((model) => {
      const media = model as MediaModel;
      const { adapter, providerModel, providerModels, pricing, ...publicModel } = model;
      return {
        ...publicModel,
        resolutions: media.capabilities.resolutions,
        durations: media.capabilities.durations,
        aspectRatios: media.capabilities.aspectRatios,
        inputModes: media.capabilities.modes,
        estimatedCredits: estimateVideoCredits(media),
      };
    });

  return Response.json({ code: 0, data: { models } });
}
