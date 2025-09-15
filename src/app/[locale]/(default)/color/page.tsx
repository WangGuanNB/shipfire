import { Metadata } from 'next';
import ColorConverter from './color-converter-safe';
import { Suspense } from 'react';
import { getColorPage } from "@/services/page";
import { getCanonicalUrl } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const page = await getColorPage(locale);

  return {
    title: page.metadata.title,
    description: page.metadata.description,
    keywords: page.metadata.keywords,
    openGraph: {
      title: page.metadata.title,
      description: page.metadata.description,
      type: 'website',
      siteName: 'Wplace Color Converter',
    },
    twitter: {
      card: 'summary_large_image',
      title: page.metadata.title,
      description: page.metadata.description,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: getCanonicalUrl(locale, '/color'),
    },
  };
}

export default async function ColorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getColorPage(locale);
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      {/* JSON-LD Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Wplace Color Converter",
            "description": "100% Free Wplace Color Converter tool to convert images to Wplace's official 64-color palette",
            "url": getCanonicalUrl('en', '/color'),
            "applicationCategory": "DesignApplication",
            "operatingSystem": "Web Browser",
            "permissions": "No special permissions required",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
              "description": "Completely free Wplace color conversion tool"
            },
            "featureList": [
              "Convert images to Wplace 64-color palette",
              "100% free color conversion",
              "Privacy-first processing (no server upload)",
              "Support for all image formats",
              "Real-time preview and adjustment",
              "Premium and standard color identification",
              "Professional quality pixel art conversion",
              "Unlimited image processing"
            ],
            "creator": {
              "@type": "Organization",
              "name": "Wplace Color Converter",
              "description": "Leading provider of Wplace color conversion tools"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "4.9",
              "ratingCount": "1250",
              "bestRating": "5",
              "worstRating": "1"
            },
            "review": [
              {
                "@type": "Review",
                "author": {
                  "@type": "Person",
                  "name": "Sarah Chen"
                },
                "reviewRating": {
                  "@type": "Rating",
                  "ratingValue": "5"
                },
                "reviewBody": "Best free Wplace color converter! Perfect accuracy and so easy to use."
              }
            ]
          })
        }}
      />
      
      {/* FAQ Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": [
              {
                "@type": "Question",
                "name": "Is the Wplace Color Converter completely free?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Yes, our Wplace Color Converter is 100% free to use. There are no hidden costs, subscriptions, or limits on the number of images you can convert to Wplace colors."
                }
              },
              {
                "@type": "Question", 
                "name": "How does the Wplace Color Converter work?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Simply upload your image, adjust the pixel size settings, and our converter automatically transforms it using Wplace's official 64-color palette. All processing happens in your browser for privacy."
                }
              },
              {
                "@type": "Question",
                "name": "What image formats does the Wplace Color Converter support?",
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": "Our Wplace Color Converter supports all common image formats including PNG, JPG, JPEG, and WebP. There are no size restrictions for uploaded images."
                }
              }
            ]
          })
        }}
      />
      
      <Suspense fallback={<div className="flex items-center justify-center min-h-[50vh]"><div className="text-xl">{page.loading}</div></div>}>
        <ColorConverter page={page} />
      </Suspense>
    </div>
  );
}
