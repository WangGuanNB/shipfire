import Branding from "@/components/blocks/branding";
import CTA from "@/components/blocks/cta";
import FAQ from "@/components/blocks/faq";
import Feature from "@/components/blocks/feature";
import Feature1 from "@/components/blocks/feature1";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Hero from "@/components/blocks/hero";
import MiniaturaAIHero from "@/components/blocks/miniatura-ai-hero";
import FeatureWhatOne from "@/components/blocks/feature-what-one";
import Feature2WhyOne from "@/components/blocks/feature2-why-one";
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
      {/* 原有Hero组件 -标准版 ------------------------------------------------*/}
      {/* {page.hero && <Hero hero={page.hero} />} */}
      {/* 图片类的网站 */}
      {page.hero && <MiniaturaAIHero hero={page.hero as any} />}

      {/* 工具页 ------------------------------------------------*/}
      {/* <TestPaymentModal /> */}
      {/*I 图片生成器 */}
      {/* <MiniaturaAIGenerator /> */}
    

      {/* {page.branding && <Branding section={page.branding} />} */}

      {/* 介绍页，what------------------------------------------------ */}
      {/* <带图片 /> */}
      {/* {page.introduce && <Feature1 section={page.introduce} />} */}
      {/* <不带图片 /> */}
      {page.introduce && <FeatureWhatOne section={page.introduce} />}

      {/* 为什么选择页，why------------------------------------------------ */}
        {/* <带图片 /> */}
      {/* {page.benefit && <Feature2 section={page.benefit} />} */}
        {/* <不带图片 /> */}
      {page.benefit && <Feature2WhyOne section={page.benefit} />}

      {/* 使用流程页，------------------------------------------------ */}
      {page.usage && <Feature3 section={page.usage} />}


      {/* 特色功能页， ------------------------------------------------- */}
      {page.feature && <Feature section={page.feature} />}
       
      {/* 用户问答页， ------------------------------------------------- */}
      {page.faq && <FAQ section={page.faq} />}
      
      
      {/* 哈牛皮页， ------------------------------------------------- */}
      {page.cta && <CTA section={page.cta} />}

      {/* {page.showcase && <Showcase section={page.showcase} />} */}
      {/* {page.stats && <Stats section={page.stats} />} */}
      {/* {page.pricing && <Pricing pricing={page.pricing} />} */}
      {/* {page.testimonial && <Testimonial section={page.testimonial} />} */}
    
    
    </>
  );
}
