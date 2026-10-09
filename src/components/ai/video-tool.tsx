"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useAppContext } from "@/contexts/app";
import { useAITasks, TaskRequestError } from "@/hooks/use-ai-tasks";
import VideoGenerationProgress from "./video-generation-progress";
import ToolHistoryLink from "./tool-history-link";
import type { TaskStatus } from "@/ai/types";
import type { ToolModel, MediaModel } from "@/ai/types";
import type { Pricing as PricingType } from "@/types/blocks/pricing";
import Pricing from "@/components/blocks/pricing";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Icon from "@/components/icon";
import { quoteCredits } from "@/lib/quote-credits";
import { cn } from "@/lib/utils";
import { Crown } from "lucide-react";
import {
  pickRandomSample,
  VIDEO_IMAGE_MOTION_SAMPLE_PROMPTS,
  VIDEO_TEXT_SAMPLE_PROMPTS,
} from "@/lib/video-sample-prompts";

const BADGE_COLORS = {
  green: "border-emerald-500/40 text-emerald-400",
  orange: "border-orange-500/40 text-orange-400",
  blue: "border-sky-500/40 text-sky-400",
  purple: "border-violet-500/40 text-violet-400",
} as const;

type InputMode = "text" | "image";

function formatDurationLabel(seconds: number): string {
  return `${seconds}S`;
}

function formatResolutionLabel(resolution: string): string {
  return resolution.toUpperCase();
}

