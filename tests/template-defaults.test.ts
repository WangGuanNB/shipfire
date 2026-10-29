import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { publicMedia, referenceMotionUrl, resolvePublicMedia } from "../src/config/public-media";
import { createVideoTemplateVariant } from "../src/config/sites/shared/video-template";
import { validateWorkbenchInput, quoteWorkbenchInput } from "../src/ai/workbench";
import { getReferenceVideoModels, referenceSampleCatalog } from "../src/config/reference-video";
import { getVideoPresets } from "../src/config/video-workbench";
import { createKieVideoAdapter } from "../src/ai/adapters/kie-video";
import { mapReferenceVideoInput } from "../src/ai/reference-video";
import { mediaFrameStyle } from "../src/lib/media-frame";
import { stripeConfigurationReady } from "../src/lib/payment-readiness";
import { getEnabledPaymentMethods } from "../src/services/payment-selector";

test("default templates are real files; media sizing is bounded and independent of text", () => {
  const previous = process.env.REFERENCE_VIDEO_URL;
  delete process.env.REFERENCE_VIDEO_URL;
  try {
    for (const item of publicMedia.templates.filter(item => item.enabled)) {
      assert.ok(item.src.startsWith("/video/"));
      assert.ok(existsSync(`public${item.src}`));
      assert.ok(existsSync(`public${item.poster}`));
    }
    assert.equal((mediaFrameStyle({desktopHeight:520,mobileHeight:240}) as any)["--media-height"], "520px");
    assert.equal((mediaFrameStyle({desktopHeight:-1,mobileHeight:10000}) as any)["--media-mobile-height"], "280px");
  } finally {
    if (previous === undefined) delete process.env.REFERENCE_VIDEO_URL; else process.env.REFERENCE_VIDEO_URL = previous;
  }
});

test("one R2 URL supplies landing media, samples, reference variants and compiled provider inputs", () => {
  const previous = process.env.REFERENCE_VIDEO_URL, previousStorage = process.env.R2_PUBLIC_URL;
  const url = "https://cdn.example.test/templates/performance.mp4";
  process.env.REFERENCE_VIDEO_URL = ` ${url} `;
  process.env.R2_PUBLIC_URL = "https://uploads.example.test";
  try {
    assert.equal(referenceMotionUrl(), url);
    assert.equal(publicMedia.hero.src, url);
    assert.equal(publicMedia.templates[0].src, url);
    assert.equal(resolvePublicMedia("hero")?.src, url);
    assert.equal(resolvePublicMedia("template-original")?.src, url);
    assert.equal(referenceSampleCatalog()[0].src, url);
    assert.equal(JSON.parse(JSON.stringify(publicMedia)).hero.src, url, "Getters must serialize into the client preview URL");
    for (const preset of getVideoPresets()) {
      for (const variant of preset.variants.filter(item => item.strategy === "video-reference")) {
        assert.equal(variant.operatorAssets.find(item => item.kind === "video")?.url, url);
        assert.equal(variant.examples[0]?.src, url);
        const model = getReferenceVideoModels().find(item => item.id === variant.modelId)!;
        const input = validateWorkbenchInput({ presetId: preset.id, presetVersion: preset.version,
          variantId: variant.id, pricingVersion: variant.pricingVersion, consent: true,
          images: variant.inputSlots.map(slot => ({ slotId: slot.id, url: `https://uploads.example.test/${slot.id}.png` })),
        }, model, "reference-video", [preset]);
        assert.equal(input.referenceVideoUrl, url);
        assert.deepEqual(mapReferenceVideoInput(input).reference_video_urls, [url]);
      }
    }
  } finally {
    if (previous === undefined) delete process.env.REFERENCE_VIDEO_URL; else process.env.REFERENCE_VIDEO_URL = previous;
    if (previousStorage === undefined) delete process.env.R2_PUBLIC_URL; else process.env.R2_PUBLIC_URL = previousStorage;
  }
});

