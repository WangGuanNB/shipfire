import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { verifyTemplateForPreflight, inspectTemplateVideo } from "../src/ai/template-audio";
import { checkTemplateHealth } from "../src/ai/template-health";
import { POST } from "../src/app/api/ai/diagnostics/template/route";
import { Storage } from "../src/lib/storage";
import { Input } from "mediabunny";
import { createKieVideoAdapter } from "../src/ai/adapters/kie-video";
import { loadTemplateVideo } from "../src/ai/template-source";
import manifest from "../src/config/site-templates.json";
import { memeDuoVideoPreset } from "../src/config/sites/meme-duo-video/preset";

const recorded = manifest[0];
const template = readFileSync(`public${recorded.path}`);

test("only the exact build-checked template skips metadata parsing; a header-only file does not", async () => {
  const info = await verifyTemplateForPreflight(template, recorded.duration);
  assert.equal(info.verifiedBy, "sha256");
  assert.equal(info.width, recorded.width);
  assert.equal(info.height, recorded.height);
  await assert.rejects(verifyTemplateForPreflight(template, recorded.duration + 3), /complete/);
  const fake = new Uint8Array(Math.max(600000, recorded.bytes));
  fake.set([0x66, 0x74, 0x79, 0x70], 4);
  await assert.rejects(verifyTemplateForPreflight(fake, recorded.duration));
});

test("diagnostics never fetch templates or contact KIE without the maintenance secret", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => { throw new Error("Unauthorized diagnostics must not fetch"); }) as typeof fetch;
  try { assert.equal((await POST(new Request("https://ship.test/api/ai/diagnostics/template/", { method: "POST" }))).status, 401); }
  finally { globalThis.fetch = original; }
});

test("Workers read same-site templates through ASSETS without a public-site subrequest", async () => {
  const context = Symbol.for("__cloudflare-context__");
  const globals = globalThis as unknown as Record<symbol, unknown>;
  const previousContext = globals[context];
  const previousUrl = process.env.NEXT_PUBLIC_WEB_URL;
  const previousFetch = globalThis.fetch;
  let assetCalls = 0;
  globals[context] = { env: { ASSETS: { fetch: async (request: Request) => {
    assert.equal(new URL(request.url).pathname, recorded.path);
    assetCalls++; return new Response(template);
  } } } };
  process.env.NEXT_PUBLIC_WEB_URL = "https://ship.example.test";
  globalThis.fetch = (async () => { throw new Error("Must not fetch the public site"); }) as typeof fetch;
  try {
    const result = await loadTemplateVideo(`https://ship.example.test${recorded.path}`);
    assert.equal(result.source, "assets-binding");
    assert.equal(assetCalls, 1);
    assert.deepEqual(result.bytes, template);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousContext === undefined) delete globals[context]; else globals[context] = previousContext;
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_WEB_URL; else process.env.NEXT_PUBLIC_WEB_URL = previousUrl;
  }
});

test("free diagnostic exercises template, soundtrack, storage read and cleanup without provider requests", async () => {
  const originalFetch = globalThis.fetch;
  const originalUpload = Storage.prototype.uploadFile;
  const originalDelete = Storage.prototype.deleteFile;
  const oldUrl = process.env.NEXT_PUBLIC_WEB_URL;
  const oldMotion = process.env.REFERENCE_VIDEO_URL;
  let uploaded: Uint8Array | undefined; let key = ""; let cleaned = "";
  process.env.NEXT_PUBLIC_WEB_URL = "https://ship.example.test";
  delete process.env.REFERENCE_VIDEO_URL;
  try {
    globalThis.fetch = (async url => {
      if (String(url) === `https://ship.example.test${recorded.path}`) return new Response(template);
      if (String(url) === "https://storage.example.test/diagnostic.mp4") return new Response(uploaded!.slice(0, 32));
      throw new Error("Unexpected network request: no provider API may be called");
    }) as typeof fetch;
    Storage.prototype.uploadFile = async options => {
      key = options.key; uploaded = new Uint8Array(options.body);
      return { url: "https://storage.example.test/diagnostic.mp4", location: "", bucket: "test", key, filename: "output.mp4" };
    };
    Storage.prototype.deleteFile = async value => { cleaned = value; };
    const result = await checkTemplateHealth(true);
    assert.equal(result.ok, true, JSON.stringify(result));
    assert.equal(result.paidGeneration, false);
    assert.deepEqual(result.checks.map(check => check.stage), ["template-fetch", "template-verify", "audio-remux", "result-verify", "storage-write", "storage-read", "storage-cleanup"]);
    assert.match(key, /^ai\/diagnostics\/[\w-]+\/output\.mp4$/);
    assert.equal(cleaned, key);
    globalThis.fetch = (async url => String(url).includes("storage.example.test") ? new Response("Error", { status: 403 }) : new Response(template)) as typeof fetch;
    const failed = await checkTemplateHealth(true);
    assert.equal(failed.ok, false);
    assert.equal(failed.checks.find(check => check.stage === "storage-read")?.ok, false);
    assert.equal(cleaned, key, "temporary file is cleaned even when reading it fails");
  } finally {
    globalThis.fetch = originalFetch; Storage.prototype.uploadFile = originalUpload; Storage.prototype.deleteFile = originalDelete;
    if (oldUrl === undefined) delete process.env.NEXT_PUBLIC_WEB_URL; else process.env.NEXT_PUBLIC_WEB_URL = oldUrl;
    if (oldMotion === undefined) delete process.env.REFERENCE_VIDEO_URL; else process.env.REFERENCE_VIDEO_URL = oldMotion;
  }
});

