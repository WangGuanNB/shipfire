import type { ReactNode } from "react";
import Hero from "@/components/blocks/hero";
import Intro from "@/components/blocks/feature-what-two";
import Features from "@/components/blocks/feature";
import Benefits from "@/components/blocks/feature2";
import Steps from "@/components/blocks/feature3";
import FAQ from "@/components/blocks/faq";
import CTA from "@/components/blocks/cta";
import Testimonials from "@/components/blocks/testimonial";
import Branding from "@/components/blocks/branding";
import Stats from "@/components/blocks/stats";
import type { LandingPage } from "@/types/pages/landing";
import type { LandingModule, LandingSection, LandingTool } from "@/types/blocks/landing";
import type { Hero as HeroData } from "@/types/blocks/hero";
import type { Pricing as PricingData } from "@/types/blocks/pricing";
import { getLandingModules, getModuleData, getLandingToc, resolveModuleSurface } from "@/lib/landing";
import { LandingInteractions } from "./interactions";
import { ContentSection, Contents, Examples, Related } from "./sections";

export interface ToolRenderProps {
  id: string;
  slot: string;
  locale: string;
  tool: LandingTool;
}
export type LandingToolRegistry = Record<string, (props: ToolRenderProps) => ReactNode | Promise<ReactNode>>;
interface ModuleRenderProps {
  module: LandingModule;
  section: LandingSection;
  tool?: ReactNode;
  toc: { id: string; title: string }[];
}
export type LandingModuleRegistry = Record<string, (props: ModuleRenderProps) => ReactNode | Promise<ReactNode>>;

/** Register a new presentation component here, or inject it via the renderers prop. */
export const landingModuleRegistry: LandingModuleRegistry = {
  hero: ({ section, tool }) => <Hero hero={{ ...section, ...(tool ? { variant: "tool" } : {}) } as HeroData}>{tool}</Hero>,
  tool: ({ module, tool }) => tool ? <section id={module.id} className="landing-section scroll-mt-24"><div className="container">{tool}</div></section> : null,
  intro: ({ section }) => <Intro section={section} />,
  features: ({ section }) => <Features section={section} />,
  benefits: ({ section }) => <Benefits section={section} />,
  steps: ({ section }) => <Steps section={section} />,
  examples: ({ section }) => <Examples section={section} />,
  content: ({ section }) => <ContentSection section={section} />,
  toc: ({ section, toc }) => <Contents section={section} items={toc} />,
  related: ({ section }) => <Related section={section} />,
  pricing: async ({ section }) => {
    const { default: Pricing } = await import("@/components/blocks/pricing");
    return <Pricing pricing={section as unknown as PricingData} />;
  },
  testimonials: ({ section }) => <Testimonials section={section} />,
  faq: ({ section }) => <FAQ section={section} layout={section.layout} />,
  cta: ({ section }) => <CTA section={section} />,
  branding: ({ section }) => <Branding section={section} />,
  stats: ({ section }) => <Stats section={section} />,
};

/** Server renderer: module content remains present in the initial HTML. */
export default async function LandingRenderer({ page, locale, tools = {}, renderers = {} }: {
  page: LandingPage;
  locale: string;
  tools?: LandingToolRegistry;
  renderers?: LandingModuleRegistry;
}) {
  const modules = getLandingModules(page);
  const registry = { ...landingModuleRegistry, ...renderers };
  const toc = getLandingToc(page, modules);
  const anchors: Record<string, string> = {};
  const nodes: Record<string, ReactNode> = {};

  // Only active modules load their tool adapter (and its pricing dependencies).
  await Promise.all(modules.map(async (module) => {
    if (!Object.hasOwn(registry, module.type)) throw new Error(`Unregistered landing module: ${module.type}`);
    if (!module.tool) return;
    const tool = page.tools?.[module.tool];
    if (!tool || tool.disabled) return;
    if (!Object.hasOwn(tools, tool.type)) throw new Error(`Unregistered landing tool: ${tool.type}`);
    const id = `${module.id}-tool`;
    if (modules.some(item => item.id === id)) throw new Error(`Landing tool anchor conflicts with module: ${id}`);
    nodes[module.id] = await tools[tool.type]({ id, slot: module.tool, locale, tool });
    if (nodes[module.id]) anchors[module.tool] = id;
  }));

  const body = await Promise.all(modules.map(async (module, index) => {
    const section = { ...getModuleData(page, module), name: module.id };
    const surface = resolveModuleSurface(module, index);
    const node = await registry[module.type]({ module, section, tool: nodes[module.id], toc });
    return (
      <div
        key={module.id}
        className="landing-module-surface"
        data-landing-module={module.type}
        data-module-id={module.id}
        data-surface={surface}
      >
        {node}
      </div>
    );
  }));
  return <LandingInteractions anchors={anchors}><div data-page-type={page.page_type || "legacy"}>{body}</div></LandingInteractions>;
}
