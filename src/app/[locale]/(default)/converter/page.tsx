import { Metadata } from "next";
import ConverterClient from "./converter-client";
import { getConverterPage } from "@/services/page";
import { getCanonicalUrl } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getConverterPage(locale);

  return {
    title: page.metadata.title,
    description: page.metadata.description,
    openGraph: {
      title: page.metadata.title,
      description: page.metadata.description,
      type: "website",
      url: getCanonicalUrl(locale, '/converter'),
      siteName: "Wplace Pixel",
      images: [
        {
          url: "/logo.png",
          width: 1200,
          height: 630,
          alt: "Wplace Pixel Art Converter - Free Online Tool",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.metadata.title,
      description: page.metadata.description,
      images: ["/logo.png"],
    },
    alternates: {
      canonical: getCanonicalUrl(locale, '/converter'),
    },
  };
}

export default async function ConverterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getConverterPage(locale);
  return <ConverterClient page={page} locale={locale} />;
}