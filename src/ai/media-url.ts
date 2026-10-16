/** Public HTTPS media URLs. Site paths are resolved against NEXT_PUBLIC_WEB_URL. */
export function resolveReferenceMediaUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("empty");
  if (trimmed.startsWith("/")) {
    const origin = new URL(process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000").origin;
    return new URL(trimmed, origin).href;
  }
  return trimmed;
}

export function httpsUrl(value: unknown): string {
  const url = new URL(String(value));
  if (url.protocol !== "https:" || url.username || url.password || url.hash ||
      url.hostname === "localhost" || url.hostname.endsWith(".local") ||
      /^[\d.]+$/.test(url.hostname) || url.hostname.includes(":")) throw new Error("Invalid media URL");
  return url.href;
}
