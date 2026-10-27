"use client";
import * as React from "react";

import type { ReactNode } from "react";
import type { Hero } from "@/types/blocks/hero";
import { LandingMediaFrame } from "@/components/landing/media-frame";
import { ToolResultLayout } from "@/components/ai/tool-result-layout";
import { cn } from "@/lib/utils";
import { HeroTitle } from "./title";

/** Tool-first landing shell. Media dimensions never depend on text or form height. */
export default function ToolFirstHero({ hero, children }: { hero: Hero; children?: ReactNode }) {
  const video = hero.preview?.video || hero.video?.src;
  const poster = hero.preview?.poster || hero.video?.poster;
  const image = hero.image?.src;
  const hasMedia = !!(video || image);
  return <section className="px-4 pb-10 pt-24 md:pb-14 md:pt-24">
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <header className="mx-auto space-y-3 text-center">
        <HeroTitle title={hero.title} mark={hero.title_mark} />
        {hero.highlight_text && <p className="landing-hero-description mx-auto max-w-3xl">{hero.highlight_text}</p>}
        {hero.description && <p className="landing-hero-description mx-auto max-w-4xl">{hero.description.replace(/<[^>]+>/g, "")}</p>}
      </header>
      <ToolResultLayout>
        <div className={cn("grid min-w-0 items-start gap-6 lg:gap-8", hasMedia && "lg:grid-cols-2")}>
          <div className={cn("order-1 min-w-0", hasMedia && hero.media_side !== "right" ? "lg:order-2" : "lg:order-1")}>
            {children}
          </div>
          {hasMedia && <figure className={cn("order-2 min-w-0 space-y-2", hero.media_side !== "right" ? "lg:order-1" : "lg:order-2")}>
            <div data-hero-media>
              <LandingMediaFrame config={hero.media_frame} src={image} video={video} poster={poster} alt={video ? hero.preview?.caption || hero.video?.title || hero.title || "Sample" : hero.image?.alt || hero.title || "Example"} badge={hero.preview?.badge} />
            </div>
            {hero.preview?.caption && <figcaption className="text-xs text-muted-foreground">{hero.preview.caption}</figcaption>}
          </figure>}
        </div>
      </ToolResultLayout>
    </div>
  </section>;
}
