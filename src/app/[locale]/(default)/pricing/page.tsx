import Pricing from "@/components/blocks/pricing";
import { getPricingPage } from "@/services/page";
import { notFound } from 'next/navigation';  // ← 添加这行导入

export default async function PricingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  notFound();
  // const { locale } = await params;
  // const page = await getPricingPage(locale);

  // return <>{page.pricing && <Pricing pricing={page.pricing} />}</>;
}
