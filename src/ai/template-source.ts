import { getCloudflareContext } from "@opennextjs/cloudflare";
type AssetBinding = { fetch(url: string, init?: RequestInit): Promise<Response> };

/** Read deployed public media from the Workers ASSETS binding instead of fetching the public site. */
export async function loadTemplateVideo(value: string, timeoutMs = 15000) {
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error("Template URL must use HTTPS");
  let assets: AssetBinding | undefined;
  const siteOrigin = process.env.NEXT_PUBLIC_WEB_URL && new URL(process.env.NEXT_PUBLIC_WEB_URL).origin;
  if (url.origin === siteOrigin && url.pathname.startsWith("/video/template/")) {
    try { assets = (getCloudflareContext().env as unknown as { ASSETS?: AssetBinding }).ASSETS; }
    catch { /* Node tests and next start have no Workers context. */ }
  }
  const source = assets ? "assets-binding" : "https";
  // A Node/Next Request is not necessarily recognized by the local Workers proxy.
  // Pass the URL string so each runtime creates its own compatible Request.
  const init = { signal: AbortSignal.timeout(timeoutMs) };
  const response = assets ? await assets.fetch(url.href, init) : await fetch(url.href, init);
  if (!response.ok) throw new Error(`Template HTTP ${response.status}`);
  if (response.url && new URL(response.url).protocol !== "https:") throw new Error("Template redirect must use HTTPS");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Template response is empty");
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read(); if (done) break;
    size += value.byteLength;
    if (size > 50 * 1024 * 1024) { await reader.cancel(); throw new Error("Template exceeds 50MB"); }
    chunks.push(value);
  }
  return { bytes: Buffer.concat(chunks), source };
}
