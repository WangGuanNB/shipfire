import Branding from "@/components/blocks/branding";
import CTA from "@/components/blocks/cta";
import FAQ from "@/components/blocks/faq";
import Feature from "@/components/blocks/feature";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Hero from "@/components/blocks/hero";
import MiniaturaAIHero from "@/components/blocks/miniatura-ai-hero";
import FeatureWhatOne from "@/components/blocks/feature-what-one";
import Feature2WhyOne from "@/components/blocks/feature2-why-one";
import FeatureWhatTwo from "@/components/blocks/feature-what-two";
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
      {/* Hero Section：一句主标题 + 一句副标题 + 一段简短价值描述 + CTA按钮文字-----------*/}
      {page.hero && <Hero hero={page.hero}/> }
      {/* 图片类的网站 */}
      {/* {page.hero && <MiniaturaAIHero hero={page.hero as any} />} */}

      {/* 工具页 ------------------------------------------------*/}
      {/* <TestPaymentModal /> */}
      {/*I 图片生成器 */}
      {/* <MiniaturaAIGenerator /> */}
    

      {/* {page.branding && <Branding section={page.branding} />} */}


      {/* What is [Tool Name]：定义该工具是什么，主要解决哪些痛点（含主关键词）----------- */}
      {/* 工具站<带图片>*/}
        {page.introduce && <FeatureWhatTwo section={page.introduce} />}
      {/* <不带图片 /> */}
      {/* {page.introduce && <FeatureWhatOne section={page.introduce} />} */}


      {/* ，Why Choose [Tool Name]：列出3~4个理由，说明与其他工具的差异------ */}
        {/* <带图片 /> */}
       {page.benefit && <Feature2 section={page.benefit} />} 
        {/* { <不带图片 /> } */}
       {/* {page.benefit && <Feature2WhyOne section={page.benefit} />} */}


      {/* How to Use [Tool Name]：用3个步骤说明使用流程------------ */}
      {page.usage && <Feature3 section={page.usage} />}


      {/*Key Features：列出4~6个主要功能（每个30~50字）- */}
      {page.feature && <Feature section={page.feature} />}

      {/* Testimonials / People Love：展示2~3条用户好评或社会信任信息 */}  
      {page.testimonial && <Testimonial section={page.testimonial} />}
       
      {/* FAQ（Frequently Asked Questions）：3~5个问题+简短回答，每个回答≤80字- */}
      {page.faq && <FAQ section={page.faq} />}
      
      {/*Footer：收尾文案 + 品牌词 + CTA（鼓励立即使用）-- */}
      {page.cta && <CTA section={page.cta} />}
      
      {/* {page.showcase && <Showcase section={page.showcase} />} */}
      {/* {page.stats && <Stats section={page.stats} />} */}
      {/* {page.pricing && <Pricing pricing={page.pricing} />} */}
    
    
    
    </>
  );
}
