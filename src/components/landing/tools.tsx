import type { LandingToolRegistry } from "./renderer";

/** Product-specific integrations live here, never in the page layout. */
export const landingToolRegistry: LandingToolRegistry = {
  "image-generator": async ({ id, slot, locale, tool }) => {
    const [{ default: ImageGeneratorSlot }, { getPricingPage }, { getAIChatCreditCost }] = await Promise.all([
      import("./tools/image-generator"),
      import("@/services/page"),
      import("@/services/config"),
    ]);
    const pricing = await getPricingPage(locale);
    const copy = Object.fromEntries(Object.entries(tool.config ?? {}).filter(([, value]) => typeof value === "string")) as Record<string, string>;
    return <ImageGeneratorSlot id={id} slot={slot} copy={copy} creditCost={getAIChatCreditCost()} pricing={pricing.pricing ?? null} />;
  },
};
