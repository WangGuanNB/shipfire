"use client";

import { useMemo, useState } from "react";
import type { PublicTask, TaskStatus } from "@/ai/types";
import { cn } from "@/lib/utils";
import Icon from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const ACTIVE: TaskStatus[] = ["queued", "submitting", "running"];
type Filter = "all" | "video-generator" | "image-generator";

function activeProgress(status: TaskStatus, createdAt: number): number {
  const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - createdAt);
  const base = status === "queued" ? 12 : status === "submitting" ? 25 : 40;
  return Math.min(95, base + Math.floor(elapsed / 8));
}

function formatDate(createdAt: number, locale: string): string {
  return new Date(createdAt * 1000).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function primaryArtifact(task: PublicTask) {
  return task.artifacts.find((a) => a.url && (a.kind === "video" || a.kind === "image"));
}

export default function HistoryList({ tasks, locale = "en" }: { tasks: PublicTask[]; locale?: string }) {
  const zh = locale === "zh";
  const [filter, setFilter] = useState<Filter>("all");

  const labels: Record<string, string> = zh
    ? {
        queued: "排队中",
        submitting: "提交中",
        running: "生成中",
        succeeded: "已完成",
        failed: "失败",
        needs_review: "待核查",
      }
    : {
        queued: "Queued",
        submitting: "Submitting",
        running: "Generating",
        succeeded: "Complete",
        failed: "Failed",
        needs_review: "Review",
      };

  const typeLabels: Record<string, string> = zh
    ? { "video-generator": "视频", "image-generator": "图片" }
    : { "video-generator": "Video", "image-generator": "Image" };

  const filtered = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((t) => t.toolId === filter)),
    [tasks, filter]
  );

  const tabs: { id: Filter; label: string }[] = [
    { id: "all", label: zh ? "全部" : "All" },
    { id: "video-generator", label: zh ? "视频" : "Video" },
    { id: "image-generator", label: zh ? "图片" : "Image" },
  ];

  if (!tasks.length) {
    return (
      <p className="mt-6 text-muted-foreground">
        {zh ? "暂无生成记录，去工具页开始创作吧。" : "No generations yet. Create something from a tool page."}
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            size="sm"
            variant={filter === tab.id ? "default" : "outline"}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {zh ? "该分类下暂无记录。" : "No items in this category."}
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {filtered.map((task) => {
            const asset = primaryArtifact(task);
            const inProgress = ACTIVE.includes(task.status);
            const progress = inProgress ? activeProgress(task.status, task.createdAt) : 100;
            return (
              <li key={task.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex h-20 w-full shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-muted/30 sm:h-16 sm:w-28">
                  {asset?.kind === "video" && asset.url ? (
                    <video src={asset.url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                  ) : asset?.kind === "image" && asset.url ? (
                    <img src={asset.url} alt="" className="h-full w-full object-cover" />
                  ) : inProgress ? (
                    <Icon name="RiLoader4Line" className="size-6 animate-spin text-muted-foreground" />
                  ) : (
                    <Icon name="RiImageLine" className="size-6 text-muted-foreground" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{typeLabels[task.toolId] ?? task.toolId}</Badge>
                    <span
                      role="status"
                      className={cn(
                        "text-sm font-medium",
                        task.status === "failed" && "text-destructive",
                        task.status === "succeeded" && "text-emerald-600"
                      )}
                    >
                      {labels[task.status]}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(task.createdAt, locale)}</span>
                  </div>

                  {inProgress && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{zh ? "处理中…" : "In progress…"}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}

                  {task.error && task.status !== "succeeded" && (
                    <p className={cn("text-xs", task.status === "failed" ? "text-destructive" : "text-muted-foreground")}>
                      {task.error}
                    </p>
                  )}

                  {task.status === "needs_review" && (
                    <p className="break-all text-xs text-muted-foreground">
                      {zh ? "任务编号" : "Task ID"}: {task.id}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                  <span className="text-sm text-muted-foreground">
                    {task.credits} {zh ? "积分" : "credits"}
                  </span>
                  {asset?.url && (
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {zh ? "打开 / 下载" : "Open / download"}
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
