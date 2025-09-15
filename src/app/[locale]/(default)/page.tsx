import Branding from "@/components/blocks/branding";
import CTA from "@/components/blocks/cta";
import FAQ from "@/components/blocks/faq";
import Feature from "@/components/blocks/feature";
import Feature1 from "@/components/blocks/feature1";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Hero from "@/components/blocks/hero";
import MiniaturaAIHero from "@/components/blocks/miniatura-ai-hero";
import MiniaturaAIGenerator from "@/components/blocks/miniatur-ai-generator";
import Pricing from "@/components/blocks/pricing";
import Showcase from "@/components/blocks/showcase";
import Stats from "@/components/blocks/stats";
import Testimonial from "@/components/blocks/testimonial";
import { getLandingPage } from "@/services/page";
import { getCanonicalUrl } from "@/lib/utils";
// import TestPaymentModal from '@/components/payment/test-payment-modal';



export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  const metadata: any = {
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

  return (
    <>
      {/* 原有Hero组件 -标准版 */}
      {/* {page.hero && <Hero hero={page.hero} />} */}
      
      {/* 新的Miniatur AI Hero组件-适用图片类的网站 */}
      {page.hero && <MiniaturaAIHero hero={page.hero as any} />}
      {/* <TestPaymentModal /> */}
      {/* Miniatur AI 图片生成器 */}
      <MiniaturaAIGenerator />
      {/* {page.branding && <Branding section={page.branding} />} */}
      {page.introduce && <Feature1 section={page.introduce} />}
      {page.benefit && <Feature2 section={page.benefit} />}
      {page.usage && <Feature3 section={page.usage} />}
      {page.feature && <Feature section={page.feature} />}
      {page.showcase && <Showcase section={page.showcase} />}
      {/* {page.stats && <Stats section={page.stats} />} */}
      {/* {page.pricing && <Pricing pricing={page.pricing} />} */}
      {/* {page.testimonial && <Testimonial section={page.testimonial} />} */}
      {page.faq && <FAQ section={page.faq} />}
      {page.cta && <CTA section={page.cta} />}
    </>
  );
}
