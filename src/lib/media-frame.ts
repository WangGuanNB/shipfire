import type { CSSProperties } from "react";
export interface MediaFrameConfig {
  desktopHeight?: number;
  mobileHeight?: number;
  fit?: "contain" | "cover";
}
/** Media height is independent of adjacent text and form length. */
export function mediaFrameStyle(config: MediaFrameConfig | undefined, defaults = { desktop: 480, mobile: 280 }): CSSProperties {
  const height = (value: number | undefined, fallback: number) => Number.isFinite(value) && value! >= 120 && value! <= 960 ? value! : fallback;
  return { "--media-height": `${height(config?.desktopHeight, defaults.desktop)}px`, "--media-mobile-height": `${height(config?.mobileHeight, defaults.mobile)}px` } as CSSProperties;
}

/** 1:1 frame; desktopHeight / mobileHeight set the square edge length in px. */
export function squareMediaFrameStyle(config: MediaFrameConfig | undefined, defaults = { desktop: 480, mobile: 280 }): CSSProperties {
  const size = (value: number | undefined, fallback: number) => Number.isFinite(value) && value! >= 120 && value! <= 960 ? value! : fallback;
  return {
    "--media-size": `${size(config?.desktopHeight, defaults.desktop)}px`,
    "--media-mobile-size": `${size(config?.mobileHeight, defaults.mobile)}px`,
  } as CSSProperties;
}
