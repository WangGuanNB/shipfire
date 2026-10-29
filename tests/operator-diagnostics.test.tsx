import * as React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { canUseAiDiagnostics } from "../src/lib/ai-diagnostics-access";
import { handleAiDiagnostics } from "../src/ai/diagnostics";
import { adapters } from "../src/ai/adapters";
import { memeDuoVideoPreset } from "../src/config/sites/meme-duo-video/preset";
import { getVideoPresets } from "../src/config/video-workbench";
import { Storage } from "../src/lib/storage";
import OperatorDiagnostics from "../src/components/ai/operator-diagnostics";

const owner = { email: "banner520521@gmail.com" };
function environment(values: Record<string, string | undefined>) {
  const before = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) value === undefined ? delete process.env[key] : process.env[key] = value;
  return () => { for (const [key, value] of Object.entries(before)) value === undefined ? delete process.env[key] : process.env[key] = value; };
}
function request(body: unknown) {
  return new Request("https://site.example.test/api/ai/diagnostics/operator", { method: "POST", headers: { "Content-Type": "application/json", "X-AI-Diagnostics": "1" }, body: JSON.stringify(body) });
}
function templateInput() {
  const preset = memeDuoVideoPreset();
  const variant = preset.variants[0];
  return { preset, variant, input: {
    presetId: preset.id, presetVersion: preset.version, variantId: variant.id, pricingVersion: variant.pricingVersion,
    consent: true, resolution: "720p", images: variant.inputSlots.map(slot => ({ slotId: slot.id, url: `https://uploads.example.test/${slot.id}.png` })),
  } };
}

test("diagnostic access is explicit, case-normalized and independent from general admin access", () => {
  const restore = environment({ AI_DIAGNOSTICS_EMAILS: undefined, ADMIN_EMAILS: owner.email });
  try {
    assert.equal(canUseAiDiagnostics(owner.email), false);
    process.env.AI_DIAGNOSTICS_EMAILS = ` ${owner.email} `;
    assert.equal(canUseAiDiagnostics(" BANNER520521@GMAIL.COM "), true);
    for (const email of [undefined, "", "another@example.test", "banner520521@gmail.com.attacker.test"]) assert.equal(canUseAiDiagnostics(email), false);
    process.env.AI_DIAGNOSTICS_EMAILS = "";
    assert.equal(canUseAiDiagnostics(owner.email), false);
  } finally { restore(); }
});

test("anonymous and other accounts cannot trigger any checks, even with forged body flags", async () => {
  const restore = environment({ AI_DIAGNOSTICS_EMAILS: owner.email });
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("Forbidden requests must never fetch"); }) as typeof fetch;
  try {
    for (const actor of [undefined, { email: "another@example.test" }]) {
      const response = await handleAiDiagnostics(request({ action: "template", checkStorage: true, email: owner.email, can_test_ai: true }), actor);
      assert.equal(response.status, 403);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
    const missingHeader = new Request("https://site.test", { method: "POST", body: "{}" });
    assert.equal((await handleAiDiagnostics(missingHeader, owner)).status, 400);
    assert.equal((await handleAiDiagnostics(request({ action: "generate" }), owner)).status, 400);
    assert.equal((await handleAiDiagnostics(request({ action: "template", presetId: "forged", variantId: "forged", url: "http://127.0.0.1" }), owner)).status, 400);
  } finally { globalThis.fetch = original; restore(); }
});

