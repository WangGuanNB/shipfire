import * as React from "react";
import test from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import WorkbenchResult from "../src/components/ai/workbench-result";

function render(props: Partial<React.ComponentProps<typeof WorkbenchResult>>) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="en" messages={{}} timeZone="UTC">
      <WorkbenchResult headingId="result-title" submitting={false} aspectRatio="9:16" zh={false} {...props} />
    </NextIntlClientProvider>,
  );
}

test("a running task explains where the result will appear without showing a fake video", () => {
  const html = render({ status: "running" });
  assert.match(html, /role="status"/);
  assert.match(html, /Creating your video/);
  assert.doesNotMatch(html, /<video/);
});

test("a successful task plays and links to its generated artifact", () => {
  const html = render({ status: "succeeded", result: "https://cdn.example.test/generated.mp4" });
  assert.match(html, /<video[^>]+src="https:\/\/cdn.example.test\/generated.mp4"/);
  assert.match(html, /controls=""/);
  assert.match(html, /href="https:\/\/cdn.example.test\/generated.mp4" download/);
  assert.doesNotMatch(html, /role="status"/);
});

test("failed and review tasks show their error instead of an endless generating indicator", () => {
  for (const status of ["failed", "needs_review"]) {
    const html = render({ status, error: "Check this task before retrying." });
    assert.match(html, /role="alert"/);
    assert.match(html, /Check this task before retrying/);
    assert.doesNotMatch(html, /role="status"/);
  }
});
