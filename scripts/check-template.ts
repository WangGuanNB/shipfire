import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { publicMedia, resolvePublicMedia } from "../src/config/public-media";
import { getVideoPresets } from "../src/config/video-workbench";
import { getToolCatalog } from "../src/config/ai";
import { assertVariant } from "../src/ai/workbench";
import { inspectTemplateVideo, templateSha256, type TrustedTemplate } from "../src/ai/template-audio";
import { publicWorkbench } from "../src/ai/workbench";

async function main() {
  process.env.NEXT_PUBLIC_WEB_URL ||= "https://example.invalid";
  const check = (url: string) => {
    if (!url.startsWith("/")) return;
    const file = resolve("public", url.slice(1));
    if (!file.startsWith(resolve("public") + "/") || !existsSync(file)) throw new Error(`Missing local media: ${url}`);
  };
  check(publicMedia.hero.src); check(publicMedia.hero.poster); check(publicMedia.imageDemo.src);
  for (const locale of ["en", "zh"]) {
    const page = JSON.parse(readFileSync(`src/i18n/pages/landing/${locale}.json`, "utf8"));
    const visit = (value: unknown): void => {
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value)) {
        if (key === "assetId" && (typeof child !== "string" || !resolvePublicMedia(child))) throw new Error(`Unknown media ID in ${locale}: ${child}`);
        visit(child);
      }
    };
    visit(page);
    for (const module of page.modules ?? []) {
      if (!module.tool || module.disabled) continue;
      const tool = page.tools?.[module.tool];
      if (tool?.disabled || !tool?.config?.workbench) continue;
      const workbench = publicWorkbench(tool.config.workbench);
      if (!workbench?.presets.length || workbench.presets.some(preset => !preset.variants.length || preset.variants.some(variant => !variant.ready))) throw new Error(`Unready landing tool: ${locale}/${module.tool}`);
    }
  }
  const fingerprints: TrustedTemplate[] = [];
  for (const item of publicMedia.templates.filter(item => item.enabled && item.src.startsWith("/"))) {
    check(item.src); check(item.poster);
    const bytes = readFileSync(resolve("public", item.src.slice(1)));
    const info = await inspectTemplateVideo(bytes, item.durationSeconds, true);
    fingerprints.push({
      path: item.src, sha256: await templateSha256(bytes), bytes: bytes.length,
      duration: info.duration, width: info.width, height: info.height, audio: info.audio,
    });
  }
  const manifestPath = resolve("src/config/site-templates.json");
  const recorded = JSON.parse(readFileSync(manifestPath, "utf8")) as TrustedTemplate[];
  if (process.argv.includes("--update")) {
    writeFileSync(manifestPath, JSON.stringify(fingerprints, null, 2) + "\n");
  } else if (JSON.stringify(recorded) !== JSON.stringify(fingerprints)) {
    throw new Error("Template changed: run pnpm template:update to inspect and update its fingerprint before deploying.");
  }
  const models = getToolCatalog().flatMap(tool => tool.models);
  for (const preset of getVideoPresets().filter(item => item.enabled)) {
    for (const variant of preset.variants.filter(item => item.enabled)) {
      const model = models.find(item => item.id === variant.modelId && item.enabled);
      if (!model) throw new Error(`Unavailable model on ${preset.id}/${variant.id}`);
      assertVariant(variant, model);
      for (const asset of variant.operatorAssets) {
        check(asset.url);
        if (asset.kind === "video" && asset.url.startsWith("/")) await inspectTemplateVideo(readFileSync(resolve("public", asset.url.slice(1))), asset.durationSeconds!, variant.output.audio === "template");
      }
      for (const example of variant.examples) check(example.src);
    }
  }
  console.log("Template check passed: local files, durations, audio, model capabilities and retail quotes. No paid API calls.");
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
