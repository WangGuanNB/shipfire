"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { useAppContext } from "@/contexts/app";
import { TaskRequestError, useAITasks } from "@/hooks/use-ai-tasks";
import type { PublicTask, TaskStatus } from "@/ai/types";
import type { PublicReferencePreset } from "@/ai/reference-video-types";
import VideoGenerationProgress from "./video-generation-progress";
import { videoWaitCopy } from "@/lib/video-generation-wait";
import type { Pricing as PricingType } from "@/types/blocks/pricing";
import Pricing from "@/components/blocks/pricing";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ToolHistoryLink from "./tool-history-link";
import Icon from "@/components/icon";
import { cn } from "@/lib/utils";
import GalleryVideo from "@/components/landing/gallery-video";

const ACTIVE = ["queued", "submitting", "running"];

function frameClass(ratio?: string) {
  if (ratio === "9:16") return "mx-auto aspect-[9/16] max-h-[68vh] w-auto max-w-full";
  if (ratio === "3:4") return "mx-auto aspect-[3/4] max-h-[68vh] w-auto max-w-full";
  if (ratio === "1:1") return "aspect-square w-full";
  if (ratio === "4:3") return "aspect-[4/3] w-full";
  return "aspect-video w-full";
}

function PreviewPanel({ zh, preset, example, onExample, video, task, generating }: {
  zh: boolean;
  preset?: PublicReferencePreset;
  example?: PublicReferencePreset["examples"][number];
  onExample: (id: string) => void;
  video?: string;
  task?: PublicTask;
  generating: boolean;
}) {
  const wait = videoWaitCopy(zh);
  const busy = generating || (!!task && ACTIVE.includes(task.status));
  const examples = preset?.examples ?? [];
  return (
    <div className="min-w-0 space-y-3 rounded-xl border border-border bg-background p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">{task ? (zh ? "我的视频" : "My video") : (zh ? "示例" : "Example")}</h3>
        {!task && examples.length > 1 && examples.length <= 4 && (
          <div className="flex max-w-full gap-1 overflow-x-auto">
            {examples.map(item => (
              <button key={item.id} type="button" onClick={() => onExample(item.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs ${example?.id === item.id ? "bg-foreground text-background" : "bg-muted text-muted-foreground"}`}>
                {item.label[zh ? "zh" : "en"]}
              </button>
            ))}
          </div>
        )}
      </div>
      {video ? (
        <>
          <video src={video} controls playsInline className={`${frameClass(preset?.aspectRatio)} rounded-lg bg-black`} />
          <Button asChild variant="outline" className="w-full sm:w-auto"><a href={video} download target="_blank" rel="noreferrer">{zh ? "打开 / 下载" : "Open / download"}</a></Button>
        </>
      ) : busy ? (
        <VideoGenerationProgress
          status={task && ACTIVE.includes(task.status) ? task.status as TaskStatus : undefined}
          uploading={false}
          imageMode
          message={task?.status === "queued"
              ? wait.queued
              : task?.status === "submitting"
                ? wait.submitting
                : wait.generating}
          hint={wait.hintKeepOpen}
          labels={{ upload: zh ? "上传" : "Upload", submit: zh ? "提交" : "Submit", generate: zh ? "生成" : "Generate" }}
        />
      ) : task ? (
        <div role="status" className="space-y-3 px-2 py-8 text-center text-sm text-muted-foreground">
          <p>{task.status === "needs_review"
            ? (zh ? "任务需要人工核查，请勿重复提交。" : "This task needs review. Do not submit it again.")
            : (zh ? "生成失败，积分已释放。" : "Generation failed. Credits have been released.")}</p>
          {task.error && <p>{task.error}</p>}
          <p className="break-all text-xs">{task.id}</p>
        </div>
      ) : example ? (
        <>
          <GalleryVideo key={example.src} src={example.src} label={example.label[zh ? "zh" : "en"]} className={`${frameClass(preset?.aspectRatio)} rounded-lg bg-black`} />
        </>
      ) : (
        <p className="py-16 text-center text-sm text-muted-foreground">{zh ? "还没有示例视频。生成结果会显示在这里。" : "No example video yet. Your result will appear here."}</p>
      )}
    </div>
  );
}

export default function ReferenceVideoTool({ presets, pricing, presetId, selectedExampleId, id = "reference-video-tool", navigation, onBusyChange, sectionTitle, sectionLead }: {
  presets: PublicReferencePreset[];
  pricing: PricingType | null;
  presetId?: string;
  selectedExampleId?: string;
  id?: string;
  navigation?: ReactNode;
  onBusyChange?: (busy: boolean) => void;
  sectionTitle?: string;
  sectionLead?: string;
}) {
  const locale = useLocale();
  const lang = locale === "zh" ? "zh" : "en";
  const zh = lang === "zh";
  const { user, setShowSignModal, fetchUserInfo } = useAppContext();
  const { tasks, submit, submitting } = useAITasks("reference-video", user?.uuid);
  const available = presetId ? presets.filter(p => p.id === presetId) : presets;
  const [selected, setSelected] = useState(available[0]?.id ?? "");
  const preset = available.find(p => p.id === selected) ?? available[0];
  const [exampleId, setExampleId] = useState("");
  const example = preset?.examples.find(item => item.id === exampleId) ?? preset?.examples[0];
  const [resolution, setResolution] = useState(preset?.resolutions[0] ?? "480p");
  const [consent, setConsent] = useState(false);
  const [images, setImages] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const task = tasks.find(t => t.id === taskId);
  const video = task?.artifacts.find(a => a.kind === "video")?.url;
  const busy = uploading !== null || submitting || (!!task && ACTIVE.includes(task.status));
  const locked = useRef(false);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const identity = useRef(user?.uuid);
  identity.current = user?.uuid;
  const credits = preset?.credits[resolution];
  const ready = !!preset?.ready && preset.roles.every(role => !!images[role.id]) && consent && Number.isSafeInteger(credits);
  const insufficient = !!user && (user.credits?.left_credits ?? 0) < (credits ?? 0);

  useEffect(() => {
    const chosen = selectedExampleId && preset?.examples.some(item => item.id === selectedExampleId)
      ? selectedExampleId
      : preset?.examples[0]?.id ?? "";
    setExampleId(chosen);
  }, [preset?.id, selectedExampleId]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => { return () => onBusyChange?.(false); }, [onBusyChange]);
  useEffect(() => {
    setImages({}); setTaskId(null); setConsent(false); setError("");
  }, [user?.uuid]);
  useEffect(() => {
    if (task && ["succeeded", "failed"].includes(task.status)) void fetchUserInfo();
  }, [task?.id, task?.status]);

  function scrollToPreviewPanel() {
    requestAnimationFrame(() => {
      previewPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  useEffect(() => {
    if (submitting || taskId) scrollToPreviewPanel();
  }, [submitting, taskId, task?.status]);

  async function upload(roleId: string, file?: File) {
    if (!file || busy || locked.current) return;
    if (!user) { setShowSignModal(true); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError(zh ? "请上传不超过 10MB 的 JPG、PNG 或 WebP 图片。" : "Use a JPG, PNG or WebP image up to 10MB."); return;
    }
    const owner = user.uuid;
    locked.current = true; setUploading(roleId); setError("");
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error(zh ? "无法读取图片" : "Could not read image"));
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/upload-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: data, mimeType: file.type, fileName: file.name }),
      });
      if (response.status === 401) { setShowSignModal(true); return; }
      const result = await response.json();
      if (!response.ok || !result.imageUrl) throw new Error(result.error || "Upload failed");
      if (identity.current === owner) { setImages(old => ({ ...old, [roleId]: result.imageUrl })); }
    } catch (e) { if (identity.current === owner) setError(e instanceof Error ? e.message : "Upload failed"); }
    finally { locked.current = false; setUploading(null); }
  }

  async function generate() {
    if (!user) { setShowSignModal(true); return; }
    if (!preset || !ready || busy || locked.current) return;
    if (insufficient && pricing && !pricing.disabled) { setShowPricing(true); return; }
    const owner = user.uuid;
    locked.current = true; setError("");
    scrollToPreviewPanel();
    try {
      const result = await submit(preset.modelId, {
        presetId: preset.id, presetVersion: preset.version, resolution, consent,
        exampleId: example?.id,
        images: preset.roles.map(role => ({ roleId: role.id, url: images[role.id] })), locale,
      });
      if (identity.current === owner) {
        setTaskId(result.id);
        await fetchUserInfo();
      }
    } catch (e) {
      if (identity.current !== owner) return;
      if (e instanceof TaskRequestError && e.status === 401) setShowSignModal(true);
      else if (e instanceof TaskRequestError && e.status === 402 && pricing && !pricing.disabled) setShowPricing(true);
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally { locked.current = false; }
  }

  return (
    <div className="w-full text-left">
      {(sectionTitle || sectionLead) && <header className="mx-auto mb-6 max-w-3xl space-y-2 text-center md:mb-8">
        {sectionTitle && <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{sectionTitle}</h2>}
        {sectionLead && <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{sectionLead}</p>}
      </header>}
      <div
        id={id}
        className="scroll-mt-20 min-w-0 max-w-full rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-5 md:scroll-mt-24 md:p-8"
      >
        <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-4">
            {navigation}
            {!preset ? <p>{zh ? "暂无可用的参考视频玩法。" : "No reference video presets are available."}</p> : <>
              {available.length > 1 && (
                <div className="space-y-2 text-sm font-medium">
                  <span className="block">{zh ? "选择玩法" : "Choose a preset"}</span>
                  <Select
                    value={preset.id}
                    disabled={busy}
                    onValueChange={(value) => {
                      const next = available.find(p => p.id === value)!;
                      setSelected(next.id);
                      setResolution(next.resolutions[0]);
                      setImages({});
                      setConsent(false);
                      setTaskId(null);
                      setError("");
                    }}
                  >
                    <SelectTrigger className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[200] max-h-[min(280px,70vh)] w-[var(--radix-select-trigger-width)]">
                      {available.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.title[lang]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div><h3 className="text-lg font-semibold">{preset.title[lang]}</h3><p className="mt-1 text-sm text-muted-foreground">{preset.description[lang]}</p></div>
              {!preset.ready && <p role="status" className="rounded-lg border border-border bg-muted p-3 text-sm">
                {zh ? "玩法待配置：请在 public 目录放置参考视频并核对时长与价格，或设置可公网访问的 HTTPS 地址。当前不会发起生成或扣除积分。" : "Preset setup required: add the reference clip under public/ (or a reachable HTTPS URL) and verify duration and pricing. Generation and charging are disabled."}
              </p>}
              <div className="grid grid-cols-2 gap-3">
                {preset.roles.map((role) => {
                  const hasImage = !!images[role.id];
                  const isUploading = uploading === role.id;
                  const canPick = preset.ready && !busy;
                  const uploadHint = zh
                    ? (role.id === "left" ? "上传左侧照片" : role.id === "right" ? "上传右侧照片" : "点击上传照片")
                    : (role.id === "left" ? "Upload left photo" : role.id === "right" ? "Upload right photo" : "Tap to upload");
                  return (
                    <div key={`${preset.id}-${role.id}`} className="min-w-0 space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        {role.label[lang]}
                      </p>
                      <input
                        ref={(el) => { fileInputs.current[role.id] = el; }}
                        id={`${id}-${role.id}`}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={!canPick}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          void upload(role.id, file);
                        }}
                      />
                      <button
                        type="button"
                        disabled={!canPick}
                        onClick={() => fileInputs.current[role.id]?.click()}
                        className={cn(
                          "relative flex h-[148px] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-dashed transition-colors sm:h-[168px]",
                          canPick ? "cursor-pointer border-border/70 bg-muted/20 hover:border-primary/40 hover:bg-muted/35" : "cursor-not-allowed border-border/40 bg-muted/10 opacity-70",
                          hasImage && "border-solid border-border/50 bg-muted/15"
                        )}
                      >
                        {hasImage ? (
                          <>
                            <img src={images[role.id]} alt={role.label[lang]} className="absolute inset-0 size-full object-cover object-[center_22%]" />
                            <span className="sr-only">{uploadHint}</span>
                          </>
                        ) : (
                          <>
                            <Icon name="RiUserLine" className="size-9 text-muted-foreground/80" />
                            <span className="px-3 text-center text-sm text-muted-foreground">{uploadHint}</span>
                          </>
                        )}
                        {isUploading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/75">
                            <Icon name="RiLoader4Line" className="size-8 animate-spin text-primary" />
                          </div>
                        )}
                      </button>
                      {hasImage && (
                        <button
                          type="button"
                          disabled={busy}
                          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                          onClick={() => {
                            setImages((old) => {
                              const next = { ...old };
                              delete next[role.id];
                              return next;
                            });
                          }}
                        >
                          {zh ? "移除图片" : "Remove image"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="w-full space-y-2 text-sm sm:w-auto">
                  <span className="block font-medium">{zh ? "画质" : "Quality"}</span>
                  <Select value={resolution} disabled={busy || !preset.ready} onValueChange={setResolution}>
                    <SelectTrigger className="h-10 w-full min-w-[140px] sm:w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" className="z-[200] min-w-[var(--radix-select-trigger-width)]">
                      {preset.resolutions.map(r => (
                        <SelectItem key={r} value={r} className="py-2.5 text-sm">
                          {r.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground sm:pb-2">{preset.duration}s · {preset.aspectRatio}</p>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={consent} disabled={busy || !preset.ready} onChange={event => setConsent(event.target.checked)} />
                <span>{zh ? "我有权使用上传的照片，并同意把它们用于这次生成。" : "I have permission to use the uploaded photos for this generation."}</span>
              </label>
              <Button type="button" className="w-full" disabled={busy || !ready || task?.status === "needs_review"} onClick={generate}>
                {(submitting || (!!task && ACTIVE.includes(task.status)))
                  ? (zh ? "处理中…" : "Processing…")
                  : `${zh ? "生成视频" : "Generate video"}${credits === undefined ? "" : ` · ${credits} ${zh ? "积分" : "credits"}`}`}
              </Button>
              {insufficient && <p className="text-sm text-muted-foreground">{zh ? "当前积分不足。" : "You need more credits."}{pricing && !pricing.disabled && <button type="button" className="ml-2 text-primary underline" onClick={() => setShowPricing(true)}>{zh ? "充值" : "Get credits"}</button>}</p>}
            </>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
          <div ref={previewPanelRef} className="scroll-mt-20 md:scroll-mt-24">
            <PreviewPanel
              zh={zh}
              preset={preset}
              example={example}
              onExample={setExampleId}
              video={video}
              task={task}
              generating={submitting}
            />
          </div>
        </div>
        {!video && !busy && (
          <div className="mt-4">
            <ToolHistoryLink />
          </div>
        )}
      </div>
      <Dialog open={showPricing} onOpenChange={setShowPricing}><DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader><DialogTitle>{zh ? "需要更多积分" : "More credits needed"}</DialogTitle><DialogDescription>{zh ? "选择适合你的套餐。" : "Choose a plan to continue."}</DialogDescription></DialogHeader>
        {pricing && <Pricing pricing={pricing} embed />}
      </DialogContent></Dialog>
    </div>
  );
}
