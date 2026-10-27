import * as React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { intrinsicMediaFrameStyle, mediaAspectRatio } from "../src/lib/media-frame";
import { LandingMediaFrame } from "../src/components/landing/media-frame";

test("native landscape, portrait and square dimensions retain their ratio", () => {
  for (const [width, height] of [[1920, 1080], [1080, 1920], [1080, 1080]]) {
    const ratio = mediaAspectRatio(width, height);
    assert.equal(ratio, width / height);
    const style = intrinsicMediaFrameStyle({ aspectRatio: 2 }, undefined, ratio);
    assert.equal((style as any)["--media-ratio"], width / height);
  }
});

test("invalid metadata is ignored; a valid config hint reserves initial space", () => {
  for (const value of [0, -1, NaN, Infinity, undefined]) {
    assert.equal(mediaAspectRatio(value, 100), undefined);
    assert.equal(mediaAspectRatio(100, value), undefined);
  }
  assert.equal((intrinsicMediaFrameStyle({ aspectRatio: 9 / 16 }) as any)["--media-ratio"], 9 / 16);
  assert.equal((intrinsicMediaFrameStyle({ aspectRatio: -1 }) as any)["--media-ratio"], 1);
});

test("existing responsive height settings remain bounded and supported", () => {
  const style = intrinsicMediaFrameStyle({ desktopHeight: 520, mobileHeight: 240 });
  assert.equal((style as any)["--media-height"], "520px");
  assert.equal((style as any)["--media-mobile-height"], "240px");
  const fallback = intrinsicMediaFrameStyle({ desktopHeight: -1, mobileHeight: Infinity });
  assert.equal((fallback as any)["--media-height"], "480px");
  assert.equal((fallback as any)["--media-mobile-height"], "280px");
});

test("media bounds are separate from the transparent layout slot", () => {
  const html = renderToStaticMarkup(<LandingMediaFrame src="/test.webp" alt="Test" config={{ aspectRatio: 9 / 16 }} />);
  assert.match(html, /landing-media-stage/);
  assert.match(html, /landing-media-content/);
  assert.match(html, /object-contain/);
  assert.doesNotMatch(html, /bg-muted|aspect-square|border-border|data-reserve-height/);
});

test("video keeps lazy playback and positions the badge inside the media bounds", () => {
  const html = renderToStaticMarkup(<LandingMediaFrame video="/test.mp4" poster="/poster.webp" alt="Preview" badge="Sample" reserveHeight />);
  assert.match(html, /data-reserve-height="true"/);
  assert.match(html, /<video/);
  assert.match(html, /preload="none"/);
  assert.match(html, /aria-label="Preview"/);
  assert.match(html, /Sample<\/span><\/div><\/div>$/);
});
