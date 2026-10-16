"use client";

import { useEffect, useRef } from "react";

function whenPageReady(run: () => void) {
  const idle = () => {
    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => run(), { timeout: 1500 });
    } else {
      window.setTimeout(run, 300);
    }
  };
  if (document.readyState === "complete") idle();
  else window.addEventListener("load", idle, { once: true });
}

/**
 * Showcase clip. The file is not requested until the page has loaded and the
 * player is near the viewport, so it does not compete with first paint.
 */
export default function GalleryVideo({
  src,
  poster,
  label,
  className = "h-full w-full object-cover",
  play = true,
}: {
  src: string;
  poster?: string;
  label: string;
  className?: string;
  /** When false, only a preview frame is loaded once the card is visible. */
  play?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let visible = false;
    let ready = false;
    const sync = () => {
      if (!ready || !visible) {
        el.pause();
        return;
      }
      if (el.dataset.loadedSrc !== src) {
        el.src = src;
        el.dataset.loadedSrc = src;
      }
      if (play) el.play().catch(() => {});
    };
    whenPageReady(() => {
      ready = true;
      sync();
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      sync();
    }, { rootMargin: "120px 0px", threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [src, play]);

  return (
    <video
      ref={ref}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-label={label}
      className={className}
    />
  );
}
