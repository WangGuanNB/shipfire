import type { LandingPage } from "@/types/pages/landing";
import type { LandingModule, LandingSection, LandingSurface } from "@/types/blocks/landing";

const legacy: LandingModule[] = [
  { id: "hero", type: "hero", source: "hero", surface: "default" },
  { id: "introduce", type: "intro", source: "introduce", surface: "alt" },
  { id: "feature", type: "features", source: "feature", surface: "default" },
  { id: "benefit", type: "benefits", source: "benefit", surface: "alt" },
  { id: "usage", type: "steps", source: "usage", surface: "default" },
  { id: "testimonial", type: "testimonials", source: "testimonial", surface: "alt" },
  { id: "faq", type: "faq", source: "faq", surface: "default" },
  { id: "cta", type: "cta", source: "cta", surface: "emphasis" },
];

/** Presets are defaults only. JSON modules always take precedence. */
export const landingPresets: Record<"tool" | "introduction", LandingModule[]> = {
  tool: [
    { id: "hero", type: "hero", source: "hero", tool: "primary", surface: "default" },
    { id: "examples", type: "examples", source: "examples", surface: "alt" },
    { id: "introduce", type: "intro", source: "introduce", surface: "default" },
    { id: "usage", type: "steps", source: "usage", surface: "alt" },
    { id: "feature", type: "features", source: "feature", surface: "default" },
    { id: "benefit", type: "benefits", source: "benefit", surface: "alt" },
    { id: "testimonial", type: "testimonials", source: "testimonial", surface: "default" },
    { id: "cost", type: "content", source: "cost", surface: "alt" },
    { id: "faq", type: "faq", source: "faq", surface: "default" },
    { id: "cta", type: "cta", source: "cta", surface: "emphasis" },
  ],
  introduction: [
    { id: "hero", type: "hero", source: "hero", surface: "default" },
    { id: "contents", type: "toc", source: "toc", surface: "alt" },
    { id: "answer", type: "content", source: "answer", surface: "default" },
    { id: "examples", type: "examples", source: "examples", surface: "alt" },
    { id: "limits", type: "content", source: "limits", surface: "default" },
    { id: "faq", type: "faq", source: "faq", surface: "alt" },
    { id: "related", type: "related", source: "related", surface: "default" },
  ],
};

export function getModuleData(page: LandingPage, module: LandingModule): LandingSection | undefined {
  const key = module.source ?? module.id;
  // Own properties only: JSON source names must not access object prototypes.
  const source = page.sections && Object.hasOwn(page.sections, key)
    ? page.sections[key]
    : Object.hasOwn(page, key) ? (page as unknown as Record<string, unknown>)[key] : undefined;
  return source && typeof source === "object" && !Array.isArray(source)
    ? source as LandingSection : undefined;
}

export function resolveModuleSurface(module: LandingModule, index: number): LandingSurface {
  if (module.surface === "default" || module.surface === "alt" || module.surface === "emphasis") {
    return module.surface;
  }
  if (module.type === "cta") return "emphasis";
  return index % 2 === 0 ? "default" : "alt";
}

export function getLandingModules(page: LandingPage): LandingModule[] {
  const configured = page.modules ?? (page.page_type ? landingPresets[page.page_type] : legacy);
  const ids = new Set<string>();
  const tools = new Set<string>();
  return configured.filter((module) => {
    if (module.disabled) return false;
    if (!/^[a-zA-Z][\w-]*$/.test(module.id) || ids.has(module.id)) {
      throw new Error(`Landing module id must be unique and anchor-safe: ${module.id}`);
    }
    ids.add(module.id);
    const data = getModuleData(page, module);
    if (data?.disabled) return false;
    if (module.type !== "tool" && !data) return false;
    if (module.type === "tool" && (!module.tool || !page.tools?.[module.tool] || page.tools[module.tool].disabled)) return false;
    if (module.tool && page.tools?.[module.tool] && !page.tools[module.tool].disabled) {
      if (tools.has(module.tool)) throw new Error(`Landing tool slot rendered twice: ${module.tool}`);
      tools.add(module.tool);
    }
    return true;
  });
}

export function getLandingToc(page: LandingPage, modules: LandingModule[]) {
  return modules.flatMap((module) => {
    if (["hero", "tool", "toc", "cta"].includes(module.type) || module.include_in_toc === false) return [];
    const title = getModuleData(page, module)?.title;
    return title ? [{ id: module.id, title }] : [];
  });
}
