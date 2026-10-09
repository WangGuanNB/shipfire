import { getToolCatalog } from "@/config/ai";
import { Link } from "@/i18n/navigation";
export default async function ToolsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return <section className="container py-16"><h1 className="mb-8 text-3xl font-semibold">{locale === "zh" ? "AI 工具" : "AI tools"}</h1><div className="grid gap-6 md:grid-cols-2">
    {getToolCatalog().filter(t => t.enabled).map(t => <Link key={t.id} href={t.id === "image-generator" ? "/image-generator" : t.id === "video-generator" ? "/video-generator" : `/tools/${t.id}`} className="rounded-xl border border-border bg-card p-6 text-xl font-semibold hover:border-primary">{locale === "zh" ? ({ "image-generator": "图片生成", "video-generator": "视频生成" }[t.id] || t.label) : t.label}</Link>)}
  </div></section>;
}
