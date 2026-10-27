import * as React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { HeroTitle } from "../src/components/blocks/hero/title";

test("hero emphasis comes from content, without dropping repeated text", () => {
  const html = renderToStaticMarkup(<HeroTitle title="Make a clip, share a clip." mark="clip" />);
  assert.equal(html, '<h1 class="landing-hero-title">Make a <span class="landing-title-mark">clip</span>, share a clip.</h1>');
});

test("missing and unmatched marks leave the whole heading intact", () => {
  for (const mark of [undefined, "", "Other product"]) {
    const html = renderToStaticMarkup(<HeroTitle title="Your video" mark={mark} />);
    assert.equal(html, '<h1 class="landing-hero-title">Your video</h1>');
  }
});

test("localized titles preserve spacing and use the same emphasis", () => {
  const html = renderToStaticMarkup(<HeroTitle title={"两张照片，\n生成一条 ShipFire 视频。"} mark="ShipFire 视频" />);
  assert.match(html, /两张照片，\n生成一条 <span class="landing-title-mark">ShipFire 视频<\/span>。/);
});

test("titles are escaped text, never injected HTML", () => {
  const html = renderToStaticMarkup(<HeroTitle title="Try <script> today" mark="<script>" />);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});
