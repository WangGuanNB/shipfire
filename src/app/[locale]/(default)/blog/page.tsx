import { getPostsByLocaleWithFallback } from "@/models/post";
import { Post } from "@/types/post";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const posts = await getPostsByLocaleWithFallback(locale, 1, 50);

  if (!posts || posts.length === 0) {
    return (
      <section className="w-full py-16">
        <div className="container flex flex-col items-center gap-8 lg:px-16">
          <div className="text-center">
            <h1 className="mb-3 text-pretty text-3xl font-semibold md:mb-4 md:text-4xl lg:mb-6 lg:max-w-3xl lg:text-5xl">
              Blog
            </h1>
            <p className="mb-8 text-muted-foreground md:text-base lg:max-w-2xl lg:text-lg">
              No blog posts found.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full py-16">
      <div className="container flex flex-col items-center gap-8 lg:px-16">
        <div className="text-center">
          <h1 className="mb-3 text-pretty text-3xl font-semibold md:mb-4 md:text-4xl lg:mb-6 lg:max-w-3xl lg:text-5xl">
            Blog
          </h1>
          <p className="mb-8 text-muted-foreground md:text-base lg:max-w-2xl lg:text-lg">
            Latest articles and updates
          </p>
        </div>
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map((post: Post, idx: number) => (
            <Link
              key={post.uuid || idx}
              href={`/blog/${post.slug}`}
              className="h-full"
            >
              <div className="flex flex-col h-full overflow-clip rounded-xl border border-border hover:border-primary transition-colors">
                {post.cover_url && (
                  <div className="flex-shrink-0">
                    <img
                      src={post.cover_url}
                      alt={post.title || ""}
                      className="aspect-16/9 w-full object-cover object-center"
                    />
                  </div>
                )}
                <div className="flex flex-col flex-1 px-4 py-4 md:px-4 md:py-4 lg:px-4 lg:py-4">
                  <h3 className="mb-3 text-lg font-semibold md:mb-4 md:text-xl lg:mb-6 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="mb-3 text-muted-foreground md:mb-4 lg:mb-6 flex-1 line-clamp-3">
                    {post.description}
                  </p>
                  <p className="flex items-center hover:underline text-primary mt-auto">
                    Read more
                    <ArrowRight className="ml-2 size-4" />
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

