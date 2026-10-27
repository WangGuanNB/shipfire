"use client";
import * as React from "react";

import type { ReactNode } from "react";
import type { Hero } from "@/types/blocks/hero";
import GalleryVideo from "@/components/landing/gallery-video";
import { ToolResultLayout } from "@/components/ai/tool-result-layout";
import { mediaFrameStyle } from "@/lib/media-frame";
import { cn } from "@/lib/utils";
import { HeroTitle } from "./title";

/** Tool-first landing shell. Media dimensions never depend on text or form height. */
export default function ToolFirstHero({ hero, children }: { hero: Hero; children?: ReactNode }) {
  const video = hero.preview?.video || hero.video?.src;
  const poster = hero.preview?.poster || hero.video?.poster;
  const image = hero.image?.src;
  const hasMedia = !!(video || image);
  const fit = hero.media_frame?.fit ?? "contain";
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
            <div data-hero-media style={mediaFrameStyle(hero.media_frame)} className="relative h-[var(--media-mobile-height)] w-full overflow-hidden rounded-2xl border border-border bg-muted lg:h-[var(--media-height)]">
              {video ? <GalleryVideo src={video} poster={poster} label={hero.preview?.caption || hero.video?.title || hero.title || "Sample"} className={cn("size-full", fit === "cover" ? "object-cover" : "object-contain")} />
                : <img src={image} alt={hero.image?.alt || hero.title || "Example"} className={cn("size-full", fit === "cover" ? "object-cover" : "object-contain")} />}
              {hero.preview?.badge && <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs text-foreground">{hero.preview.badge}</span>}
            </div>
            {hero.preview?.caption && <figcaption className="text-xs text-muted-foreground">{hero.preview.caption}</figcaption>}
          </figure>}
        </div>
      </ToolResultLayout>
    </div>
  </section>;
}