export default function VideoTool({
  models,
  pricing,
  id = "video-tool",
  tool,
}: {
  models: ToolModel[];
  pricing: PricingType | null;
  id?: string;
  tool?: Record<string, unknown>;
}) {
  const locale = useLocale();
  const zh = locale === "zh";
  const { user, setShowSignModal, fetchUserInfo } = useAppContext();
  const { tasks, submit, submitting } = useAITasks("video-generator", user?.uuid);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copy = (key: string, fallback: string): string =>
    typeof tool?.[key] === "string" ? (tool[key] as string) : fallback;

  const mediaModels = models as MediaModel[];
  const configuredDefaultModelId = copy("defaultModelId", "basic");
  const initialModel =
    mediaModels.find((m) => m.id === configuredDefaultModelId) ?? mediaModels[0];
  const [modelId, setModelId] = useState(initialModel?.id || "");
  const model = mediaModels.find((m) => m.id === modelId) ?? mediaModels[0];

  const availableInputModes = useMemo<InputMode[]>(() => {
    const configured = copy("inputModes", "text|image")
      .split("|")
      .map((mode) => mode.trim())
      .filter((mode): mode is InputMode => mode === "text" || mode === "image");
    const fromModel = model?.capabilities.modes.filter(
      (m): m is InputMode => m === "text" || m === "image"
    ) ?? ["text"];
    const modes = configured.length > 0 ? configured : fromModel;
    return modes.filter((m) => fromModel.includes(m));
  }, [tool, model]);

  const configuredDefaultMode = copy("defaultInputMode", "text");
  const defaultInputMode: InputMode = availableInputModes.includes(configuredDefaultMode as InputMode)
    ? (configuredDefaultMode as InputMode)
    : availableInputModes[0];

  const [inputMode, setInputMode] = useState<InputMode>(defaultInputMode);
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState(
    formatResolutionLabel(model?.capabilities.resolutions[0] || "480p")
  );
  const [duration, setDuration] = useState(
    formatDurationLabel(model?.capabilities.durations?.[0] || 5)
  );
  const [aspectRatio, setAspectRatio] = useState(model?.capabilities.aspectRatios[0] || "16:9");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [showPricing, setShowPricing] = useState(false);
  /** Task submitted in this page session — inline preview only, cleared on reload. */
  const [resultTaskId, setResultTaskId] = useState<string | null>(null);
  const [sessionResultMeta, setSessionResultMeta] = useState<{
    modelLabel: string;
    resolution: string;
    duration: string;
  } | null>(null);
  const resultPanelRef = useRef<HTMLDivElement>(null);

  const durationSeconds = parseInt(duration.replace(/s/i, ""), 10) || 5;
  const resolutionValue = resolution.toLowerCase();
  const creditCost = useMemo(() => {
    if (!model) return 0;
    try {
      return quoteCredits(model, { resolution: resolutionValue, duration: durationSeconds });
    } catch {
      return 0;
    }
  }, [model, resolutionValue, durationSeconds]);
  const leftCredits = user?.credits?.left_credits ?? 0;
  const insufficientCredits = !!user && leftCredits < creditCost;
  const resultTask = useMemo(
    () => (resultTaskId ? tasks.find((t) => t.id === resultTaskId) : undefined),
    [resultTaskId, tasks]
  );
  const sessionBusy =
    uploading ||
    submitting ||
    (!!resultTask && ["queued", "submitting", "running"].includes(resultTask.status));
  const activeStatus: TaskStatus | undefined =
    resultTask?.status && ["queued", "submitting", "running"].includes(resultTask.status)
      ? resultTask.status
      : submitting
        ? "submitting"
        : undefined;
  const isBusy = sessionBusy;
  const displayVideoUrl = useMemo(() => {
    if (resultTask?.status !== "succeeded") return null;
    return resultTask.artifacts.find((a) => a.kind === "video" && a.url)?.url ?? null;
  }, [resultTask]);
  const showSessionOutput =
    submitting ||
    (!!resultTaskId && (isBusy || !!displayVideoUrl || resultTask?.status === "failed"));
  const progressMessage =
    uploading
      ? copy("progressUploading", zh ? "正在上传图片…" : "Uploading image...")
      : activeStatus === "queued"
        ? copy("progressQueued", zh ? "任务排队中…" : "Waiting in queue...")
        : activeStatus === "submitting"
          ? copy("progressStarting", zh ? "正在提交任务…" : "Preparing your video request...")
          : copy(
              "progressGenerating",
              zh ? "正在生成视频，通常需要 1–3 分钟…" : "Generating video — this may take 1–3 minutes..."
            );

  useEffect(() => {
    fetchUserInfo();
  }, [tasks.map((t) => `${t.id}:${t.status}`).join(",")]);

  useEffect(() => {
    if (displayVideoUrl && resultPanelRef.current) {
      resultPanelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [displayVideoUrl]);

  useEffect(() => {
    if (!model) return;
    setResolution(formatResolutionLabel(model.capabilities.resolutions[0] || "480p"));
    setDuration(formatDurationLabel(model.capabilities.durations?.[0] || 5));
    setAspectRatio(model.capabilities.aspectRatios[0] || "16:9");
    if (!availableInputModes.includes(inputMode)) {
      setInputMode(availableInputModes[0]);
    }
  }, [model?.id]);

  if (!model) {
    return <p>{zh ? "暂未配置可用模型" : "No models configured"}</p>;
  }

  const badgeColors = ["green", "orange", "blue", "purple"] as const;
  const featureBadges = copy(
    "featureBadges",
    "Free AI Video Generator|2 Generation Modes|Up to 1080P Output|No Card Required"
  )
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
  const footerTags = copy("footerTags", "AI GENERATED CONTENT|COMMERCIAL USE READY|HD 1080P OUTPUT")
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  const settingSelectTriggerClass =
    "h-8 w-full min-w-0 justify-between gap-1 rounded-full border-border/50 bg-background/70 px-2 text-xs shadow-none sm:w-fit sm:gap-2 sm:px-3 [&_[data-slot=select-value]]:truncate";
  const modelSelectTriggerClass = cn(settingSelectTriggerClass, "sm:min-w-[148px] sm:max-w-[220px]");
  const promptFieldClassName =
    "min-h-[128px] w-full resize-none border-0 bg-transparent p-0 pr-9 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 sm:min-h-[156px]";

  const canSubmit =
    prompt.trim().length > 0 && (inputMode !== "image" || !!imageUrl) && !uploading;

  async function upload(file?: File) {
    if (!file) return;
    if (!user) {
      setShowSignModal(true);
      return;
    }
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError(zh ? "请上传 10MB 以内的 PNG、JPEG 或 WebP" : "Use PNG, JPEG or WebP up to 10MB");
      return;
    }
    setUploading(true);
    setError("");
    setImageUrl("");
    setUploadedPreview(null);
    try {
      const imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData, mimeType: file.type }),
      });
      const data = await response.json();
      if (!response.ok || !data.imageUrl) throw new Error(zh ? "上传失败" : "Upload failed");
      setImageUrl(data.imageUrl);
      setUploadedPreview(imageData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) upload(file);
  }

  function clearInput() {
    setPrompt("");
    setImageUrl("");
    setUploadedPreview(null);
    setError("");
  }

  function handleRandomPrompt() {
    const pool =
      inputMode === "image" ? VIDEO_IMAGE_MOTION_SAMPLE_PROMPTS : VIDEO_TEXT_SAMPLE_PROMPTS;
    setPrompt(pickRandomSample(pool, prompt));
  }

  async function generate() {
    if (!user) {
      setShowSignModal(true);
      return;
    }
    setError("");
    setResultTaskId(null);
    setSessionResultMeta(null);
    try {
      const task = await submit(model.id, {
        mode: inputMode,
        prompt,
        resolution: resolutionValue,
        duration: durationSeconds,
        aspectRatio,
        imageUrl: inputMode === "image" ? imageUrl : undefined,
        locale,
      });
      setResultTaskId(task.id);
      setSessionResultMeta({
        modelLabel: model.label,
        resolution,
        duration,
      });
      await fetchUserInfo();
    } catch (e) {
      if (e instanceof TaskRequestError && e.status === 401) setShowSignModal(true);
      else if (e instanceof TaskRequestError && e.status === 402) setShowPricing(true);
      setError(e instanceof Error ? e.message : "Request failed");
    }
  }

  const renderPromptActionButtons = (className?: string) => (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <button
        type="button"
        onClick={handleRandomPrompt}
        disabled={isBusy}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        title={copy("randomPromptTooltip", zh ? "随机示例提示词" : "Use a random example prompt")}
        aria-label={copy("randomPromptTooltip", zh ? "随机示例提示词" : "Use a random example prompt")}
      >
        <Icon name="RiSparklingLine" className="size-4" />
      </button>
      <button
        type="button"
        onClick={clearInput}
        disabled={isBusy}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        title={copy("resetTooltip", zh ? "清空" : "Reset")}
        aria-label={copy("resetTooltip", zh ? "清空" : "Reset")}
      >
        <Icon name="RiRefreshLine" className="size-4" />
      </button>
    </div>
  );

  const modeTabs =
    availableInputModes.length > 1 ? (
      <div className="flex justify-center overflow-x-auto px-1 pb-0.5">
        <div className="inline-flex shrink-0 rounded-full border border-border/50 bg-muted/30 p-1">
          {(
            [
              {
                mode: "text" as const,
                icon: "RiMagicLine",
                label: copy("tabTextToVideoLabel", zh ? "文生视频" : "Text to Video"),
              },
              {
                mode: "image" as const,
                icon: "RiImageAddLine",
                label: copy("tabImageToVideoLabel", zh ? "图生视频" : "Image to Video"),
              },
            ] as const
          )
            .filter(({ mode }) => availableInputModes.includes(mode))
            .map(({ mode, icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setInputMode(mode)}
                disabled={isBusy}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors sm:px-5",
                  inputMode === mode
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon name={icon} className="size-4" />
                {label}
              </button>
            ))}
        </div>
      </div>
    ) : null;

  const imageUploadTile = (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={cn(
        "relative flex h-[96px] w-[96px] shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed text-center transition-colors sm:h-[132px] sm:w-[116px]",
        isDragging
          ? "border-primary/60 bg-primary/5"
          : "border-border/70 bg-muted/10 hover:border-border hover:bg-muted/20"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => upload(e.target.files?.[0])}
      />
      {uploadedPreview || imageUrl ? (
        <>
          <img
            src={uploadedPreview || imageUrl}
            alt={copy("uploadPreviewAlt", zh ? "参考图预览" : "Uploaded image preview")}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setImageUrl("");
              setUploadedPreview(null);
            }}
            className="absolute right-1 top-1 rounded-md bg-black/55 p-1 text-white transition-colors hover:bg-black/75"
            title={copy("uploadRemove", zh ? "移除" : "Remove")}
            aria-label={copy("uploadRemove", zh ? "移除" : "Remove")}
          >
            <Icon name="RiCloseLine" className="size-3.5" />
          </button>
        </>
      ) : (
        <>
          <Icon name="RiUpload2Line" className="mb-1.5 size-5 text-muted-foreground" />
          <span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">
            {copy("uploadShortLabel", zh ? "上传" : "UPLOAD")}
          </span>
        </>
      )}
    </div>
  );

  const inputArea =
    inputMode === "text" ? (
      <div className="relative p-3 sm:p-3.5">
        <div className="relative">
          <Textarea
            id={`${id}-prompt`}
            placeholder={copy(
              "textPromptPlaceholder",
              zh ? "描述你想生成的视频内容…" : "Describe the content you want to create..."
            )}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, model.capabilities.maxPromptLength))}
            disabled={isBusy}
            className={promptFieldClassName}
          />
          {renderPromptActionButtons("absolute right-0 top-0 z-[1]")}
        </div>
      </div>
    ) : (
      <div className="relative p-3 sm:p-3.5">
        <div className="flex flex-col gap-2 sm:hidden">
          <div className="flex items-start justify-between gap-2">
            {imageUploadTile}
            {renderPromptActionButtons()}
          </div>
          <Textarea
            id={`${id}-motion-prompt-mobile`}
            placeholder={copy(
              "imagePromptPlaceholder",
              zh ? "可选：描述画面如何运动…" : "Optional: describe how the image should move..."
            )}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, model.capabilities.maxPromptLength))}
            disabled={isBusy}
            className="min-h-[72px] w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="hidden items-stretch gap-2.5 sm:flex">
          {imageUploadTile}
          <div className="relative min-w-0 flex-1">
            <Textarea
              id={`${id}-motion-prompt`}
              placeholder={copy(
                "imagePromptPlaceholder",
                zh ? "可选：描述画面如何运动…" : "Optional: describe how the image should move..."
              )}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, model.capabilities.maxPromptLength))}
              disabled={isBusy}
              className="min-h-[132px] h-full w-full resize-none border-0 bg-transparent p-0 pr-9 text-[15px] leading-relaxed shadow-none focus-visible:ring-0"
            />
            {renderPromptActionButtons("absolute right-0 top-0 z-[1]")}
          </div>
        </div>
      </div>
    );

  const controlsBar = (
    <div className="border-t border-border/35 px-3 py-2.5 sm:px-3.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
        <div className={cn(
          "grid w-full gap-1.5 *:min-w-0 sm:flex sm:min-w-0 sm:flex-1 sm:items-center sm:gap-2 sm:*:min-w-[unset]",
          mediaModels.length > 1 ? "grid-cols-2" : "grid-cols-3"
        )}>
          {mediaModels.length > 1 && (
            <Select
              value={modelId}
              onValueChange={(value) => {
                const next = mediaModels.find((m) => m.id === value);
                if (!next) return;
                setModelId(next.id);
              }}
              disabled={isBusy}
            >
              <SelectTrigger size="sm" className={modelSelectTriggerClass}>
                <SelectValue placeholder={copy("modelPlaceholder", zh ? "模型" : "Model")} />
              </SelectTrigger>
              <SelectContent>
                {mediaModels.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    <span className="flex w-full min-w-0 items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-1.5 truncate">
                        {item.tier === "pro" && (
                          <Crown className="size-3 shrink-0 text-amber-400" aria-hidden />
                        )}
                        <span className="truncate">{item.label}</span>
                      </span>
                      {item.tags && item.tags.length > 0 && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {item.tags.join(" · ")}
                        </span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={resolution} onValueChange={setResolution} disabled={isBusy}>
            <SelectTrigger size="sm" className={settingSelectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {model.capabilities.resolutions.map((item) => (
                <SelectItem key={item} value={formatResolutionLabel(item)}>
                  {formatResolutionLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={aspectRatio} onValueChange={setAspectRatio} disabled={isBusy}>
            <SelectTrigger size="sm" className={settingSelectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {model.capabilities.aspectRatios.map((item) => (
                <SelectItem key={item} value={item}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={duration} onValueChange={setDuration} disabled={isBusy}>
            <SelectTrigger size="sm" className={settingSelectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {model.capabilities.durations?.map((item) => (
                <SelectItem key={item} value={formatDurationLabel(item)}>
                  {formatDurationLabel(item)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end sm:shrink-0">
          <Button
            type="button"
            size="lg"
            disabled={isBusy || !canSubmit}
            onClick={generate}
            className="h-9 rounded-full bg-sky-500 px-5 text-sm text-white hover:bg-sky-600 sm:h-10 sm:min-w-[148px]"
          >
            {isBusy ? (
              <>
                <Icon name="RiLoader4Line" className="mr-2 size-4 animate-spin" />
                {copy("generatingText", zh ? "生成中…" : "Creating...")}
              </>
            ) : (
              <>
                {copy("createButtonText", zh ? "生成" : "Create")}
                <span className="mx-2 opacity-60">|</span>
                <Icon name="RiFlashlightLine" className="mr-1 size-4" />
                {creditCost}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  const creditWarning =
    user && insufficientCredits ? (
      <div className="px-3 pb-3 sm:px-3.5">
        <div className="rounded-lg border border-amber-500/45 bg-amber-500/8 px-3 py-2.5 text-center text-sm text-amber-200/90">
          <Icon name="RiFlashlightLine" className="mr-1 inline size-4 align-text-bottom text-amber-300" />
          {copy("creditsLowPrefix", zh ? "仅剩" : "Only")}{" "}
          <strong className="font-semibold text-amber-100">{leftCredits}</strong>{" "}
          {copy("creditsLowMiddle", zh ? "积分，本次需要" : "credits left — this generation needs")}{" "}
          <strong className="font-semibold text-amber-100">{creditCost}</strong>
          {pricing && !pricing.disabled ? (
            <>
              。{" "}
              <button
                type="button"
                onClick={() => setShowPricing(true)}
                className="font-medium text-amber-100 underline underline-offset-2 hover:text-white"
              >
                {copy("topUpLabel", zh ? "充值" : "Top up")}
              </button>
            </>
          ) : null}
        </div>
      </div>
    ) : null;

  return (
    <div id={id} className="mx-auto w-full max-w-3xl space-y-4 text-center">
      {featureBadges.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {featureBadges.map((label, index) => (
            <span
              key={label}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                BADGE_COLORS[badgeColors[index % badgeColors.length]]
              )}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {copy("toolSubtitle", "") && (
        <p className="text-sm text-muted-foreground">
          {copy(
            "toolSubtitle",
            zh
              ? "登录后使用积分生成视频，生成过程中请保持页面打开。"
              : "Sign in and use credits to generate. Keep this page open while the job runs."
          )}
        </p>
      )}

      {modeTabs}

      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card text-left shadow-sm">
        {inputArea}
        {controlsBar}
        {creditWarning}
      </div>

      {showSessionOutput && (
        <div ref={resultPanelRef}>
          {isBusy ? (
            <VideoGenerationProgress
              status={activeStatus}
              uploading={uploading}
              imageMode={inputMode === "image"}
              message={progressMessage}
              hint={copy(
                "generatingHint",
                zh ? "通常需要 1–3 分钟，请保持此页面打开。" : "This usually takes 1–3 minutes. Please keep this tab open."
              )}
              labels={{
                upload: copy("stepUpload", zh ? "上传" : "Upload"),
                submit: copy("stepSubmit", zh ? "提交" : "Submit"),
                generate: copy("stepGenerate", zh ? "生成" : "Generate"),
              }}
            />
          ) : displayVideoUrl ? (
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-card text-left shadow-sm">
              <div className="border-b border-border/40 px-4 py-3 sm:px-5">
                <p className="text-sm font-medium">
                  {copy("resultTitle", zh ? "生成结果" : "Your generated video")}
                </p>
                {sessionResultMeta && (
                  <p className="text-xs text-muted-foreground">
                    {sessionResultMeta.modelLabel} · {sessionResultMeta.resolution} ·{" "}
                    {sessionResultMeta.duration}
                  </p>
                )}
              </div>
              <video
                src={displayVideoUrl}
                controls
                playsInline
                className="aspect-video w-full bg-black"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 px-4 py-3 sm:px-5">
                <p className="text-xs text-muted-foreground">
                  {copy(
                    "resultSavedHint",
                    zh ? "已同步保存到历史记录，刷新后可在历史查看" : "Also saved to History — available after you leave or refresh"
                  )}
                </p>
                <Button asChild size="sm" variant="outline">
                  <a href={displayVideoUrl} download target="_blank" rel="noreferrer">
                    <Icon name="RiDownloadLine" className="mr-1 size-4" />
                    {copy("downloadLabel", zh ? "下载 MP4" : "Download MP4")}
                  </a>
                </Button>
              </div>
            </div>
          ) : resultTask?.status === "failed" ? (
            <p
              role="alert"
              className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {resultTask.error ??
                (zh ? "视频生成失败，积分已退还。" : "Video generation failed. Credits have been released.")}
            </p>
          ) : null}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">{error}</p>
      )}

      {footerTags.length > 0 && (
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {footerTags.map((tag, index) => (
            <span key={tag} className="inline-flex items-center gap-3">
              {index > 0 && <span className="text-sky-500/80">•</span>}
              {tag}
            </span>
          ))}
        </p>
      )}

      {!displayVideoUrl && !isBusy && <ToolHistoryLink />}

      <Dialog open={showPricing} onOpenChange={setShowPricing}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {copy("insufficientTitle", zh ? "需要更多积分" : "More credits needed")}
            </DialogTitle>
            <DialogDescription>
              {copy(
                "insufficientDescription",
                zh ? "选择适合你的套餐" : "Choose a plan to continue"
              )}
            </DialogDescription>
          </DialogHeader>
          {pricing && <Pricing pricing={pricing} embed />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
