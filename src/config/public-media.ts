/** One operator-owned URL for preview, model input and template audio; supports R2 HTTPS URLs. */
export function referenceMotionUrl(): string {
  return process.env.REFERENCE_VIDEO_URL?.trim() || "/video/template/template.mp4";
}

export const publicMedia = {
  hero: { kind: "video" as "video" | "image", get src() { return referenceMotionUrl(); }, poster: "/imgs/hero/preview-poster.png" },
  imageDemo: { kind: "image" as const, src: "/imgs/hero/workflow-after.png", poster: "/imgs/hero/workflow-after.png" },
  templates: [{
    id: "original", kind: "video" as const, enabled: true,
    get src() { return referenceMotionUrl(); }, poster: "/imgs/hero/preview-poster.png",
    durationSeconds: 15, title: { en: "Original", zh: "原版" },
  }],
};
/** Stable IDs let page copy change without duplicating media paths. */
export function resolvePublicMedia(id: string | undefined) {
  if (!id) return undefined;
  if (id === "hero") return publicMedia.hero;
  if (id === "image-example") return publicMedia.imageDemo;
  return publicMedia.templates.find(item => item.enabled && `template-${item.id}` === id);
}