test("a runtime metadata failure keeps a paid provider result retrievable instead of marking it failed", async () => {
  const originalFetch = globalThis.fetch;
  const originalTrack = Input.prototype.getPrimaryVideoTrack;
  try {
    Input.prototype.getPrimaryVideoTrack = async () => { throw new TypeError("simulated runtime parser failure"); };
    globalThis.fetch = (async url => String(url).includes("recordInfo")
      ? Response.json({ code: 200, data: { state: "success", resultJson: JSON.stringify({ resultUrls: ["https://provider.example.test/result.mp4"] }) } })
      : new Response(template)) as typeof fetch;
    const adapter = createKieVideoAdapter(() => ({}));
    await assert.rejects(adapter.poll!("existing-paid-task", {
      strategy: "video-reference", generateAudio: false, referenceVideoUrl: `https://ship.example.test${recorded.path}`,
      referenceDurationSeconds: recorded.duration, duration: recorded.duration, audioMode: "template",
    }, {} as never, "local-task", "local-user"), /simulated runtime parser failure/);
  } finally { globalThis.fetch = originalFetch; Input.prototype.getPrimaryVideoTrack = originalTrack; }
});

test("old task snapshots recover source duration independently of a shorter output; explicit wrong durations still fail", async () => {
  const originalFetch = globalThis.fetch;
  const originalUpload = Storage.prototype.uploadFile;
  const rendered = readFileSync("tests/fixtures/silent-video.mp4");
  const outputInfo = await inspectTemplateVideo(rendered, undefined, false);
  let uploads = 0;
  const requests: string[] = [];
  try {
    globalThis.fetch = (async url => {
      requests.push(String(url));
      if (String(url).includes("recordInfo")) return Response.json({code:200,data:{state:"success",resultJson:JSON.stringify({resultUrls:["https://provider.example.test/existing.mp4"]})}});
      return new Response(String(url).includes("provider.example.test/existing") ? rendered : template);
    }) as typeof fetch;
    Storage.prototype.uploadFile = async options => {
      uploads++; return {url:"https://storage.example.test/result.mp4",location:"",bucket:"test",key:options.key,filename:"output.mp4"};
    };
    const adapter = createKieVideoAdapter(() => ({}));
    const old = {strategy:"video-reference",generateAudio:false,referenceVideoUrl:`https://ship.example.test${recorded.path}`,duration:outputInfo.duration};
    assert.equal((await adapter.poll!("already-paid",old,{} as never,"task","user")).status,"succeeded");
    assert.equal(uploads,1);
    const invalid = await adapter.poll!("already-paid",{...old,referenceDurationSeconds:recorded.duration+3},{} as never,"task","user");
    assert.equal(invalid.status,"failed");
    assert.equal(uploads,1,"invalid source durations must not be delivered");
    assert.ok(requests.every(url=>!url.includes("createTask")),"must reuse the paid provider task");
  } finally { globalThis.fetch=originalFetch;Storage.prototype.uploadFile=originalUpload; }
});

test("multi-template diagnostics report a broken template and continue to a silent template configured without sound", async () => {
  const originalFetch=globalThis.fetch;
  const silent=readFileSync("tests/fixtures/silent-video.mp4");
  const silentInfo=await inspectTemplateVideo(silent,undefined,false);
  const preset=memeDuoVideoPreset();
  const first=preset.variants[0];
  const source=first.operatorAssets[0];
  preset.variants=[
    {...first,id:"valid",operatorAssets:[{...source,url:"https://media.example.test/valid.mp4"}]},
    {...first,id:"broken",operatorAssets:[{...source,url:"https://media.example.test/missing.mp4"}]},
    {...first,id:"silent",output:{...first.output,audio:"off"},operatorAssets:[{...source,url:"https://media.example.test/silent.mp4",durationSeconds:silentInfo.duration}]},
    {...first,id:"disabled",enabled:false,operatorAssets:[{...source,url:"https://media.example.test/disabled.mp4"}]},
  ];
  const calls:string[]=[];
  try {
    globalThis.fetch=(async url=>{calls.push(String(url));return String(url).endsWith("missing.mp4") ? new Response("Missing",{status:404}) : new Response(String(url).endsWith("silent.mp4") ? silent : template);}) as typeof fetch;
    const result=await checkTemplateHealth(false,preset);
    assert.equal(result.ok,false);assert.equal(result.templateCount,3);
    assert.deepEqual(result.checks.filter(check=>!check.ok).map(check=>check.templateId),["broken"]);
    assert.equal(result.checks.find(check=>check.templateId==="silent"&&check.stage==="result-verify")?.ok,true);
    assert.equal(result.checks.some(check=>check.templateId==="silent"&&check.stage==="audio-remux"),false);
    assert.equal(calls.some(url=>url.includes("disabled")),false);
    assert.ok(calls.every(url=>url.startsWith("https://media.example.test/")));
  } finally {globalThis.fetch=originalFetch;}
});