test("request diagnostics compile actual prices and read images, but never submit, poll or reserve credits", async () => {
  const restore = environment({ AI_DIAGNOSTICS_EMAILS: owner.email, R2_PUBLIC_URL: "https://uploads.example.test", NEXT_PUBLIC_WEB_URL: "https://site.example.test", REFERENCE_VIDEO_URL: undefined, KIE_API_KEY: "test-only-not-used" });
  const originalFetch = globalThis.fetch;
  const adapter = adapters["kie-seedance2-reference"];
  const originalSubmit = adapter.submit, originalPoll = adapter.poll;
  adapter.submit = async () => { throw new Error("Must never submit"); };
  adapter.poll = async () => { throw new Error("Must never poll"); };
  const seen: string[] = [];
  const { variant, input } = templateInput();
  const path = variant.operatorAssets.find(asset => asset.kind === "video")!.url;
  const template = readFileSync(`public${path}`);
  globalThis.fetch = (async (url, options) => {
    const value = String(url); seen.push(value);
    if (value === `https://site.example.test${path}`) return new Response(template);
    assert.ok(value.startsWith("https://uploads.example.test/"), "Only validated image storage URLs may be read; no Kie or database HTTP");
    assert.equal(options?.redirect, "manual");
    assert.equal(options?.cache, undefined, "The production Workers compatibility date does not support RequestInit.cache");
    assert.equal(new Headers(options?.headers).get("Cache-Control"), "no-store");
    return new Response(new Uint8Array([137,80,78,71,13,10,26,10]), { headers: { "Content-Type": "image/png" } });
  }) as typeof fetch;
  try {
    const body = { action: "request", toolId: variant.toolId, modelId: variant.modelId, input };
    const response = await handleAiDiagnostics(request(body), owner);
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.equal(result.ok, true);
    assert.equal(result.credits, 200);
    assert.equal(result.providerConfigured, true);
    for (const field of ["charged", "providerCalled", "taskCreated"]) assert.equal(result[field], false);
    assert.equal(result.checks.length, input.images.length + 3);
    assert.ok(result.checks.some((check: { stage: string; ok: boolean }) => check.stage === "template-preflight" && check.ok));
    assert.deepEqual(result.request.reference_image_urls, input.images.map(image => image.url));
    assert.equal(seen.length, input.images.length + 1);
    delete process.env.KIE_API_KEY;
    const missingKey = await (await handleAiDiagnostics(request(body), owner)).json();
    assert.equal(missingKey.ok, false, "Missing provider configuration must not give a green result");
    assert.equal(missingKey.providerCalled, false);
    process.env.KIE_API_KEY = "test-only-not-used";
    seen.length = 0;
    const forged = await handleAiDiagnostics(request({ ...body, input: { ...input, images: input.images.map(image => ({ ...image, url: "https://evil.example.test/private" })) } }), owner);
    assert.equal(forged.status, 400);
    assert.equal(seen.length, 0, "Invalid origins are rejected before fetching");
    globalThis.fetch = (async () => new Response("Access denied", { headers: { "Content-Type": "text/html" } })) as typeof fetch;
    const unreadable = await (await handleAiDiagnostics(request(body), owner)).json();
    assert.equal(unreadable.ok, false);
    assert.ok(unreadable.checks.filter((check: { stage: string }) => check.stage.startsWith("image-")).every((check: { ok: boolean }) => !check.ok));
    assert.equal(unreadable.checks.find((check: { stage: string }) => check.stage === "template-preflight").ok, false);
    assert.equal(unreadable.providerCalled, false);
  } finally {
    globalThis.fetch = originalFetch; adapter.submit = originalSubmit; adapter.poll = originalPoll; restore();
  }
});

test("image redirects are rejected without following them or calling a provider", async () => {
  const restore = environment({ AI_DIAGNOSTICS_EMAILS: owner.email, R2_PUBLIC_URL: "https://uploads.example.test", KIE_API_KEY: "test-only-not-used" });
  const originalFetch = globalThis.fetch;
  const seen: string[] = [];
  globalThis.fetch = (async (url, options) => {
    assert.equal(options?.redirect, "manual", "Workers must never receive redirect: error");
    assert.ok(String(url).startsWith("https://uploads.example.test/"));
    seen.push(String(url));
    return new Response(null, { status: 302, headers: { Location: "https://untrusted.example.test/image.png" } });
  }) as typeof fetch;
  try {
    const preset = getVideoPresets().find(item => item.variants.some(variant => variant.strategy === "image-reference"))!;
    const variant = preset.variants.find(item => item.strategy === "image-reference")!;
    const input = { presetId: preset.id, presetVersion: preset.version, variantId: variant.id, pricingVersion: variant.pricingVersion, consent: true,
      images: variant.inputSlots.map(slot => ({ slotId: slot.id, url: `https://uploads.example.test/${slot.id}.png` })) };
    const result = await (await handleAiDiagnostics(request({ action: "request", toolId: variant.toolId, modelId: variant.modelId, input }), owner)).json();
    assert.equal(result.ok, false);
    assert.equal(seen.length, input.images.length);
    const images = result.checks.filter((check: { stage: string }) => check.stage.startsWith("image-"));
    assert.equal(images.length, input.images.length);
    assert.ok(images.every((check: { ok: boolean; error: string }) => !check.ok && /redirects \(HTTP 302\)/.test(check.error)));
    for (const field of ["charged", "providerCalled", "taskCreated"]) assert.equal(result[field], false);
  } finally { globalThis.fetch = originalFetch; restore(); }
});

