"use client";

import * as React from "react";
import { Download, Film, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { videoWaitCopy } from "@/lib/video-generation-wait";

/** The generated clip has its own row; the sample stays visible beside the form. */
export default function WorkbenchResult({
  headingId,
  status,
  submitting,
  result,
  error,
  aspectRatio,
  zh,
}: {
  headingId: string;
  status?: string;
  submitting: boolean;
  result?: string;
  error?: string;
  aspectRatio: string;
  zh: boolean;
}) {
  const running = submitting || ["queued", "submitting", "running"].includes(status ?? "");
  const failed = !running && (!!error || status === "failed" || status === "needs_review");
  const wait = videoWaitCopy(zh);

  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-sm sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <h2 id={headingId} className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Film className="size-5 text-primary" aria-hidden />
          {zh ? "你的视频" : "Your video"}
        </h2>
        <Link href="/my-tasks/" className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
          {zh ? "我的视频" : "My videos"}
        </Link>
      </div>

      {result ? (
        <div className="flex flex-col items-center gap-5">
          <video
            src={result}
            controls
            playsInline
            preload="metadata"
            aria-label={zh ? "生成的视频" : "Generated video"}
            style={{ aspectRatio: aspectRatio.replace(":", "/") }}
            className="max-h-[65vh] w-full max-w-[320px] rounded-2xl bg-black object-contain"
          />
          <a href={result} download target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Download className="size-4" aria-hidden />
            {zh ? "下载 MP4" : "Download MP4"}
          </a>
        </div>
      ) : failed ? (
        <div role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm leading-relaxed text-destructive">
          {error || (zh ? "未能完成视频，请检查任务状态后再试。" : "Your video could not be completed. Check its status in My videos before trying again.")}
        </div>
      ) : (
        <div role="status" aria-live="polite" className="flex min-h-[190px] flex-col items-center justify-center gap-3 px-3 text-center">
          <Loader2 className="size-8 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
          <p className="font-medium">{wait.generating}</p>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{wait.hintResultBelow}</p>
        </div>
      )}
    </div>
  );
}
