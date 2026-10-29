import test from "node:test";
import assert from "node:assert/strict";
import { getVideoPresets } from "../src/config/video-workbench";
import { getToolCatalog } from "../src/config/ai";
import { assertVariant } from "../src/ai/workbench";

test("every registered variant passes preflight for both standard and fast backends", () => {
  const saved = process.env.REFERENCE_VIDEO_MODEL, savedUrl = process.env.NEXT_PUBLIC_WEB_URL;
  process.env.NEXT_PUBLIC_WEB_URL = "https://site.example.test";
  try {
    for (const selected of ["standard", "fast"]) {
      process.env.REFERENCE_VIDEO_MODEL = selected;
      const models = getToolCatalog().flatMap(tool => tool.models);
      for (const preset of getVideoPresets().filter(item => item.enabled)) {
        for (const variant of preset.variants.filter(item => item.enabled)) {
          const model = models.find(item => item.id === variant.modelId && item.enabled)!;
          assert.ok(model, `${selected}/${preset.id}/${variant.id}`);
          assert.doesNotThrow(() => assertVariant(variant, model), `${selected}/${preset.id}/${variant.id}`);
          if (selected === "fast" && variant.strategy === "video-reference") assert.ok(!variant.output.resolutions.includes("1080p"));
        }
      }
    }
  } finally {
    if (saved === undefined) delete process.env.REFERENCE_VIDEO_MODEL; else process.env.REFERENCE_VIDEO_MODEL = saved;
    if (savedUrl === undefined) delete process.env.NEXT_PUBLIC_WEB_URL; else process.env.NEXT_PUBLIC_WEB_URL = savedUrl;
  }
});

test("Fumadocs initializes distinct en/zh indexes with supported tokenizer mappings", async () => {
  const { createFromSource } = await import("fumadocs-core/search/server");
  const source = {
    _i18n: { defaultLanguage: "en", languages: ["en", "zh"] },
    getLanguages: () => [
      { language: "en", pages: [{ url: "/docs/quickstart", path: "quickstart.mdx", data: { title: "Quickstart", structuredData: { headings: [], contents: [] } } }] },
      { language: "zh", pages: [{ url: "/zh/docs/quickstart", path: "quickstart.zh.mdx", data: { title: "快速开始 Quickstart", structuredData: { headings: [], contents: [] } } }] },
    ],
  };
  const handler = createFromSource(source as never, { localeMap: { en: "english", zh: "english" } });
  for (const [locale, query, expected] of [["en", "Quickstart", "/docs/quickstart"], ["zh", "Quickstart", "/zh/docs/quickstart"]]) {
    const response = await handler.GET(new Request(`https://site.example.test/api/docs/search?locale=${locale}&query=${encodeURIComponent(query)}`));
    assert.equal(response.status, 200);
    const results = await response.json();
    assert.ok(results.length > 0, locale);
    assert.ok(JSON.stringify(results).includes(expected));
  }
});
