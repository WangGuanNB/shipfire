import type { CSSProperties } from "react";
export interface MediaFrameConfig {
  /** Maximum display heights, not a forced frame size. */
  desktopHeight?: number;
  mobileHeight?: number;
  /** Optional width / height hint to reserve space before metadata loads. */
  aspectRatio?: number;
  fit?: "contain" | "cover";
}

export function mediaAspectRatio(width?: number, height?: number): number | undefined {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width! <= 0 || height! <= 0) return undefined;
  const ratio = width! / height!;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : undefined;
}

/** Native dimensions win over an optional pre-load hint. */
export function intrinsicMediaFrameStyle(config?: MediaFrameConfig, defaults?: { desktop: number; mobile: number }, measuredRatio?: number): CSSProperties {
  return {
    ...mediaFrameStyle(config, defaults),
    "--media-ratio": mediaAspectRatio(measuredRatio, 1) ?? mediaAspectRatio(config?.aspectRatio, 1) ?? 1,
  } as CSSProperties;
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
