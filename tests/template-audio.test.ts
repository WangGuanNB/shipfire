import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ALL_FORMATS, BufferSource, Input } from "mediabunny";
import { attachTemplateAudio } from "../src/ai/template-audio";

test("template audio replaces the clip sound and is trimmed to the picture", async () => {
  const video = readFileSync(new URL("./fixtures/silent-video.mp4", import.meta.url));
  const template = readFileSync(new URL("./fixtures/template-audio.mp4", import.meta.url));
  const output = await attachTemplateAudio(video, template);
  const result = new Input({ formats: ALL_FORMATS, source: new BufferSource(output) });
  const audio = await result.getPrimaryAudioTrack();
  assert.ok(audio);
  assert.equal(await audio.getSampleRate(), 44100);
  assert.equal(await audio.getNumberOfChannels(), 1);
  const duration = await result.computeDuration();
  assert.ok(duration > 0.3 && duration < 1);
});
