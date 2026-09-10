import LandingRenderer from "@/components/landing/renderer";
import { landingToolRegistry } from "@/components/landing/tools";
import { getImageGeneratorPage } from "@/services/page";
import { getCanonicalUrl } from "@/lib/utils";
import type { Metadata } from "next";

export const revalidate = 86400;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getImageGeneratorPage(locale);
  const meta = page.metadata;

  if (!meta) {
    return {};
  }

  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    openGraph: {
      title: meta.title,
      description: meta.description,
      type: "website",
      url: getCanonicalUrl(locale, "/image-generator"),
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
    },
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: getCanonicalUrl(locale, "/image-generator"),
    },
  };
}

export default async function ImageGeneratorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getImageGeneratorPage(locale);

  return (
    <LandingRenderer
      page={page}
      locale={locale}
      tools={landingToolRegistry}
    />
  );
}
