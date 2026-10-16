import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Database from "better-sqlite3";
import { getReferenceVideoModels, getReferenceVideoPresets } from "../src/config/reference-video";
import { assertReferencePreset, mapReferenceVideoInput, publicReferencePresets, quoteReferenceCredits, validateReferenceInput } from "../src/ai/reference-video";
import { getToolCatalog } from "../src/config/ai";
import { resolveTool, validateInput } from "../src/ai/catalog";
import { createKieVideoAdapter } from "../src/ai/adapters/kie-video";
import { SubmissionRejected } from "../src/ai/types";
import type { ReferenceVideoPreset } from "../src/ai/reference-video-types";
import { moderateGenerationInput } from "../src/services/moderation/moderate-input";

function fixture(): ReferenceVideoPreset {
  return { ...getReferenceVideoPresets()[0],
    referenceVideo: { url: "https://media.example.test/owned-motion.mp4" },
    exampleVideoUrl: "https://media.example.test/display-only.mp4",
  };
}
function raw() {
  return { presetId: "duo-performance", presetVersion: "4", consent: true, resolution: "720p",
    images: [{ roleId: "right", url: "https://uploads.example.test/b.png" }, { roleId: "left", url: "https://uploads.example.test/a.png" }],
  };
}
function env(values: Record<string, string | undefined>) {
  const before = Object.fromEntries(Object.keys(values).map(k => [k, process.env[k]]));
  for (const [k, v] of Object.entries(values)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  return () => { for (const [k, v] of Object.entries(before)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } };
}
const model = getReferenceVideoModels()[0];

test("reference mode orders photos by role, snapshots server inputs and charges by output duration", () => {
  const restore = env({ R2_PUBLIC_URL: "https://uploads.example.test" });
  try {
    const input = validateReferenceInput(raw(), model, [fixture()]);
    assert.deepEqual(input.imageUrls, ["https://uploads.example.test/a.png", "https://uploads.example.test/b.png"]);
    assert.equal(input.referenceVideoUrl, "https://media.example.test/owned-motion.mp4");
    const picked = validateReferenceInput({ ...raw(), exampleId: "sample-2" }, model, [{
      ...fixture(),
      examples: [{ id: "sample-2", src: "https://media.example.test/sample-2.mp4", label: { en: "Sample 2", zh: "示例 2" } }],
    }]);
    assert.equal(picked.referenceVideoUrl, "https://media.example.test/owned-motion.mp4");
    assert.ok(!JSON.stringify(mapReferenceVideoInput(picked)).includes("sample-2"));
    assert.throws(() => validateReferenceInput({ ...raw(), exampleId: "missing" }, model, [fixture()]), /Unknown sample/);
    assert.equal(input.duration, 4);
    assert.equal(quoteReferenceCredits(input, model), Math.max(30, 4 * 1));
    const mapped = mapReferenceVideoInput(input);
    assert.deepEqual(mapped.reference_video_urls, [input.referenceVideoUrl]);
    assert.deepEqual(mapped.reference_image_urls, input.imageUrls);
    assert.ok(!("first_frame_url" in mapped));
    assert.ok(!("input_urls" in mapped));
    assert.ok(!("nsfw_checker" in mapped));
    assert.equal(mapped.generate_audio, false);
    assert.ok(!JSON.stringify(mapped).includes("display-only"));
  } finally { restore(); }
});

test("reference presets support a single subject without a fixed two-photo requirement", () => {
  const restore = env({ R2_PUBLIC_URL: "https://uploads.example.test" });
  try {
    const preset = fixture(); preset.roles = [preset.roles[0]];
    const input = validateReferenceInput({ ...raw(), images: [raw().images[1]] }, model, [preset]);
    assert.equal((input.imageUrls as string[]).length, 1);
    assert.equal(mapReferenceVideoInput({ ...input, generateAudio: true }).generate_audio, true);
  } finally { restore(); }
});

test("drafts, stale versions, invalid roles and client overrides are rejected before purchase", () => {
  const restore = env({ R2_PUBLIC_URL: "https://uploads.example.test" });
  try {
    for (const [key, value] of Object.entries({ referenceVideoUrl: "https://evil.test/x.mp4", prompt: "override", duration: 1, credits: 0, generateAudio: true, aspectRatio: "1:1" })) {
      assert.throws(() => validateReferenceInput({ ...raw(), [key]: value }, model, [fixture()]), /Unsupported reference input/);
    }
    assert.throws(() => validateReferenceInput({ ...raw(), consent: false }, model, [fixture()]), /permission/);
    assert.throws(() => validateReferenceInput({ ...raw(), presetVersion: "old" }, model, [fixture()]), /changed/);
    assert.throws(() => validateReferenceInput({ ...raw(), images: [] }, model, [fixture()]), /every role/);
    assert.throws(() => validateReferenceInput({ ...raw(), images: [raw().images[0], raw().images[0]] }, model, [fixture()]), /roles/);
    assert.throws(() => validateReferenceInput({ ...raw(), images: [raw().images[0], { roleId: "unknown", url: raw().images[1].url }] }, model, [fixture()]), /roles/);
    assert.throws(() => validateReferenceInput({ ...raw(), resolution: "4k" }, model, [fixture()]), /resolution/);
    for (const url of ["http://127.0.0.1/private", "https://evil.test/photo.jpg", "https://user:password@uploads.example.test/a.png"]) {
      assert.throws(() => validateReferenceInput({ ...raw(), images: [raw().images[0], { roleId: "left", url }] }, model, [fixture()]), /storage/);
    }
    assert.throws(() => validateReferenceInput(raw(), model, [{ ...fixture(), enabled: false }]), /not found/);
  } finally { restore(); }
});

test("configuration bounds and pricing fail closed; public presets do not expose private prompts or source clips", () => {
  const preset = fixture();
  assert.throws(() => assertReferencePreset({ ...preset, duration: 30 }, model), /configured/);
  assert.throws(() => assertReferencePreset({ ...preset, referenceVideo: { url: "" } }, model), /configured/);
  assert.throws(() => assertReferencePreset({ ...preset, roles: [...preset.roles, preset.roles[0]] }, model), /configured/);
  assert.throws(() => quoteReferenceCredits({ duration: 15, resolution: "invalid" }, model), /pricing/);
  const [view] = publicReferencePresets([model], [preset]);
  assert.equal(view.ready, true);
  assert.equal(view.credits["720p"], Math.max(30, 4 * 1));
  const json = JSON.stringify(view);
  assert.ok(!json.includes("owned-motion")); assert.ok(!json.includes("instruction")); assert.ok(!json.includes("prompt"));
  const [draft] = publicReferencePresets([model], [{ ...preset, referenceVideo: { url: "" } }]);
  assert.equal(draft.ready, false); assert.deepEqual(draft.credits, {});
});

test("site flags can expose reference-only or image-only, with matching API restrictions", () => {
  const restore = env({ AI_ENABLED_TOOLS: "reference-video", AI_VIDEO_MODES: "text,image" });
  try {
    assert.deepEqual(getToolCatalog().filter(t => t.enabled).map(t => t.id), ["reference-video"]);
    assert.throws(() => resolveTool("video-generator", "basic"), /unavailable/);
    assert.equal(resolveTool("reference-video", model.id).model.adapter, "kie-seedance2-reference");
    process.env.AI_ENABLED_TOOLS = "video-generator";
    process.env.AI_VIDEO_MODES = "image";
    const imageOnly = resolveTool("video-generator", "basic").model;
    assert.throws(() => validateInput({ mode: "text", prompt: "test" }, imageOnly), /parameters/);
    assert.throws(() => resolveTool("reference-video", model.id), /unavailable/);
    process.env.AI_VIDEO_MODES = "";
    assert.throws(() => resolveTool("video-generator", "basic"), /unavailable/);
  } finally { restore(); }
});

test("reference adapter submits the documented multimodal payload and classifies provider rejection", async () => {
  const restore = env({ KIE_API_KEY: "test-only", R2_PUBLIC_URL: "https://uploads.example.test" });
  const original = globalThis.fetch;
  try {
    const adapter = createKieVideoAdapter(mapReferenceVideoInput);
    const input = validateReferenceInput(raw(), model, [fixture()]);
    globalThis.fetch = (async (url, options) => {
      assert.equal(String(url), "https://api.kie.ai/api/v1/jobs/createTask");
      const body = JSON.parse(String(options?.body));
      assert.equal(body.model, model.providerModel);
      assert.deepEqual(body.input, mapReferenceVideoInput(input));
      return Response.json({ code: 200, data: { taskId: "mock-reference-task" } });
    }) as typeof fetch;
    assert.deepEqual(await adapter.submit(input, model, "task", "owner"), { status: "running", providerTaskId: "mock-reference-task" });
    globalThis.fetch = async () => Response.json({}, { status: 422 });
    await assert.rejects(adapter.submit(input, model, "task", "owner"), SubmissionRejected);
  } finally { globalThis.fetch = original; restore(); }
});

test("reference moderation checks every uploaded image, and enforce mode requires a key", async () => {
  const restore = env({ CONTENT_MODERATION_MODE: "enforce", SEEAPI_API_KEY: "test-only" });
  const original = globalThis.fetch;
  const checked: string[] = [];
  globalThis.fetch = (async (_url, options) => {
    const body = JSON.parse(String(options?.body));
    if (body.input?.image_url) checked.push(body.input.image_url);
    return Response.json({ id: "mock", status: "succeeded", result: { type: "json", data: { flagged: body.input?.image_url?.endsWith("b.png") ?? false } } });
  }) as typeof fetch;
  try {
    await assert.rejects(moderateGenerationInput("reference-video", { prompt: "Test", imageUrls: ["https://uploads.example.test/a.png", "https://uploads.example.test/b.png"] }), /content policy/);
    assert.equal(checked.length, 2);
    delete process.env.SEEAPI_API_KEY;
    await assert.rejects(moderateGenerationInput("reference-video", { prompt: "Test" }), /not configured/);
  } finally { globalThis.fetch = original; restore(); }
});

test("reference tasks reuse reservation, idempotency, ownership, snapshots and one-time refunds", async () => {
  const sqlite = new Database(":memory:");
  for (const name of ["0000_lonely_hydra", "0001_sparkling_bushwacker", "0002_groovy_ezekiel", "0003_ai_foundation"]) {
    sqlite.exec(readFileSync(`src/db/migrations/${name}.sql`, "utf8"));
  }
  const restore = env({
    CLOUDFLARE_D1_TOKEN: "test-only", CLOUDFLARE_ACCOUNT_ID: "test-only", CLOUDFLARE_D1_DATABASE_ID: "test-only",
    AI_ENABLED_TOOLS: "reference-video", CONTENT_MODERATION_MODE: "off",
    R2_PUBLIC_URL: "https://uploads.example.test", REFERENCE_VIDEO_URL: fixture().referenceVideo.url,
    NEXT_PUBLIC_WEB_URL: "https://media.example.test",
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url, options) => {
    assert.equal(String(url), "https://api.cloudflare.com/client/v4/accounts/test-only/d1/database/test-only/query", "No real provider or remote database calls allowed");
    const { sql, params } = JSON.parse(String(options?.body));
    const statement = sqlite.prepare(sql);
    const rows = statement.reader ? statement.all(...params) : (statement.run(...params), []);
    return Response.json({ success: true, result: [{ success: true, results: rows, meta: {} }] });
  }) as typeof fetch;
  const { clearDbCache } = await import("../src/db");
  const { adapters } = await import("../src/ai/adapters");
  const originalAdapter = adapters["kie-seedance2-reference"];
  try {
    clearDbCache();
    const { createTask, advanceTask, getTask, listTasks, publicTask } = await import("../src/ai/tasks");
    let submissions = 0;
    adapters["kie-seedance2-reference"] = {
      ...originalAdapter, checkConfiguration() {},
      async submit(input) {
        submissions++;
        assert.equal(input.referenceVideoUrl, fixture().referenceVideo.url, "In-flight tasks must use their saved preset, not the updated one");
        return { status: "running", providerTaskId: "mock-reference-job" };
      },
      async poll() { return { status: "succeeded", artifacts: [{ kind: "video", url: "https://uploads.example.test/generated.mp4" }] }; },
    };
    sqlite.prepare("INSERT INTO credits_shipfire (trans_no,user_uuid,trans_type,credits) VALUES ('grant','owner','test',1000)").run();
    const balance = () => (sqlite.prepare("SELECT SUM(credits) n FROM credits_shipfire WHERE user_uuid='owner'").get() as { n: number }).n;

    const [one, replay] = await Promise.all([
      createTask("owner", "reference-video", model.id, raw(), "reference-request-0001"),
      createTask("owner", "reference-video", model.id, raw(), "reference-request-0001"),
    ]);
    assert.equal(one.id, replay.id);
    assert.equal(one.credits, Math.max(30, 4 * 1));
    assert.equal(balance(), 970);
    await assert.rejects(createTask("empty", "reference-video", model.id, raw(), "reference-request-empty"), (e: any) => e.status === 402);
    await assert.rejects(getTask(one.id, "another-user"), /not found/);
    assert.deepEqual(await listTasks("another-user", "reference-video"), []);
    assert.ok(!JSON.stringify(publicTask(one)).includes("owned-motion"));

    process.env.REFERENCE_VIDEO_URL = "https://media.example.test/new-preset.mp4";
    await Promise.all([advanceTask(one), advanceTask(replay)]);
    assert.equal(submissions, 1);
    sqlite.prepare("UPDATE ai_tasks_shipfire SET next_poll_at=0 WHERE id=?").run(one.id);
    const done = await advanceTask(await getTask(one.id, "owner"));
    assert.equal(done.status, "succeeded");
    assert.equal(publicTask(done).artifacts[0].kind, "video");
    assert.equal(balance(), 970);

    adapters["kie-seedance2-reference"] = { ...adapters["kie-seedance2-reference"], async submit() { throw new SubmissionRejected("Provider rejected this input"); } };
    const failed = await advanceTask(await createTask("owner", "reference-video", model.id, raw(), "reference-request-0002"));
    assert.equal(failed.status, "failed");
    await advanceTask(failed);
    assert.equal(balance(), 970, "Refunded only once and never refund a successful task");
    assert.equal((await listTasks("owner", "reference-video")).length, 2);
  } finally {
    adapters["kie-seedance2-reference"] = originalAdapter;
    clearDbCache(); globalThis.fetch = originalFetch; restore(); sqlite.close();
  }
});
