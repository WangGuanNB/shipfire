import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { getLandingModules, getModuleData, getLandingToc, resolveModuleSurface } from "../src/lib/landing";
import type { LandingPage } from "../src/types/pages/landing";

const read = (path: string): LandingPage => JSON.parse(readFileSync(path, "utf8"));

test("legacy landing fields retain the old order, without enabling unused fields", () => {
  const page: LandingPage = { hero: { title: "Title" }, introduce: { title: "Intro" }, feature: { title: "Features" }, branding: { title: "Not rendered previously" }, faq: { title: "FAQ" } };
  assert.deepEqual(getLandingModules(page).map(item => item.id), ["hero", "introduce", "feature", "faq"]);
});

test("explicit module order overrides a preset and supports repeated component types", () => {
  const page: LandingPage = { page_type: "tool", sections: { first: { title: "A" }, second: { title: "B" } }, modules: [{ id: "b", type: "content", source: "second" }, { id: "a", type: "content", source: "first" }] };
  assert.deepEqual(getLandingModules(page).map(module => getModuleData(page, module)?.title), ["B", "A"]);
});

test("an explicitly empty module list does not fall back to a preset", () => {
  assert.deepEqual(getLandingModules({ page_type: "tool", hero: { title: "Hidden" }, modules: [] }), []);
});

test("missing data, disabled modules and disabled content produce no sections", () => {
  const page: LandingPage = { sections: { hidden: { disabled: true }, shown: { title: "Shown" } }, modules: [{ id: "missing", type: "content" }, { id: "hidden", type: "content" }, { id: "off", type: "content", source: "shown", disabled: true }, { id: "shown", type: "content" }] };
  assert.deepEqual(getLandingModules(page).map(item => item.id), ["shown"]);
});

test("same source may be reused with independent anchors without mutating its name", () => {
  const page: LandingPage = { sections: { content: { name: "original", title: "Reusable" } }, modules: [{ id: "one", type: "content", source: "content" }, { id: "two", type: "content", source: "content" }] };
  assert.equal(getLandingModules(page).length, 2);
  assert.equal(page.sections?.content.name, "original");
});

test("table of contents follows visible module order and removes disabled targets", () => {
  const page: LandingPage = { sections: { a: { title: "A" }, b: { title: "B" }, c: { title: "C" }, toc: { title: "Contents" } }, modules: [{ id: "toc", type: "toc" }, { id: "b", type: "content" }, { id: "a", type: "content", disabled: true }, { id: "c", type: "content", include_in_toc: false }] };
  assert.deepEqual(getLandingToc(page, getLandingModules(page)), [{ id: "b", title: "B" }]);
});

test("standalone tools need no content source and disappear when their slot is off", () => {
  const page: LandingPage = { tools: { editor: { type: "custom" } }, modules: [{ id: "editor", type: "tool", tool: "editor" }] };
  assert.equal(getLandingModules(page).length, 1);
  page.tools!.editor.disabled = true;
  assert.equal(getLandingModules(page).length, 0);
});

test("duplicate module ids and duplicate active tool mounts are rejected", () => {
  assert.throws(() => getLandingModules({ hero: { title: "A" }, modules: [{ id: "same", type: "hero", source: "hero" }, { id: "same", type: "hero", source: "hero" }] }), /unique/);
  assert.throws(() => getLandingModules({ hero: { title: "A" }, tools: { primary: { type: "custom" } }, modules: [{ id: "hero", type: "hero", tool: "primary" }, { id: "editor", type: "tool", tool: "primary" }] }), /twice/);
});

test("a disabled module does not reserve an active tool slot", () => {
  const page: LandingPage = { hero: { disabled: true }, tools: { primary: { type: "custom" } }, modules: [{ id: "hero", type: "hero", tool: "primary" }, { id: "editor", type: "tool", tool: "primary" }] };
  assert.deepEqual(getLandingModules(page).map(item => item.id), ["editor"]);
});

test("content source lookup cannot reach inherited properties", () => {
  assert.equal(getModuleData({}, { id: "bad", type: "content", source: "constructor" }), undefined);
});


test("module surfaces use explicit values and fall back to alternating bands", () => {
  assert.equal(resolveModuleSurface({ id: "a", type: "faq", surface: "alt" }, 0), "alt");
  assert.equal(resolveModuleSurface({ id: "b", type: "cta" }, 3), "emphasis");
  assert.equal(resolveModuleSurface({ id: "c", type: "faq" }, 0), "default");
  assert.equal(resolveModuleSurface({ id: "d", type: "faq" }, 1), "alt");
});

for (const locale of ["en", "zh"]) {
  test(`${locale}: shipped tool and introduction configurations have valid modules and local anchors`, () => {
    for (const path of [
      `src/i18n/pages/landing/${locale}.json`,
      `src/i18n/pages/landing/presets/introduction/${locale}.json`,
      `src/i18n/pages/image-generator/${locale}.json`,
    ]) {
      const page = read(path);
      const modules = getLandingModules(page);
      if (page.page_type === "introduction") {
        assert.equal(modules.length, 7);
      } else {
        assert.ok(modules.length >= 8, `${path} expected >= 8 modules, got ${modules.length}`);
        assert.equal(page.page_type, "tool");
        assert.ok(modules.some(module => module.id === "hero" && module.tool === "primary"));
        assert.ok(modules.some(module => module.id === "examples"));
        assert.ok(modules.some(module => module.id === "introduce"));
        assert.ok(modules.some(module => module.id === "testimonial"));
        assert.ok(modules.some(module => module.id === "cta"));
      }
      assert.equal(modules.filter(module => module.type === "hero").length, 1);
      assert.ok(page.metadata?.title);
      const anchors = new Set(modules.map(module => module.id));
      modules.filter(module => module.tool).forEach(module => anchors.add(`${module.id}-tool`));
      const rendered = [page.header, page.footer, ...modules.map(module => getModuleData(page, module))];
      function check(value: unknown): void {
        if (!value || typeof value !== "object") return;
        for (const [key, child] of Object.entries(value)) {
          if (key === "url" && typeof child === "string" && /^(\/#|#)/.test(child)) assert.ok(anchors.has(child.split("#")[1]), `Missing anchor ${child} in ${path}`);
          else check(child);
        }
      }
      rendered.forEach(check);
      if (page.page_type === "introduction") assert.ok(getLandingToc(page, modules).length >= 4);
    }
  });
}