test("new one-person and three-person tools configure role count, prompt, output and retail pricing without shared code edits", () => {
  const previous = process.env.R2_PUBLIC_URL;
  process.env.R2_PUBLIC_URL = "https://uploads.example.test";
  try {
    for (const count of [1, 3]) {
      const slots = Array.from({length:count}, (_,i) => ({id:`role-${i}`,purpose:"identity" as const,required:true,maxCount:1,label:{en:`Role ${i}`,zh:`角色 ${i}`},description:{en:"Clear photo",zh:"清晰照片"}}));
      const variant = createVideoTemplateVariant({id:`cast-${count}`,title:{en:"Cast",zh:"角色"},description:{en:"Test",zh:"测试"},motionUrl:"https://media.example.test/reference.mp4",durationSeconds:15,examples:[],pricingVersion:"1",inputSlots:slots,prompt:{en:"Perform the configured scene.",zh:"表演指定场景。"},output:{duration:8,durations:[8]},retailPricing:{perSecond:{"720p":3},minimum:10}});
      const preset = {id:`tool-${count}`,version:"1",enabled:true,title:variant.title,description:variant.description,defaultVariantId:variant.id,variants:[variant]};
      const raw = {presetId:preset.id,presetVersion:"1",variantId:variant.id,pricingVersion:"1",consent:true,images:slots.map(slot=>({slotId:slot.id,url:`https://uploads.example.test/${slot.id}.png`}))};
      const model = getReferenceVideoModels()[0];
      const compiled = validateWorkbenchInput(raw,model,"reference-video",[preset]);
      assert.equal((compiled.imageUrls as string[]).length,count);
      assert.match(String(compiled.prompt),/Perform the configured scene/);
      assert.doesNotMatch(String(compiled.prompt),/Keep the two|two people|duo/i);
      assert.equal(quoteWorkbenchInput(compiled,[preset]),69);
      assert.throws(()=>validateWorkbenchInput({...raw,images:[]},model,"reference-video",[preset]),/required/);
      assert.throws(()=>validateWorkbenchInput({...raw,prompt:"override"},model,"reference-video",[preset]),/Unsupported/);
    }
  } finally { if(previous===undefined) delete process.env.R2_PUBLIC_URL; else process.env.R2_PUBLIC_URL=previous; }
});

test("a missing, wrong-duration or silent template is rejected before any paid provider submission", async () => {
  const original = globalThis.fetch;
  const calls:string[]=[];
  const adapter = createKieVideoAdapter(mapReferenceVideoInput);
  const input={strategy:"video-reference",referenceVideoUrl:"https://media.example.test/reference.mp4",referenceDurationSeconds:15,audioMode:"template"};
  try {
    globalThis.fetch=(async url=>{calls.push(String(url));return new Response("Missing",{status:404});}) as typeof fetch;
    await assert.rejects(adapter.preflight!(input,getReferenceVideoModels()[0]),/No credits were charged/);
    globalThis.fetch=(async url=>{calls.push(String(url));return new Response(readFileSync("tests/fixtures/silent-video.mp4"));}) as typeof fetch;
    await assert.rejects(adapter.preflight!(input,getReferenceVideoModels()[0]),/No credits were charged/);
    assert.ok(calls.every(url=>url===input.referenceVideoUrl));
  } finally {globalThis.fetch=original;}
});

test("Stripe defaults on while other gateways default off; missing keys block readiness", () => {
  const keys=["NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED","NEXT_PUBLIC_PAYMENT_CREEM_ENABLED","NEXT_PUBLIC_PAYMENT_PAYPAL_ENABLED"];
  const previous=keys.map(key=>process.env[key]);
  try {
    keys.forEach(key=>delete process.env[key]);
    assert.deepEqual(getEnabledPaymentMethods(),["stripe"]);
    assert.equal(stripeConfigurationReady({}),false);
    assert.equal(stripeConfigurationReady({STRIPE_PRIVATE_KEY:"test",STRIPE_PUBLIC_KEY:"test"}),false);
    assert.equal(stripeConfigurationReady({STRIPE_PRIVATE_KEY:"test",STRIPE_PUBLIC_KEY:"test",STRIPE_WEBHOOK_SECRET:"test"}),true);
  } finally {keys.forEach((key,i)=>{if(previous[i]===undefined)delete process.env[key];else process.env[key]=previous[i];});}
});


test("Wrangler defaults override conflicting payment flags without masking configured keys with empty placeholders", () => {
  const env:Record<string,string>={STRIPE_PUBLIC_KEY:"configured-public-key",NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED:"false"};
  const logs:string[]=[];
  runInNewContext(readFileSync("scripts/load-wrangler-env.js","utf8"), {
    __dirname:"/template/scripts", process:{env,argv:["node","script"]},
    console:{log:(message:string)=>logs.push(message),error:()=>{}},
    require:(name:string)=>name==="fs"?{readFileSync:()=>JSON.stringify({vars:{STRIPE_PUBLIC_KEY:"",NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED:"true",NEXT_PUBLIC_PAYMENT_CREEM_ENABLED:"false"}})}:name==="path"?path:undefined,
  });
  assert.equal(env.STRIPE_PUBLIC_KEY,"configured-public-key");
  assert.equal(env.NEXT_PUBLIC_PAYMENT_STRIPE_ENABLED,"true");
  assert.equal(env.NEXT_PUBLIC_PAYMENT_CREEM_ENABLED,"false");
  assert.ok(logs.every(line=>!line.includes("configured-public-key")));
});
