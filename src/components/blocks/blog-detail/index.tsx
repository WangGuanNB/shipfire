"use client";

import { Avatar, AvatarImage } from "@/components/ui/avatar";

import Crumb from "./crumb";
import Markdown from "@/components/markdown";
import { Post } from "@/types/post";
import moment from "moment";
import { Card } from "@/components/ui/card";

export default function BlogDetail({ post }: { post: Post }) {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Crumb post={post} />
          <h1 className="mb-7 mt-9 text-2xl font-bold md:mb-10 md:text-4xl text-center">
            {post.title}
          </h1>
          <div className="flex items-center justify-center gap-3 text-sm md:text-base bg-background mb-8">
            {post.author_avatar_url && (
              <Avatar className="h-8 w-8 border">
                <AvatarImage
                  src={post.author_avatar_url}
                  alt={post.author_name}
                />
              </Avatar>
            )}
            <div>
              {post.author_name && (
                <span className="font-medium">{post.author_name}</span>
              )}

              <span className="ml-2 text-muted-foreground">
                on {post.created_at && moment(post.created_at).fromNow()}
              </span>
            </div>
          </div>
          {post.content && (
            <Card className="px-6 py-8">
              <Markdown content={post.content} />
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
