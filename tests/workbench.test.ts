import test from "node:test";
import assert from "node:assert/strict";
import { getVideoPresets } from "../src/config/video-workbench";
import { getToolCatalog } from "../src/config/ai";
import { resolveTool } from "../src/ai/catalog";
import { mapReferenceVideoInput } from "../src/ai/reference-video";
import { mapImageReferenceInput, publicWorkbench, quoteWorkbenchInput, validateWorkbenchInput } from "../src/ai/workbench";
import { buildGenerationPreview } from "../src/ai/preview";
import { moderateGenerationInput } from "../src/services/moderation/moderate-input";
import { createKieVideoAdapter } from "../src/ai/adapters/kie-video";
import type { VideoPreset } from "../src/ai/workbench-types";

function env(values: Record<string, string | undefined>) {
  const before = Object.fromEntries(Object.keys(values).map(key => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return () => {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

function photos() {
  return [
    { slotId: "right", url: "https://uploads.example.test/b.png" },
    { slotId: "left", url: "https://uploads.example.test/a.png" },
  ];
}

function imageRaw(extra: Record<string, unknown> = {}) {
  return {
    presetId: "duo-performance", presetVersion: "10", variantId: "image-reference", pricingVersion: "2",
    consent: true, resolution: "720p", images: photos(), ...extra,
  };
}

const restoreUpload = () => env({
  R2_PUBLIC_URL: "https://uploads.example.test",
  REFERENCE_VIDEO_URL: "https://media.example.test/owned-motion.mp4",
  WORKBENCH_SCENE_IMAGE_URL: undefined,
  AI_ENABLED_TOOLS: "image-generator,video-generator,reference-video",
  AI_VIDEO_MODES: "text,image",
});

test("image and video variants keep separate models, prompts, assets and prices", () => {
  const restore = restoreUpload();
  try {
    const imageModel = resolveTool("video-generator", "seedance-2-image-reference").model;
    const videoModel = resolveTool("reference-video", "seedance-2-reference").model;
    const image = validateWorkbenchInput(imageRaw(), imageModel, "video-generator");
    const video = validateWorkbenchInput({ ...imageRaw(), variantId: "video-reference", pricingVersion: "3", exampleId: "sample-2" }, videoModel, "reference-video");
    assert.equal(image.strategy, "image-reference");
    assert.equal(video.strategy, "video-reference");
    assert.equal(image.generateAudio, true);
    assert.equal(video.generateAudio, true);
    assert.deepEqual(image.imageUrls, ["https://uploads.example.test/a.png", "https://uploads.example.test/b.png"]);
    assert.equal(image.referenceVideoUrl, undefined);
    assert.equal(video.referenceVideoUrl, "https://media.example.test/owned-motion.mp4");
    assert.equal(video.displayExampleId, "sample-2");
    assert.ok(!String(image.prompt).toLowerCase().includes("reference video"));
    assert.ok(String(image.prompt).includes("orange backdrop"));
    assert.ok(String(image.prompt).includes("0-1s"));
    assert.ok(String(image.prompt).includes("Keep the two people"));
    const timed = validateWorkbenchInput(imageRaw({ duration: 8, aspectRatio: "16:9" }), imageModel, "video-generator");
    assert.equal(timed.duration, 8);
    assert.equal(timed.aspectRatio, "16:9");
    assert.equal(timed.resolution, "720p");
    assert.ok(String(timed.prompt).includes("16:9"));
    assert.ok(String(timed.prompt).includes("6-8s"));
    assert.ok(!String(timed.prompt).includes("reference_video"));
    const edited = validateWorkbenchInput(imageRaw({ prompt: "Night market", locale: "zh" }), imageModel, "video-generator");
    assert.ok(String(edited.prompt).startsWith("Night market"));
    assert.ok(String(edited.prompt).includes("Reference image 1"));
    const blank = validateWorkbenchInput(imageRaw({ prompt: "  ", locale: "zh" }), imageModel, "video-generator");
    assert.ok(String(blank.prompt).includes("纯橙色无缝背景"));
    assert.ok(String(video.prompt).includes("Reference video 1"));
    assert.ok(String(video.prompt).includes("Output settings: 4 seconds, 720p."));
    const videoTimed = validateWorkbenchInput({ ...imageRaw(), variantId: "video-reference", pricingVersion: "3", duration: 8, resolution: "480p" }, videoModel, "reference-video");
    assert.equal(videoTimed.duration, 8);
    assert.equal(videoTimed.resolution, "480p");
    assert.ok(String(videoTimed.prompt).includes("Output settings: 8 seconds, 480p."));
    assert.equal(videoTimed.referenceVideoUrl, "https://media.example.test/owned-motion.mp4");
    assert.ok(!JSON.stringify(mapImageReferenceInput(image)).includes("reference_video"));
    assert.ok(!("first_frame_url" in mapImageReferenceInput(image)));
    assert.deepEqual(mapReferenceVideoInput(video).reference_video_urls, ["https://media.example.test/owned-motion.mp4"]);
    assert.notEqual(quoteWorkbenchInput(image), quoteWorkbenchInput(video));
    assert.equal(quoteWorkbenchInput(image), Math.max(16, 4 * 5));
    const imageMapped = mapImageReferenceInput(image);
    assert.deepEqual(imageMapped.reference_image_urls, image.imageUrls);
    assert.equal(Object.hasOwn(imageMapped, "reference_video_urls"), false);
  } finally { restore(); }
});

test("operator image counts are checked before submit, including zero and too many", () => {
  const restore = env({
    R2_PUBLIC_URL: "https://uploads.example.test",
    REFERENCE_VIDEO_URL: "https://media.example.test/owned-motion.mp4",
    WORKBENCH_SCENE_IMAGE_URL: "https://cdn.example.test/scene.png",
    AI_ENABLED_TOOLS: "image-generator,video-generator,reference-video",
    AI_VIDEO_MODES: "text,image",
  });
  try {
    const model = resolveTool("video-generator", "seedance-2-image-reference").model;
    const withScene = validateWorkbenchInput(imageRaw(), model, "video-generator");
    assert.deepEqual(withScene.imageUrls, [
      "https://uploads.example.test/a.png",
      "https://uploads.example.test/b.png",
      "https://cdn.example.test/scene.png",
    ]);
    assert.ok(String(withScene.prompt).includes("Reference image 3 is scene"));
    const presets = getVideoPresets();
    const crowded = structuredClone(presets) as VideoPreset[];
    const variant = crowded[1].variants[0];
    variant.operatorAssets = [1, 2, 3].map(n => ({
      id: `scene-${n}`, kind: "image" as const, purpose: "scene" as const,
      url: `https://cdn.example.test/scene-${n}.png`, label: { en: "Scene", zh: "场景" },
    }));
    const limited = { ...model, capabilities: { ...model.capabilities, maxImages: 4 } };
    assert.throws(() => validateWorkbenchInput(imageRaw(), limited, "video-generator", crowded), /configured/);
  } finally { restore(); }
});

test("workbench rejects stale prices, forged fields, bad slots and the wrong tool", () => {
  const restore = restoreUpload();
  try {
    const imageModel = resolveTool("video-generator", "seedance-2-image-reference").model;
    const basic = resolveTool("video-generator", "basic").model;
    assert.throws(() => validateWorkbenchInput(imageRaw({ pricingVersion: "0" }), imageModel, "video-generator"), /Reload/);
    assert.throws(() => validateWorkbenchInput(imageRaw({ presetVersion: "4" }), imageModel, "video-generator"), /Reload/);
    assert.throws(() => validateWorkbenchInput(imageRaw({ referenceVideoUrl: "https://evil.test/x.mp4" }), imageModel, "video-generator"), /Unsupported workbench/);
    assert.throws(() => validateWorkbenchInput(imageRaw({ consent: false }), imageModel, "video-generator"), /permission/);
    assert.throws(() => validateWorkbenchInput(imageRaw({ images: [photos()[0]] }), imageModel, "video-generator"), /required photos/);
    assert.throws(() => validateWorkbenchInput(imageRaw({ images: [{ slotId: "left", url: photos()[0].url }, { slotId: "left", url: photos()[1].url }] }), imageModel, "video-generator"), /photo slots/);
    assert.throws(() => validateWorkbenchInput(imageRaw({ resolution: "4k" }), imageModel, "video-generator"), /resolution/);
    assert.throws(() => validateWorkbenchInput(imageRaw(), basic, "video-generator"), /Unsupported workbench/);
    assert.throws(() => validateWorkbenchInput(imageRaw(), imageModel, "reference-video"), /Unsupported workbench/);
    for (const url of ["http://127.0.0.1/private", "https://evil.test/photo.jpg"]) {
      assert.throws(() => validateWorkbenchInput(imageRaw({ images: [photos()[0], { slotId: "left", url }] }), imageModel, "video-generator"), /storage/);
    }
  } finally { restore(); }
});

test("page config can show one variant, and disabling reference video leaves photo reference usable", () => {
  const restore = restoreUpload();
  try {
    const duo = publicWorkbench("duo-image");
    assert.equal(duo?.presets.length, 1);
    assert.deepEqual(duo?.presets[0].variants.map(item => item.id), ["image-reference"]);
    const reference = publicWorkbench("duo-video");
    assert.deepEqual(reference?.presets[0].variants.map(item => item.id), ["video-reference"]);
    assert.equal(reference?.defaultVariantId, "video-reference");
    assert.equal(reference?.showPresetPicker, false);
    assert.equal(reference?.showOperatorPreview, false);
    assert.equal(reference?.presets[0].variants[0].operatorPreviews.length, 0);
    assert.equal(duo?.presets[0].variants[0].ready, true);
    assert.ok(!JSON.stringify(duo).includes("Keep the two people"));
    assert.ok(JSON.stringify(duo).includes("纯橙色无缝背景"));
    assert.ok(!JSON.stringify(duo).includes("owned-motion"));
    process.env.AI_ENABLED_TOOLS = "video-generator";
    assert.equal(resolveTool("video-generator", "seedance-2-image-reference").model.adapter, "kie-seedance2-image-reference");
    assert.throws(() => resolveTool("reference-video", "seedance-2-reference"), /unavailable/);
    const studio = publicWorkbench("studio");
    const video = studio?.presets.find(item => item.id === "duo-performance")?.variants.find(item => item.id === "video-reference");
    const photo = studio?.presets.find(item => item.id === "duo-performance")?.variants.find(item => item.id === "image-reference");
    assert.equal(video?.ready, false);
    assert.equal(photo?.ready, true);
    assert.equal(getToolCatalog().find(tool => tool.id === "video-generator")?.models.some(model => model.audience === "workbench" && model.id === "seedance-2-image-reference"), true);
  } finally { restore(); }
});

test("preview compiles the provider body without calling the provider", () => {
  const restore = restoreUpload();
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (() => { throw new Error("preview must not call the network"); }) as typeof fetch;
    const image = buildGenerationPreview("video-generator", "seedance-2-image-reference", imageRaw({ duration: 8, resolution: "480p", aspectRatio: "9:16" }));
    assert.equal(image.includesReferenceVideo, false);
    assert.equal(image.request.reference_video_urls, undefined);
    assert.equal(image.request.duration, 8);
    assert.equal(image.request.resolution, "480p");
    assert.equal(image.request.aspect_ratio, "9:16");
    assert.equal(image.request.generate_audio, true);
    assert.equal(image.credits, Math.max(16, 8 * 4));
    assert.deepEqual(image.request.reference_image_urls, ["https://uploads.example.test/a.png", "https://uploads.example.test/b.png"]);
    const video = buildGenerationPreview("reference-video", "seedance-2-reference", { ...imageRaw(), variantId: "video-reference", pricingVersion: "3", duration: 8, resolution: "480p" });
    assert.equal(video.includesReferenceVideo, true);
    assert.deepEqual(video.request.reference_video_urls, ["https://media.example.test/owned-motion.mp4"]);
    assert.equal(video.request.duration, 8);
    assert.equal(video.request.resolution, "480p");
    assert.ok(String(video.request.prompt).includes("Output settings: 8 seconds, 480p."));
    assert.equal(video.credits, 30);
  } finally { globalThis.fetch = original; restore(); }
});

test("image reference adapter omits video fields", async () => {
  const restore = env({
    KIE_API_KEY: "test-only", R2_PUBLIC_URL: "https://uploads.example.test",
    REFERENCE_VIDEO_URL: "https://media.example.test/owned-motion.mp4",
    AI_ENABLED_TOOLS: "image-generator,video-generator,reference-video", AI_VIDEO_MODES: "text,image",
  });
  const original = globalThis.fetch;
  try {
    const model = resolveTool("video-generator", "seedance-2-image-reference").model;
    const input = validateWorkbenchInput(imageRaw(), model, "video-generator");
    const adapter = createKieVideoAdapter(mapImageReferenceInput);
    globalThis.fetch = (async (_url, options) => {
      const body = JSON.parse(String(options?.body));
      assert.equal(body.model, "bytedance/seedance-2");
      assert.deepEqual(body.input.reference_image_urls, input.imageUrls);
      assert.equal(body.input.reference_video_urls, undefined);
      assert.equal(body.input.generate_audio, true);
      assert.equal(body.input.first_frame_url, undefined);
      return Response.json({ code: 200, data: { taskId: "mock-image-reference" } });
    }) as typeof fetch;
    assert.equal((await adapter.submit(input, model, "task", "owner")).status, "running");
  } finally { globalThis.fetch = original; restore(); }
});

test("meme duo video page exposes multiple motion templates with card picker", () => {
  const restore = restoreUpload();
  try {
    const page = publicWorkbench("meme-duo-video");
    assert.equal(page?.variantPicker, "modal");
    assert.equal(page?.presets.length, 1);
    assert.deepEqual(page?.presets[0].variants.map(item => item.id), [
      "template-original",
      "template-remix",
      "template-slow",
    ]);
    assert.equal(page?.defaultVariantId, "template-original");
    const videoModel = resolveTool("reference-video", "seedance-2-reference").model;
    const original = validateWorkbenchInput({
      presetId: "meme-duo-video",
      presetVersion: "1",
      variantId: "template-original",
      pricingVersion: "1",
      consent: true,
      resolution: "720p",
      duration: 4,
      images: photos(),
    }, videoModel, "reference-video");
    const remix = validateWorkbenchInput({
      presetId: "meme-duo-video",
      presetVersion: "1",
      variantId: "template-remix",
      pricingVersion: "1",
      consent: true,
      resolution: "720p",
      duration: 4,
      images: photos(),
    }, videoModel, "reference-video");
    assert.equal(original.referenceVideoUrl, "https://media.example.test/owned-motion.mp4");
    assert.equal(remix.referenceVideoUrl, "https://cdn.shipstart.net/shipfire/index/examples/example-2.mp4");
    assert.notEqual(original.referenceVideoUrl, remix.referenceVideoUrl);
    assert.equal(page?.presets[0].variants.every(item => item.strategy === "video-reference"), true);
    assert.equal(page?.presets[0].variants.every(item => item.ready), true);
  } finally { restore(); }
});

test("image reference enforce mode cannot skip review when the key is missing", async () => {
  const restore = env({ CONTENT_MODERATION_MODE: "enforce", SEEAPI_API_KEY: undefined });
  try {
    await assert.rejects(
      moderateGenerationInput("video-generator", { strategy: "image-reference", prompt: "Test", imageUrls: ["https://uploads.example.test/a.png"] }),
      /not configured/,
    );
  } finally { restore(); }
});
