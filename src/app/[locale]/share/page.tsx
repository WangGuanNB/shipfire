import { Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, Sparkles, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { getBaseUrl } from '@/lib/utils';

interface SharePageProps {
  searchParams: Promise<{ image?: string }>;
}

function ShareContent({ imageUrl }: { imageUrl: string | null }) {
  if (!imageUrl) {
    return (
      <div className="container py-12">
        <div className="mx-auto max-w-2xl text-center">
          <Card>
            <CardContent className="py-12">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Wand2 className="h-8 w-8" />
              </div>
              <h1 className="mb-4 text-2xl font-bold">No Image to Share</h1>
              <p className="mb-6 text-muted-foreground">
                It looks like there's no image associated with this link.
              </p>
              <Button asChild>
                <Link href="/">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Your Own
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-4xl">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* 图片展示 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI-Generated Miniature
              </CardTitle>
              <div className="flex gap-2">
                <Badge variant="secondary">AI Generated</Badge>
                <Badge variant="outline">Miniatur AI</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
                <img
                  src={imageUrl}
                  alt="AI-generated miniature figurine"
                  className="h-full w-full object-cover"
                />
              </div>
            </CardContent>
          </Card>

          {/* 介绍和CTA */}
          <Card>
            <CardHeader>
              <CardTitle>Transform Your Photos Too!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 p-4 dark:from-blue-900/20 dark:to-purple-900/20">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    🎨 Create Amazing Miniatures with AI
                  </h3>
                  <p className="mt-2 text-sm text-blue-700 dark:text-blue-200">
                    Transform your photos into stunning collectible figurines using our advanced AI technology.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                      ✓
                    </div>
                    <div>
                      <h4 className="font-medium">100% Free to Use</h4>
                      <p className="text-sm text-muted-foreground">
                        No registration required, no hidden costs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                      ✓
                    </div>
                    <div>
                      <h4 className="font-medium">Multiple Styles</h4>
                      <p className="text-sm text-muted-foreground">
                        Realistic, anime, and cartoon figurine styles
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400">
                      ✓
                    </div>
                    <div>
                      <h4 className="font-medium">Instant Results</h4>
                      <p className="text-sm text-muted-foreground">
                        AI processing in under 10 seconds
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button asChild className="w-full" size="lg">
                  <Link href="/#generator">
                    <Wand2 className="mr-2 h-4 w-4" />
                    Create Your Miniature Now
                  </Link>
                </Button>

                <Button asChild variant="outline" className="w-full">
                  <Link href="/">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Learn More About Miniatur AI
                  </Link>
                </Button>
              </div>

              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Join <strong>12,847+</strong> creators who have already transformed{' '}
                  <strong>89,432+</strong> images into amazing miniatures!
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata({ searchParams }: SharePageProps) {
  const { image } = await searchParams;
  
  const title = "Amazing AI-Generated Miniature Figurine | Free Miniatur AI Tool";
  const description = "🎨 Incredible miniature figurine created with Miniatur AI! Transform your photos into collectible masterpieces for FREE. No signup required - Try our AI-powered miniature generator now!";
  const keywords = "AI miniature, miniature figurine, AI art, photo transformation, collectible figurine, free AI tool, miniatur AI, tilt-shift effect";
  
  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${getBaseUrl()}/share${image ? `?image=${encodeURIComponent(image)}` : ''}`,
      siteName: 'Miniatur AI',
      images: image ? [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: 'AI-generated miniature figurine created with Miniatur AI',
        }
      ] : [],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@miniaturaiapp',
      creator: '@miniaturaiapp',
      title,
      description,
      images: image ? [image] : [],
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
      canonical: `${getBaseUrl()}/share${image ? `?image=${encodeURIComponent(image)}` : ''}`,
    },
  };
}

export default async function SharePage({ searchParams }: SharePageProps) {
  const { image } = await searchParams;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/50">
      <Suspense fallback={
        <div className="container py-12">
          <div className="mx-auto max-w-2xl text-center">
            <div className="animate-pulse space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-muted"></div>
              <div className="h-8 w-64 rounded bg-muted mx-auto"></div>
              <div className="h-4 w-96 rounded bg-muted mx-auto"></div>
            </div>
          </div>
        </div>
      }>
        <ShareContent imageUrl={image || null} />
      </Suspense>
    </main>
  );
}


