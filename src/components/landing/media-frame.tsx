"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { MediaFrameConfig } from "@/lib/media-frame";
import { intrinsicMediaFrameStyle, mediaAspectRatio } from "@/lib/media-frame";
import GalleryVideo from "./gallery-video";

type LandingMediaFrameProps = {
  config?: MediaFrameConfig;
  defaults?: { desktop: number; mobile: number };
  className?: string;
  src?: string;
  alt?: string;
  video?: string;
  poster?: string;
  badge?: string;
  /** Keep carousel slides at a stable height while their media keeps its own ratio. */
  reserveHeight?: boolean;
  /** Fixed showcase viewport: intrinsic media dimensions never size the outer box. */
  fixedViewport?: boolean;
};

export function LandingMediaFrame(props: LandingMediaFrameProps) {
  // Reset measured dimensions when the asset changes, including carousel updates.
  return <MediaFrameContent key={props.video || props.src || "empty"} {...props} />;
}

function MediaFrameContent({
  config,
  defaults,
  className,
  src,
  alt = "",
  video,
  poster,
  badge,
  reserveHeight = false,
  fixedViewport = false,
}: LandingMediaFrameProps) {
  const [ratio, setRatio] = React.useState<number>();
  const imageRef = React.useRef<HTMLImageElement>(null);
  React.useEffect(() => {
    // Cached images may finish before React attaches the load handler.
    const image = imageRef.current;
    if (image?.complete) {
      const loadedRatio = mediaAspectRatio(image.naturalWidth, image.naturalHeight);
      if (loadedRatio) setRatio(loadedRatio);
    }
  }, []);
  const fit = config?.fit ?? "contain";
  const objectClass = fit === "cover" ? "object-cover" : "object-contain";
  const measure = (width: number, height: number) => {
    const next = mediaAspectRatio(width, height);
    if (next) setRatio(next);
  };

  return (
    <div
      data-landing-media
      data-reserve-height={reserveHeight || undefined}
      data-fixed-viewport={fixedViewport || undefined}
      style={intrinsicMediaFrameStyle(config, defaults, ratio)}
      className={cn("landing-media-stage", className)}
    >
      <div className="landing-media-content">
        {video ? (
          <GalleryVideo
            src={video}
            poster={poster}
            label={alt || "Sample"}
            className={cn("block size-full", objectClass)}
            onLoadedMetadata={(event) => measure(event.currentTarget.videoWidth, event.currentTarget.videoHeight)}
          />
        ) : src ? (
          <img
            ref={imageRef}
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={cn("block size-full", objectClass)}
            onLoad={(event) => measure(event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
          />
        ) : null}
        {badge && <span className="absolute left-3 top-3 rounded-full bg-background/90 px-3 py-1 text-xs text-foreground">{badge}</span>}
      </div>
    </div>
  );
}