test("template failures are reported by the same preflight as generation, without any storage writes", async () => {
  const restore = environment({ AI_DIAGNOSTICS_EMAILS: owner.email, R2_PUBLIC_URL: "https://uploads.example.test", NEXT_PUBLIC_WEB_URL: "https://site.example.test", REFERENCE_VIDEO_URL: undefined, KIE_API_KEY: "test-only-not-used" });
  const originalFetch = globalThis.fetch, originalUpload = Storage.prototype.uploadFile, originalDelete = Storage.prototype.deleteFile;
  let fetches = 0, writes = 0;
  globalThis.fetch = (async url => {
    fetches++;
    if (String(url).startsWith("https://uploads.example.test/")) return new Response("image", { headers: { "Content-Type": "image/png" } });
    if (String(url).startsWith("https://site.example.test/video/template/")) return new Response("Missing", { status: 404 });
    throw new Error("Unexpected fetch: Kie and database requests are forbidden");
  }) as typeof fetch;
  Storage.prototype.uploadFile = async () => { writes++; throw new Error("Diagnostics must not write storage"); };
  Storage.prototype.deleteFile = async () => { writes++; throw new Error("Diagnostics must not delete storage"); };
  try {
    const { variant, input } = templateInput();
    const failed = await (await handleAiDiagnostics(request({ action: "request", toolId: variant.toolId, modelId: variant.modelId, input, checkStorage: true }), owner)).json();
    assert.equal(failed.ok, false);
    assert.match(failed.checks.find((check: { stage: string }) => check.stage === "template-preflight").error, /Template HTTP 404/);
    for (const field of ["charged", "providerCalled", "taskCreated"]) assert.equal(failed[field], false);
    const callsBefore = fetches;
    const retired = await handleAiDiagnostics(request({ action: "template", presetId: input.presetId, variantId: variant.id, checkStorage: true }), owner);
    assert.equal(retired.status, 400, "The operator endpoint no longer offers standalone template/storage actions");
    assert.equal(fetches, callsBefore);
    assert.equal(writes, 0);
  } finally { globalThis.fetch = originalFetch; Storage.prototype.uploadFile = originalUpload; Storage.prototype.deleteFile = originalDelete; restore(); }
});

test("photo-only precheck never reads or requires a reference video", async () => {
  const restore = environment({ AI_DIAGNOSTICS_EMAILS: owner.email, R2_PUBLIC_URL: "https://uploads.example.test", WORKBENCH_SCENE_IMAGE_URL: undefined, AI_ENABLED_TOOLS: "video-generator,reference-video", KIE_API_KEY: "test-only-not-used" });
  const originalFetch = globalThis.fetch;
  let reads = 0;
  globalThis.fetch = (async url => {
    assert.ok(String(url).startsWith("https://uploads.example.test/"), "Photo mode must not fetch a video or call Kie");
    reads++; return new Response("image", { headers: { "Content-Type": "image/png" } });
  }) as typeof fetch;
  try {
    const preset = getVideoPresets().find(item => item.variants.some(variant => variant.strategy === "image-reference"))!;
    const variant = preset.variants.find(item => item.strategy === "image-reference")!;
    const input = { presetId: preset.id, presetVersion: preset.version, variantId: variant.id, pricingVersion: variant.pricingVersion, consent: true,
      images: variant.inputSlots.map(slot => ({ slotId: slot.id, url: `https://uploads.example.test/${slot.id}.png` })) };
    const result = await (await handleAiDiagnostics(request({ action: "request", toolId: variant.toolId, modelId: variant.modelId, input }), owner)).json();
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.includesReferenceVideo, false);
    assert.equal(reads, input.images.length);
    assert.equal(result.checks.some((check: { stage: string }) => check.stage === "template-preflight"), false);
  } finally { globalThis.fetch = originalFetch; restore(); }
});

test("the panel has one pre-generation button, no storage checkbox and no balance requirement", () => {
  const html = renderToStaticMarkup(<OperatorDiagnostics toolId="reference-video" modelId="test" input={null} disabled={false} onBusyChange={() => {}} />);
  assert.match(html, /不调用 Kie \/ 不扣积分/);
  assert.match(html, /检查生成前流程/);
  assert.match(html, /无需充值/);
  assert.equal((html.match(/<button\b/g) || []).length, 1);
  assert.doesNotMatch(html, /type="checkbox"|检查模板视频|检查当前请求|检查模板及视频存储/);
});
