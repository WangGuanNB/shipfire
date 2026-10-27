'use client';

import React, { type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import HappyUsers from "./happy-users";
import { Hero as HeroType } from "@/types/blocks/hero";
import ToolFirstHero from "./tool-first";
import Icon from "@/components/icon";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { RetroGrid } from "@/components/ui/retro-grid";
import GalleryVideo from "@/components/landing/gallery-video";
import { JeanPhilSplitHero } from "./jean-phil-split";

const heroAnimationStyles = `
@keyframes heroTextUp {
  0% { opacity: 0; transform: translateY(28px) scale(0.97); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes heroTextDown {
  0% { opacity: 0; transform: translateY(-24px) scale(0.97); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
.hero-text-up {
  animation: heroTextUp 0.85s ease forwards;
}
.hero-text-down {
  animation: heroTextDown 0.85s ease forwards;
}
`;

export default function Hero({
  hero,
  children,
}: {
  hero: HeroType;
  children?: ReactNode;
}) {
  if (hero.disabled) return null;

  const content =
    hero.variant === "jean-phil" ? (
      <JeanPhilSplitHero hero={hero}>{children}</JeanPhilSplitHero>
    ) : hero.variant === "tool" ? (
      <ToolFirstHero hero={hero}>{children}</ToolFirstHero>
    ) : hero.variant === "split" ? (
      <SplitHero hero={hero} />
    ) : hero.variant === "compact" ? (
      <CompactHero hero={hero} />
    ) : (
      <DefaultHero hero={hero} />
    );

  return (
    <div id={hero.name} className="scroll-mt-24">
      {content}
      <style jsx global>{heroAnimationStyles}</style>
    </div>
  );
}

/**
 * Product-facing hero. Its composition is selected from landing JSON rather
 * than being tied to a product name, colour, or fixed marketing copy.
 */
const heroSerif = "var(--font-serif)";

function SplitHero({ hero }: { hero: HeroType }) {
  const action = hero.buttons?.[0];
  const secondary = hero.buttons?.[1];
  const plainDescription = hero.description?.replace(/<[^>]+>/g, "");
  const offerTitle = hero.offer?.title || hero.title;
  const offerDescription = hero.offer?.description || plainDescription;
  const offerPrice = hero.offer?.price || hero.metrics?.[0];

  return (
    <section className="bg-background px-4 pb-10 pt-20 text-foreground md:pb-14 md:pt-24">
      <div className="container mx-auto max-w-6xl">
        <div className="mx-auto grid max-w-[520px] grid-cols-1 gap-6 lg:max-w-none lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12 xl:gap-16">
          <div className="order-2 space-y-6 lg:order-1">
            {hero.announcement?.label && (
              <p className="hidden items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground lg:flex">
                <span className="inline-block h-px w-6 bg-primary" aria-hidden />
                {hero.announcement.label}
              </p>
            )}

            <div className="hidden space-y-3 lg:block">
              <h1
                className="text-balance text-[2.65rem] font-normal leading-[1.12] tracking-[-0.02em] text-foreground"
                style={{ fontFamily: heroSerif }}
              >
                {hero.title}
              </h1>
              {hero.highlight_text && (
                <p className="text-2xl italic leading-snug text-foreground/80" style={{ fontFamily: heroSerif }}>
                  {hero.highlight_text}
                </p>
              )}
            </div>

            {plainDescription && (
              <p className="max-w-xl text-[15px] leading-7 text-muted-foreground sm:text-base">{plainDescription}</p>
            )}

            {(offerTitle || action) && (
              <div className="grid items-center gap-4 rounded-[1.35rem] border border-border/60 bg-card p-4 shadow-sm sm:flex sm:gap-5 sm:p-5">
                <div className="min-w-0 flex-1 space-y-1">
                  {offerTitle && (
                    <h2 className="text-base font-semibold leading-snug text-foreground sm:text-[1.05rem]">{offerTitle}</h2>
                  )}
                  {offerDescription && offerDescription !== plainDescription && (
                    <p className="text-sm leading-relaxed text-muted-foreground">{offerDescription}</p>
                  )}
                  {offerPrice && <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{offerPrice}</p>}
                </div>
                {action?.url && (
                  <Link href={action.url as never} className="sm:shrink-0">
                    <span className="inline-flex w-full items-center justify-center rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 sm:min-w-[132px] sm:py-2.5">
                      {action.title}
                    </span>
                  </Link>
                )}
              </div>
            )}

            {secondary?.url && (
              <p className="text-sm text-muted-foreground">
                <Link href={secondary.url as never} className="font-medium text-foreground underline underline-offset-2 hover:text-primary">
                  {secondary.title}
                </Link>
              </p>
            )}
          </div>

          {hero.video?.src && (
            <div className="order-1 flex w-full flex-col lg:order-2 lg:items-end">
              <div className="relative w-full overflow-hidden rounded-[1.35rem] border border-border/60 bg-muted shadow-sm max-lg:aspect-[4/5] lg:aspect-[9/16] lg:w-[340px]">
                <GalleryVideo
                  src={hero.video.src}
                  poster={hero.video.poster}
                  label={hero.video.title || hero.title || "Preview"}
                  className="absolute inset-0 h-full w-full object-cover lg:static lg:aspect-[9/16] lg:h-auto lg:max-h-[640px]"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 via-black/35 to-transparent lg:hidden" aria-hidden />
                <div className="absolute inset-x-0 bottom-0 space-y-1.5 px-5 pb-5 lg:hidden">
                  <h1
                    className="text-balance text-[1.9rem] font-normal leading-[1.12] tracking-[-0.02em] text-white drop-shadow-md"
                    style={{ fontFamily: heroSerif }}
                  >
                    {hero.title}
                  </h1>
                  {hero.highlight_text && (
                    <p className="text-lg italic leading-snug text-white/90 drop-shadow" style={{ fontFamily: heroSerif }}>
                      {hero.highlight_text}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}


function DefaultHero({ hero }: { hero: HeroType }) {
  const highlightText = hero.highlight_text;
  const texts = highlightText ? hero.title?.split(highlightText, 2) : null;

  return (
    <HeroBackdrop className="py-24">
      <div className="container max-w-5xl space-y-8 text-center">
        {hero.show_badge && (
          <div className="flex justify-center">
            <img src="/imgs/badges/phdaily.svg" alt="phdaily" className="h-10 object-cover" />
          </div>
        )}

        {hero.announcement && (
          <Link
            href={hero.announcement.url as any}
            className="hero-text-down mx-auto inline-flex items-center gap-3 rounded-full border border-border/50 bg-background/80 px-3 py-1 text-sm text-muted-foreground backdrop-blur"
          >
            {hero.announcement.label && <Badge>{hero.announcement.label}</Badge>}
            {hero.announcement.title}
          </Link>
        )}

        {texts && texts.length > 1 ? (
          <h1 className="hero-text-down mx-auto max-w-5xl text-balance text-4xl font-bold text-foreground leading-[1.3] lg:text-7xl lg:leading-[1.6]">
            {texts[0]?.split("\n").map((line, index, array) => (
              <React.Fragment key={index}>
                {line}
                {index < array.length - 1 && <br />}
              </React.Fragment>
            ))}
            <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
              {highlightText}
            </span>
            <span className="block text-3xl text-foreground/80 lg:text-6xl">
              {texts[1]?.split("\n").map((line, index, array) => (
                <React.Fragment key={index}>
                  {line}
                  {index < array.length - 1 && <br />}
                </React.Fragment>
              ))}
            </span>
          </h1>
        ) : (
          <h1 className="hero-text-down mx-auto max-w-4xl text-balance text-4xl font-bold text-foreground leading-[1.3] lg:text-7xl lg:leading-[1.6]">
            {hero.title?.split("\n").map((line, index, array) => (
              <React.Fragment key={index}>
                {line}
                {index < array.length - 1 && <br />}
              </React.Fragment>
            ))}
          </h1>
        )}

        <p
          className="hero-text-up mx-auto max-w-3xl text-2xl text-muted-foreground leading-[1.8] lg:text-3xl lg:leading-[2.0]"
          dangerouslySetInnerHTML={{ __html: hero.description || "" }}
        />

        {hero.buttons && (
          <div className="hero-text-up flex flex-wrap justify-center gap-3">
            {hero.buttons.map((item, i) => (
              <Link
                key={`${item.title}-${i}`}
                href={item.url as any}
                target={item.target || ""}
                className="flex"
              >
                <Button className="min-w-[180px]" size="lg" variant={item.variant || "default"}>
                  {item.icon && <Icon name={item.icon} className="mr-2" />}
                  {item.title}
                </Button>
              </Link>
            ))}
          </div>
        )}

        {hero.tip && (
          <p className="hero-text-up text-sm text-muted-foreground">{hero.tip}</p>
        )}

        {hero.show_happy_users && <HappyUsers />}
      </div>
    </HeroBackdrop>
  );
}

function ToolHero({
  hero,
  children,
}: {
  hero: HeroType;
  children?: ReactNode;
}) {
  const plainDescription = hero.description
    ? hero.description.replace(/<[^>]+>/g, "")
    : undefined;

  return (
    <HeroBackdrop className="min-h-0 pt-20 pb-10 md:pt-24 md:pb-14" solidBackground>
      <div className="container mx-auto max-w-6xl space-y-4 text-center md:space-y-5">
        {hero.announcement?.title && (
          <div className="hero-text-down flex justify-center">
            <Badge variant="outline" className="landing-eyebrow max-w-full flex-wrap justify-center gap-2 whitespace-normal px-3 py-1 text-center font-normal leading-5">
              {hero.announcement.label && (
                <span className="font-medium text-primary">{hero.announcement.label}</span>
              )}
              <span className="text-muted-foreground">{hero.announcement.title}</span>
            </Badge>
          </div>
        )}

        <h1 className="hero-text-down mx-auto max-w-4xl text-balance text-3xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem]">
          {hero.title}
          {hero.highlight_text && (
            <>
              <br />
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/55 bg-clip-text text-transparent">
                {hero.highlight_text}
              </span>
            </>
          )}
        </h1>

        {plainDescription && (
          <p className="hero-text-up mx-auto max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {plainDescription}
          </p>
        )}

        {hero.metrics?.length ? (
          <p className="hero-text-up text-xs text-muted-foreground sm:text-sm">
            {hero.metrics.join(" · ")}
          </p>
        ) : null}
        {hero.tip && <p className="text-sm text-muted-foreground">{hero.tip}</p>}
        {children && <div className="hero-text-up pt-1 text-left">{children}</div>}
        {hero.buttons?.length ? <div className="flex flex-wrap justify-center gap-3">{hero.buttons.filter(button => button.url).map((button, index) => <Button asChild key={index} variant={button.variant || "outline"}><Link href={button.url!} target={button.target}>{button.title}</Link></Button>)}</div> : null}
      </div>
    </HeroBackdrop>
  );
}

function CompactHero({ hero }: { hero: HeroType }) {
  const buttons = hero.buttons ?? [];

  const metrics =
    (hero.metrics && hero.metrics.length > 0
      ? hero.metrics
      : hero.tip
        ? [hero.tip]
        : []) || [];

  const plainDescription = hero.description
    ? hero.description.replace(/<[^>]+>/g, "")
    : undefined;

  return (
    <HeroBackdrop className="min-h-0 pt-28 pb-12 md:pt-36 md:pb-16">
      <div className="container mx-auto max-w-4xl space-y-5 text-center">
        {hero.announcement?.label && (
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-1 text-sm text-muted-foreground backdrop-blur">
            <Badge>{hero.announcement.label}</Badge>
            <span>{hero.announcement.title}</span>
          </div>
        )}

        <h1 className="hero-text-down text-balance text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.2]">
          {hero.title}
          {hero.highlight_text && (
            <>
              <br />
              <span className="bg-gradient-to-r from-primary via-primary/70 to-primary/50 bg-clip-text text-transparent">
                {hero.highlight_text}
              </span>
            </>
          )}
        </h1>

        {plainDescription && (
          <p className="hero-text-up mx-auto max-w-3xl text-base text-muted-foreground">
            {plainDescription}
          </p>
        )}

        {buttons.length > 0 && (
          <div className="hero-text-up flex flex-wrap justify-center gap-3">
            {buttons.slice(0, 2).map((button, index) => (
              <Link
                key={`${button.title}-${index}`}
                href={button.url as any}
                target={'target' in button && button.target ? button.target : undefined}
                className="flex"
              >
                <Button
                  size="lg"
                  variant={'variant' in button && button.variant ? button.variant : (index === 0 ? "default" : "secondary")}
                  className="min-w-[160px]"
                >
                  {'icon' in button && button.icon && <Icon name={button.icon} className="mr-2" />}
                  {button.title}
                </Button>
              </Link>
            ))}
          </div>
        )}

        {metrics.length > 0 && (
          <p className="hero-text-up text-xs uppercase tracking-[0.35em] text-muted-foreground">
            {metrics.map((item, index) => (
              <React.Fragment key={`${item}-${index}`}>
                {index > 0 && <span className="px-1">•</span>}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </p>
        )}

        {hero.show_happy_users && <HappyUsers />}
      </div>
    </HeroBackdrop>
  );
}

function HeroBackdrop({
  children,
  className,
  solidBackground = false,
}: {
  children: ReactNode;
  className?: string;
  /** When true, use solid background without RetroGrid pattern (e.g. for tool hero) */
  solidBackground?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex w-full items-center justify-center overflow-hidden px-4 text-foreground",
        !className?.includes("min-h-") && "min-h-[860px]",
        solidBackground ? "bg-background" : "bg-transparent",
        className,
      )}
    >
      {!solidBackground && (
        <div className="pointer-events-none absolute inset-0">
          <RetroGrid className="opacity-60 dark:opacity-75" angle={60} />
        </div>
      )}

      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}
