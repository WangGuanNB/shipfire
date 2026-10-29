import * as React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkbenchPhotoButton, WorkbenchQualityPicker } from "../src/components/ai/workbench-controls";
import type { PublicWorkbenchVariant } from "../src/ai/workbench-types";

const variant = {
  output: { resolutions: ["480p", "720p", "1080p"] },
  credits: { "480p:15:template": 100, "720p:15:template": 200, "1080p:15:template": 350 },
} as unknown as PublicWorkbenchVariant;

function quality(extra: Partial<React.ComponentProps<typeof WorkbenchQualityPicker>> = {}) {
  return renderToStaticMarkup(<WorkbenchQualityPicker variant={variant} resolution="480p" duration={15} audio="template" disabled={false} zh={false} onChange={() => {}} {...extra} />);
}

test("quality cards use accessible native radios and show server-provided prices", () => {
  const html = quality();
  assert.equal((html.match(/type="radio"/g) || []).length, 3);
  assert.match(html, /checked="" value="480p"/);
  for (const cost of [100, 200, 350]) assert.match(html, new RegExp(`>${cost}<`));
  assert.match(html, /1080P/);
});

test("prices update for a different server quote, duration and audio combination", () => {
  const html = quality({ duration: 10, audio: "off", resolution: "720p", variant: { ...variant, credits: { "480p:10:off": 7, "720p:10:off": 19 } } });
  assert.match(html, />7</);
  assert.match(html, />19</);
  assert.doesNotMatch(html, />100<|>200</);
  assert.match(html, /checked="" value="720p"/);
  assert.match(html, /<input[^>]*disabled=""[^>]*value="1080p"/);
});

test("busy cards remain disabled and localized", () => {
  const html = quality({ disabled: true, zh: true });
  assert.match(html, /<fieldset[^>]*disabled/);
  assert.match(html, /标准版/);
  assert.match(html, /高清版/);
  assert.match(html, /积分 \/ 条/);
});

test("empty photo slots have an explicit upload action and format guidance", () => {
  const html = renderToStaticMarkup(<WorkbenchPhotoButton label="First person" description="One clear face" uploading={false} disabled={false} zh={false} onClick={() => {}} />);
  assert.match(html, /aria-label="Upload photo: First person"/);
  assert.match(html, /One clear face/);
  assert.match(html, /JPG · PNG · WebP/);
  assert.doesNotMatch(html, /<img/);
});

test("uploaded photos stay uncropped with a visible replacement action and loading state", () => {
  const html = renderToStaticMarkup(<WorkbenchPhotoButton label="第二位" description="清晰照片" photo="/portrait.webp" uploading disabled zh onClick={() => {}} />);
  assert.match(html, /aria-label="更换照片: 第二位"/);
  assert.match(html, /object-contain/);
  assert.doesNotMatch(html, /object-cover/);
  assert.match(html, />更换</);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /role="status"/);
  assert.match(html, /disabled=""/);
});
