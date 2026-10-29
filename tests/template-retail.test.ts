import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { memeDuoVideoPreset } from "../src/config/sites/meme-duo-video/preset";
import { getReferenceVideoModels } from "../src/config/reference-video";
import { quoteVariantRetail, quoteWorkbenchInput, validateWorkbenchInput } from "../src/ai/workbench";
import { getNewUserCredits } from "../src/services/config";

test("template prices are fixed at 100/200, independent of output or reference duration", () => {
  const variant = memeDuoVideoPreset().variants[0];
  assert.deepEqual(variant.output.resolutions, ["480p", "720p"]);
  assert.equal(variant.output.resolution, "480p");
  for (const seconds of [4, 10, 15]) {
    const changed = { ...variant, operatorAssets: variant.operatorAssets.map(asset => ({ ...asset, durationSeconds: seconds })) };
    assert.equal(quoteVariantRetail(changed, "480p", seconds), 100);
    assert.equal(quoteVariantRetail(changed, "720p", seconds), 200);
  }
  for (const resolution of ["1080p", "", "invalid"]) assert.throws(() => quoteVariantRetail(variant, resolution, 15));
  for (const credits of [0, -1, 1.5, NaN, Infinity]) {
    assert.throws(() => quoteVariantRetail({ ...variant, retailPricing: { ...variant.retailPricing, perGeneration: { "480p": credits } } }, "480p", 15));
  }
});

test("both template resolutions compile and server rejects stale or forged prices", () => {
  const saved = process.env.R2_PUBLIC_URL;
  const savedMotion = process.env.REFERENCE_VIDEO_URL;
  process.env.R2_PUBLIC_URL = "https://uploads.example.test";
  process.env.REFERENCE_VIDEO_URL = "https://media.example.test/owned-motion.mp4";
  try {
    const preset = memeDuoVideoPreset();
    const variant = preset.variants[0];
    const model = getReferenceVideoModels().find(item => item.id === variant.modelId)!;
    const raw = { presetId: preset.id, presetVersion: preset.version, variantId: variant.id, pricingVersion: variant.pricingVersion,
      consent: true, images: variant.inputSlots.map(slot => ({ slotId: slot.id, url: `https://uploads.example.test/${slot.id}.png` })) };
    for (const [resolution, credits] of [["480p", 100], ["720p", 200]] as const) {
      const compiled = validateWorkbenchInput({ ...raw, resolution }, model, "reference-video", [preset]);
      assert.equal(compiled.resolution, resolution);
      assert.equal(quoteWorkbenchInput(compiled, [preset]), credits);
      assert.equal(compiled.audioMode, "template");
      assert.equal(compiled.generateAudio, false);
      assert.throws(() => quoteWorkbenchInput({ ...compiled, quotedCredits: 20 }, [preset]), /pricing/);
    }
    assert.throws(() => validateWorkbenchInput({ ...raw, pricingVersion: "2" }, model, "reference-video", [preset]));
    assert.throws(() => validateWorkbenchInput({ ...raw, resolution: "1080p" }, model, "reference-video", [preset]));
  } finally {
    if (saved === undefined) delete process.env.R2_PUBLIC_URL;
    else process.env.R2_PUBLIC_URL = saved;
    if (savedMotion === undefined) delete process.env.REFERENCE_VIDEO_URL;
    else process.env.REFERENCE_VIDEO_URL = savedMotion;
  }
});

test("localized packs agree on checkout amounts, balances and shared redemption", () => {
  const pages = ["en", "zh"].map(locale => JSON.parse(readFileSync(`src/i18n/pages/pricing/${locale}.json`, "utf8")));
  for (const page of pages) {
    const items = page.pricing.items;
    assert.equal(new Set(items.map((item: any) => item.product_id)).size, items.length);
    assert.equal(items.find((item: any) => item.product_id === "starter").amount, 699);
    assert.equal(items.find((item: any) => item.product_id === "starter").credits, 100);
    const hd = items.find((item: any) => item.product_id === "hd");
    assert.equal(hd.amount, 999);
    assert.equal(hd.credits, 200);
    assert.equal(hd.credits / 100, 2);
    assert.equal(hd.credits / 200, 1);
    assert.equal(items.filter((item: any) => item.is_featured).length, 1);
    assert.equal(hd.is_featured, true);
    assert.deepEqual(items.map((item: any) => item.valid_months), [12, 12, 12, 12]);
  }
  const checkoutFields = (page: any) => page.pricing.items.map(({ product_id, amount, credits, currency, cn_amount }: any) => ({ product_id, amount, credits, currency, cn_amount }));
  assert.deepEqual(checkoutFields(pages[0]), checkoutFields(pages[1]));
});

test("20 signup credits remain below both template generation prices", () => {
  const saved = process.env.NEW_USER_CREDITS;
  delete process.env.NEW_USER_CREDITS;
  try {
    assert.equal(getNewUserCredits(), 20);
    const variant = memeDuoVideoPreset().variants[0];
    for (const resolution of variant.output.resolutions) assert.ok(getNewUserCredits() < quoteVariantRetail(variant, resolution, variant.output.duration));
    assert.equal(100 + getNewUserCredits() - quoteVariantRetail(variant, "480p", 15), 20);
    assert.equal(200 + getNewUserCredits() - quoteVariantRetail(variant, "720p", 15), 20);
  } finally {
    if (saved === undefined) delete process.env.NEW_USER_CREDITS;
    else process.env.NEW_USER_CREDITS = saved;
  }
});
