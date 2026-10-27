/** Operator-owned assets ship in public/. User uploads and generated artifacts still use storage. */
export const publicMedia = {
  hero: { kind: "video" as "video" | "image", src: "/video/template/template.mp4", poster: "/imgs/hero/preview-poster.png" },
  imageDemo: { kind: "image" as const, src: "/imgs/hero/workflow-after.png", poster: "/imgs/hero/workflow-after.png" },
  templates: [{
    id: "original", kind: "video" as const, enabled: true,
    src: "/video/template/template.mp4", poster: "/imgs/hero/preview-poster.png",
    durationSeconds: 15, title: { en: "Original", zh: "原版" },
  }],
};
export function referenceMotionUrl(): string {
  return process.env.REFERENCE_VIDEO_URL?.trim() || publicMedia.templates[0].src;
}

/** Stable IDs let page copy change without duplicating media paths. */
export function resolvePublicMedia(id: string | undefined) {
  if (!id) return undefined;
  if (id === "hero") return publicMedia.hero;
  if (id === "image-example") return publicMedia.imageDemo;
  return publicMedia.templates.find(item => item.enabled && `template-${item.id}` === id);
}
