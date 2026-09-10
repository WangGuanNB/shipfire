import LandingRenderer from "@/components/landing/renderer";
import { landingToolRegistry } from "@/components/landing/tools";
import { getLandingPage } from "@/services/page";
import { getCanonicalUrl } from "@/lib/utils";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateOrganizationSchema, generateWebSiteSchema } from "@/lib/schema";

// 启用 ISR（增量静态再生）：24小时重新生成一次，降低 CPU 消耗
export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getLandingPage(locale);

  const metadata: any = {
    ...(page.metadata ?? {}),
    alternates: {
      canonical: getCanonicalUrl(locale),
    },
  };

  // 只在英文版本添加 Foundr 验证 meta 标签
  if (locale === "en") {
    metadata.other = {
      "_foundr": "9a6028ae8f80618dd025c26eff1fcf8d"
    };
  }

  return metadata;
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getLandingPage(locale);

  // 生成核心 Schema
  const brandName = page.header?.brand?.title || page.footer?.brand?.title;
  const organizationSchema = generateOrganizationSchema({ name: brandName, description: page.metadata?.description });
  const websiteSchema = generateWebSiteSchema({ name: brandName, description: page.metadata?.description });

  return (
    <>
      {/* 核心 Schema：Organization + WebSite */}
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />

      <LandingRenderer page={page} locale={locale} tools={landingToolRegistry} />
    </>
  );
}
