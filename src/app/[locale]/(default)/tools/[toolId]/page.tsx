import { notFound } from "next/navigation";
import { getToolCatalog } from "@/config/ai";
import { getPricingPage } from "@/services/page";
import { toolViews } from "@/components/ai/tool-views";
import { getCanonicalUrl } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; toolId: string }> }) {
  const { locale, toolId } = await params;
  const tool = getToolCatalog().find(t => t.id === toolId && t.enabled);
  if (!tool || !toolViews[toolId]) notFound();
  return { title: tool.label, alternates: { canonical: getCanonicalUrl(locale, `/tools/${toolId}`) } };
}
export default async function ToolPage({ params }: { params: Promise<{ locale: string; toolId: string }> }) {
  const { locale, toolId } = await params;
  const tool = getToolCatalog().find(t => t.id === toolId && t.enabled);
  const View = toolViews[toolId];
  if (!tool || !View) notFound();
  const pricing = await getPricingPage(locale);
  const title = locale === "zh" ? ({ "video-generator": "AI 视频生成", "reference-video": "参考视频生成" }[toolId] ?? tool.label) : tool.label;
  return <section className="container max-w-4xl py-12 md:py-20"><h1 className="mb-8 text-3xl font-semibold">{title}</h1><View models={tool.models.filter(m => m.enabled)} pricing={pricing.pricing ?? null} /></section>;
}
