import { findPostBySlug, PostStatus } from "@/models/post";
import BlogDetail from "@/components/blocks/blog-detail";
import { Post } from "@/types/post";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}): Promise<Metadata> {
  const { slug, locale } = await params;
  const post = await findPostBySlug(slug, locale);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.title || "Blog Post",
    description: post.description || "",
    openGraph: {
      title: post.title || "Blog Post",
      description: post.description || "",
      images: post.cover_url ? [post.cover_url] : [],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug, locale } = await params;
  const post = await findPostBySlug(slug, locale);

  if (!post || post.status !== PostStatus.Online) {
    notFound();
  }

  const postData: Post = {
    uuid: post.uuid,
    slug: post.slug,
    title: post.title || undefined,
    description: post.description || undefined,
    content: post.content || undefined,
    created_at: post.created_at?.toString(),
    updated_at: post.updated_at?.toString(),
    status: post.status,
    cover_url: post.cover_url || undefined,
    author_name: post.author_name || undefined,
    author_avatar_url: post.author_avatar_url || undefined,
    locale: post.locale || undefined,
  };

  return <BlogDetail post={postData} />;
}

