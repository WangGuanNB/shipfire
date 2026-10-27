import { cn } from "@/lib/utils";
import type { MediaFrameConfig } from "@/lib/media-frame";
import { squareMediaFrameStyle } from "@/lib/media-frame";

const frameClassName =
  "relative mx-auto aspect-square w-full max-w-[var(--media-mobile-size)] overflow-hidden rounded-2xl border border-border bg-muted lg:max-w-[var(--media-size)]";

type LandingMediaFrameProps = {
  config?: MediaFrameConfig;
  defaults?: { desktop: number; mobile: number };
  className?: string;
  src?: string;
  alt?: string;
};

export function LandingMediaFrame({
  config,
  defaults,
  className,
  src,
  alt = "",
}: LandingMediaFrameProps) {
  const fit = config?.fit ?? "contain";
  const objectClass = fit === "cover" ? "object-cover" : "object-contain";

  return (
    <div
      data-landing-media
      style={squareMediaFrameStyle(config, defaults)}
      className={cn(frameClassName, className)}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={cn("size-full", objectClass)}
        />
      ) : null}
    </div>
  );
}
