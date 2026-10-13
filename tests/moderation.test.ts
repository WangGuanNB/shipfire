import test from "node:test";
import assert from "node:assert/strict";
import { getModerationConfig } from "../src/config/moderation";
import { moderateGenerationInput } from "../src/services/moderation/moderate-input";
import { ToolError } from "../src/ai/types";

test("default moderation config is off and fail-open on errors", () => {
  const prev = { ...process.env };
  delete process.env.CONTENT_MODERATION_MODE;
  delete process.env.CONTENT_MODERATION_ON_ERROR;
  try {
    const cfg = getModerationConfig();
    assert.equal(cfg.mode, "off");
    assert.equal(cfg.onError, "allow");
  } finally {
    process.env = prev;
  }
});

test("moderateGenerationInput is a no-op when mode is off", async () => {
  const prev = process.env.CONTENT_MODERATION_MODE;
  process.env.CONTENT_MODERATION_MODE = "off";
  try {
    await moderateGenerationInput("video-generator", { prompt: "anything" });
  } finally {
    if (prev === undefined) delete process.env.CONTENT_MODERATION_MODE;
    else process.env.CONTENT_MODERATION_MODE = prev;
  }
});

test("enforce mode blocks flagged text", async () => {
  const prev = {
    mode: process.env.CONTENT_MODERATION_MODE,
    key: process.env.SEEAPI_API_KEY,
    fetch: globalThis.fetch,
  };
  process.env.CONTENT_MODERATION_MODE = "enforce";
  process.env.SEEAPI_API_KEY = "test-key";
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        id: "task_test",
        status: "succeeded",
        result: { type: "json", data: { flagged: true } },
        error: null,
      }),
      { status: 200 },
    );
  try {
    await assert.rejects(
      () => moderateGenerationInput("image-generator", { prompt: "bad prompt" }),
      (e: unknown) => e instanceof ToolError && e.status === 400,
    );
  } finally {
    globalThis.fetch = prev.fetch;
    if (prev.mode === undefined) delete process.env.CONTENT_MODERATION_MODE;
    else process.env.CONTENT_MODERATION_MODE = prev.mode;
    if (prev.key === undefined) delete process.env.SEEAPI_API_KEY;
    else process.env.SEEAPI_API_KEY = prev.key;
  }
});
