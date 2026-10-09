import type { LandingToolRegistry } from "./renderer";
import type { MediaModel } from "@/ai/types";

/** Product-specific integrations live here, never in the page layout. */
export const landingToolRegistry: LandingToolRegistry = {
  "video-generator": async ({ id, locale, tool }) => {
    const [{ default: VideoTool }, { getToolCatalog }, { getPricingPage }] = await Promise.all([
      import("@/components/ai/video-tool"), import("@/config/ai"), import("@/services/page"),
    ]);
    const definition = getToolCatalog().find(t => t.id === "video-generator" && t.enabled);
    if (!definition) return <p>{locale === "zh" ? "此工具暂不可用" : "This tool is unavailable"}</p>;
    const pricing = await getPricingPage(locale);
    const copy = Object.fromEntries(Object.entries(tool.config ?? {}).filter(([, value]) => typeof value === "string")) as Record<string, string>;
    return <VideoTool id={id} models={definition.models.filter(m => m.enabled)} pricing={pricing.pricing ?? null} tool={copy} />;
  },
  "image-generator": async ({ id, slot, locale, tool }) => {
    const { getToolCatalog } = await import("@/config/ai");
    if (!getToolCatalog().some(t => t.id === "image-generator" && t.enabled)) return <p>{locale === "zh" ? "此工具暂不可用" : "This tool is unavailable"}</p>;
    const [{ default: ImageGeneratorSlot }, { getPricingPage }, { getAIChatCreditCost }] = await Promise.all([
      import("./tools/image-generator"),
      import("@/services/page"),
      import("@/services/config"),
    ]);
    const pricing = await getPricingPage(locale);
    const copy = Object.fromEntries(Object.entries(tool.config ?? {}).filter(([, value]) => typeof value === "string")) as Record<string, string>;
    const model = getToolCatalog().find(t => t.id === "image-generator")?.models.find(m => m.enabled) as MediaModel | undefined;
    return <ImageGeneratorSlot id={id} slot={slot} copy={copy} creditCost={model?.pricing.fixed ?? getAIChatCreditCost()} pricing={pricing.pricing ?? null} model={model} />;
  },
};
