import type { LandingToolRegistry } from "./renderer";
import type { MediaModel } from "@/ai/types";

/** Product-specific integrations live here, never in the page layout. */
export const landingToolRegistry: LandingToolRegistry = {
  "video-generator": async ({ id, slot, locale, tool }) => {
    const [{ default: VideoGeneratorSlot }, { getToolCatalog }, { getPricingPage }] = await Promise.all([
      import("./tools/video-generator"), import("@/config/ai"), import("@/services/page"),
    ]);
    const definition = getToolCatalog().find(t => t.id === "video-generator" && t.enabled);
    const reference = getToolCatalog().find(t => t.id === "reference-video" && t.enabled);
    if (!definition && !reference) return <p>{locale === "zh" ? "此工具暂不可用" : "This tool is unavailable"}</p>;
    const { publicReferencePresets } = await import("@/ai/reference-video");
    const { publicWorkbench } = await import("@/ai/workbench");
    const referencePresets = reference ? publicReferencePresets(reference.models) : undefined;
    const pricing = await getPricingPage(locale);
    const copy = Object.fromEntries(Object.entries(tool.config ?? {}).filter(([, value]) => typeof value === "string")) as Record<string, string>;
    const workbench = typeof tool.config?.workbench === "string" ? publicWorkbench(tool.config.workbench) : null;
    const useSplitEmbed = copy.toolLayout === "split";
    if (useSplitEmbed) {
      return (
        <VideoGeneratorSlot
          id={id}
          slot={slot}
          copy={copy}
          models={definition?.models.filter(m => m.enabled) ?? []}
          referencePresets={referencePresets}
          pricing={pricing.pricing ?? null}
          workbench={workbench}
        />
      );
    }
    const { default: VideoStudio } = await import("@/components/ai/video-studio");
    return <VideoStudio id={id} models={definition?.models.filter(m => m.enabled) ?? []} pricing={pricing.pricing ?? null} tool={copy} referencePresets={referencePresets} workbench={workbench} />;
  },
  "reference-video": async ({ id, locale, tool }) => {
    const [{ default: ReferenceVideoTool }, { getToolCatalog }, { publicReferencePresets }, { getPricingPage }] = await Promise.all([
      import("@/components/ai/reference-video-tool"), import("@/config/ai"), import("@/ai/reference-video"), import("@/services/page"),
    ]);
    const definition = getToolCatalog().find(t => t.id === "reference-video" && t.enabled);
    if (!definition) return <p>{locale === "zh" ? "此工具暂不可用" : "This tool is unavailable"}</p>;
    const pricing = await getPricingPage(locale);
    return <ReferenceVideoTool id={id} presets={publicReferencePresets(definition.models)} pricing={pricing.pricing ?? null}
      presetId={typeof tool.config?.presetId === "string" ? tool.config.presetId : undefined} />;
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
