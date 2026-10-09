"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/icon";
import type { TaskStatus } from "@/ai/types";
import { cn } from "@/lib/utils";

type StepKey = "upload" | "submit" | "generate";

function stepState(
  step: StepKey,
  status: TaskStatus | undefined,
  uploading: boolean
): "done" | "active" | "pending" {
  if (uploading) {
    return step === "upload" ? "active" : "pending";
  }
  if (!status || status === "queued") {
    if (step === "upload") return "done";
    if (step === "submit") return status === "queued" ? "active" : "pending";
    return "pending";
  }
  if (status === "submitting") {
    if (step === "upload") return "done";
    if (step === "submit") return "active";
    return "pending";
  }
  if (status === "running") {
    if (step === "generate") return "active";
    return "done";
  }
  return "pending";
}

/** Progress panel below the input card — does not cover the prompt area. */
export default function VideoGenerationProgress({
  status,
  uploading,
  imageMode,
  message,
  hint,
  labels,
}: {
  status?: TaskStatus;
  uploading?: boolean;
  imageMode?: boolean;
  message: string;
  hint: string;
  labels: { upload: string; submit: string; generate: string };
}) {
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    if (uploading) {
      setProgress(12);
      return;
    }
    if (!status) {
      setProgress(8);
      return;
    }
    const base =
      status === "queued" ? 15 : status === "submitting" ? 28 : status === "running" ? 42 : 8;
    setProgress(base);
  }, [status, uploading]);

  useEffect(() => {
    if (status !== "running" && !uploading) return;
    const timer = setInterval(() => {
      setProgress((prev) => Math.min(92, prev + 2));
    }, 4000);
    return () => clearInterval(timer);
  }, [status, uploading]);

  const allSteps: { key: StepKey; label: string }[] = [
    { key: "upload", label: labels.upload },
    { key: "submit", label: labels.submit },
    { key: "generate", label: labels.generate },
  ];
  const visibleSteps = imageMode ? allSteps : allSteps.filter((step) => step.key !== "upload");

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border/50 bg-card text-left shadow-sm"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="border-b border-border/35 px-4 py-4 sm:px-5">
        <ol className="flex items-center justify-center gap-0">
          {visibleSteps.map((step, index) => {
            const state = stepState(step.key, status, !!uploading);
            const isLast = index === visibleSteps.length - 1;

            return (
              <li key={step.key} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                      state === "done" && "border-sky-500 bg-sky-500 text-white",
                      state === "active" && "border-sky-500 bg-sky-500/15 text-sky-400",
                      state === "pending" && "border-border/60 bg-muted/30 text-muted-foreground"
                    )}
                  >
                    {state === "done" ? (
                      <Icon name="RiCheckLine" className="size-4" />
                    ) : state === "active" ? (
                      <Icon name="RiLoader4Line" className="size-4 animate-spin" />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      state === "active" ? "text-sky-400" : "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "mx-3 mb-5 h-px w-10 sm:w-16",
                      state === "done" ? "bg-sky-500" : "bg-border/60"
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 bg-zinc-950 px-6 py-10 sm:min-h-[260px]">
        <Icon name="RiLoader4Line" className="size-10 animate-spin text-zinc-400" />
        <p className="text-sm font-medium text-zinc-200">{message}</p>
        <div className="w-full max-w-md space-y-2">
          <div className="flex items-center justify-between gap-3 text-xs text-zinc-400">
            <span>{hint}</span>
            <span className="shrink-0">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-500 ease-out"
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
