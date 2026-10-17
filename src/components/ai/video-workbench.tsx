"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useAppContext } from "@/contexts/app";
import { TaskRequestError, useAITasks } from "@/hooks/use-ai-tasks";
import { duoImagePrompt } from "@/ai/duo-image-prompt";
import { duoVideoPrompt } from "@/ai/duo-video-prompt";
import { workbenchCreditKey, type PublicWorkbenchPage, type PublicWorkbenchPreset, type PublicWorkbenchVariant } from "@/ai/workbench-types";
import type { Pricing as PricingType } from "@/types/blocks/pricing";
import Pricing from "@/components/blocks/pricing";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import VideoGenerationProgress from "./video-generation-progress";
import Icon from "@/components/icon";
import { cn } from "@/lib/utils";
import GalleryVideo from "@/components/landing/gallery-video";
import { LANDING_PHOTO_UPLOAD_EVENT } from "@/components/landing/interactions";

const ACTIVE = ["queued", "submitting", "running"];

function frameClass(ratio?: string) {
  if (ratio === "9:16") return "mx-auto aspect-[9/16] max-h-[68vh] w-auto max-w-full";
  if (ratio === "1:1") return "aspect-square w-full";
  return "aspect-video w-full";
}

export default function VideoWorkbench({
  page,
  pricing,
  id = "video-workbench",
  sectionTitle,
  sectionLead,
  selectedExample,
  toolSlot,
}: {
  page: PublicWorkbenchPage;
  pricing: PricingType | null;
  id?: string;
  sectionTitle?: string;
  sectionLead?: string;
  selectedExample?: { values: Record<string, string>; revision: number };
  toolSlot?: string;
}) {
  const locale = useLocale();
  const lang = locale === "zh" ? "zh" : "en";
  const zh = lang === "zh";
  const { user, setShowSignModal, fetchUserInfo } = useAppContext();
  const videoTasks = useAITasks("video-generator", user?.uuid);
  const referenceTasks = useAITasks("reference-video", user?.uuid);
  const [presetId, setPresetId] = useState(page.defaultPresetId);
  const [variantId, setVariantId] = useState(page.defaultVariantId);
  const preset = page.presets.find(item => item.id === presetId) ?? page.presets[0];
  const variant = preset?.variants.find(item => item.id === variantId) ?? preset?.variants[0];
  const [resolution, setResolution] = useState(variant?.output.resolution ?? "720p");
  const [duration, setDuration] = useState(variant?.output.duration ?? 5);
  const [aspectRatio, setAspectRatio] = useState(variant?.output.aspectRatio ?? "9:16");
  const [prompt, setPrompt] = useState(variant?.defaultPrompt?.[lang] ?? "");
  const [audio, setAudio] = useState(variant?.output.audio ?? "off");
  const [consent, setConsent] = useState(false);
  const [images, setImages] = useState<Record<string, { url: string; purpose: string }>>({});
  const [exampleId, setExampleId] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskTool, setTaskTool] = useState<string>("video-generator");
  const [showPricing, setShowPricing] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [requestPreview, setRequestPreview] = useState<{
    credits: number;
    includesReferenceVideo: boolean;
    request: Record<string, unknown>;
  } | null>(null);
  const tasks = taskTool === "reference-video" ? referenceTasks.tasks : videoTasks.tasks;
  const submitting = videoTasks.submitting || referenceTasks.submitting;
  const task = tasks.find(item => item.id === taskId);
  const result = task?.artifacts.find(item => item.kind === "video")?.url;
  const busy = uploading !== null || submitting || (!!task && ACTIVE.includes(task.status));
  const locked = useRef(false);
  const identity = useRef(user?.uuid);
  const selection = useRef(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  const promptEdited = useRef(false);
  identity.current = user?.uuid;
  const creditKey = variant ? workbenchCreditKey(resolution, duration, audio) : "";
  const credits = variant?.credits[creditKey];
  const photosReady = !!variant && variant.slots.every(slot => !slot.required || images[slot.id]?.purpose === slot.purpose);
  const promptReady = !variant || variant.promptMode === "prefilled" || variant.promptMode === "locked" || variant.promptMode === "append" || prompt.trim().length > 0;
  const consentReady = !variant?.slots.length || consent;
  const ready = !!variant?.ready && photosReady && promptReady && consentReady && Number.isSafeInteger(credits);
  const insufficient = !!user && (user.credits?.left_credits ?? 0) < (credits ?? 0);
  const example = variant?.examples.find(item => item.id === exampleId) ?? variant?.examples[0];

  function applyVariant(nextPreset: PublicWorkbenchPreset, nextVariant: PublicWorkbenchVariant, keepPhotos: Record<string, { url: string; purpose: string }>) {
    selection.current += 1;
    setPresetId(nextPreset.id);
    setVariantId(nextVariant.id);
    setResolution(nextVariant.output.resolutions.includes(resolution) ? resolution : nextVariant.output.resolution);
    setDuration(nextVariant.output.durations.includes(duration) ? duration : nextVariant.output.duration);
    setAspectRatio(nextVariant.output.aspectRatios.includes(aspectRatio) ? aspectRatio : nextVariant.output.aspectRatio);
    setAudio(nextVariant.output.audioOptions.includes(audio) ? audio : nextVariant.output.audio);
    promptEdited.current = false;
    const nextDuration = nextVariant.output.durations.includes(duration) ? duration : nextVariant.output.duration;
    const nextResolution = nextVariant.output.resolutions.includes(resolution) ? resolution : nextVariant.output.resolution;
    const nextAspect = nextVariant.output.aspectRatios.includes(aspectRatio) ? aspectRatio : nextVariant.output.aspectRatio;
    const nextPrompt = nextVariant.strategy === "image-reference"
      ? duoImagePrompt(lang, nextDuration, nextAspect)
      : nextVariant.strategy === "video-reference"
        ? duoVideoPrompt(lang, nextDuration, nextResolution)
        : (nextVariant.defaultPrompt?.[lang] ?? "");
    setPrompt(nextPrompt);
    setImages(keepPhotos);
    setExampleId(nextVariant.examples[0]?.id ?? "");
    setError("");
  }

  useEffect(() => {
    const values = selectedExample?.values;
    if (!values) return;
    const nextPreset = values.presetId ? page.presets.find(item => item.id === values.presetId) : preset;
    const nextVariant = values.variantId ? nextPreset?.variants.find(item => item.id === values.variantId) : nextPreset?.variants[0];
    if (!nextPreset || !nextVariant || busy) return;
    const kept = Object.fromEntries(Object.entries(images).filter(([slotId, photo]) => {
      const slot = nextVariant.slots.find(item => item.id === slotId);
      return slot?.purpose === photo.purpose;
    }));
    applyVariant(nextPreset, nextVariant, kept);
    if (values.exampleId && nextVariant.examples.some(item => item.id === values.exampleId)) setExampleId(values.exampleId);
    // Only the gallery click should move the form. Photo state is read once per click.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExample?.revision]);

  useEffect(() => {
    if (promptEdited.current) return;
    if (variant?.strategy === "image-reference") setPrompt(duoImagePrompt(lang, duration, aspectRatio));
    if (variant?.strategy === "video-reference") setPrompt(duoVideoPrompt(lang, duration, resolution));
  }, [variant?.strategy, lang, duration, aspectRatio, resolution]);
  useEffect(() => { setRequestPreview(null); }, [variantId, duration, resolution, aspectRatio, audio, prompt, images]);
  useEffect(() => { setImages({}); setTaskId(null); setConsent(false); setError(""); }, [user?.uuid]);
  useEffect(() => {
    if (task && ["succeeded", "failed"].includes(task.status)) void fetchUserInfo();
  }, [task?.id, task?.status, fetchUserInfo]);

  useEffect(() => {
    if (!toolSlot) return;
    function handlePhotoUpload(event: Event) {
      const detail = (event as CustomEvent<{ tool: string }>).detail;
      if (detail?.tool !== toolSlot) return;
      const firstSlotId = variant?.slots[0]?.id;
      if (firstSlotId) fileInputs.current[firstSlotId]?.click();
    }
    window.addEventListener(LANDING_PHOTO_UPLOAD_EVENT, handlePhotoUpload);
    return () => window.removeEventListener(LANDING_PHOTO_UPLOAD_EVENT, handlePhotoUpload);
  }, [toolSlot, variant?.slots]);

  async function upload(slotId: string, purpose: string, file?: File) {
    if (!file || busy || locked.current || !variant) return;
    if (!user) { setShowSignModal(true); return; }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
      setError(zh ? "请上传不超过 10MB 的 JPG、PNG 或 WebP 图片。" : "Use a JPG, PNG or WebP image up to 10MB.");
      return;
    }
    const owner = user.uuid;
    const ticket = selection.current;
    locked.current = true;
    setUploading(slotId);
    setError("");
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
      if (identity.current === owner && ticket === selection.current) {
        setImages(old => ({ ...old, [slotId]: { url: result.imageUrl, purpose } }));
      }
    } catch (cause) {
      if (identity.current === owner) setError(cause instanceof Error ? cause.message : "Upload failed");
    } finally {
      locked.current = false;
      setUploading(null);
    }
  }

  function requestInput() {
    if (!preset || !variant) return null;
    if (variant.strategy === "text" || variant.strategy === "first-frame") {
      return {
        mode: variant.strategy === "text" ? "text" : "image",
        prompt: prompt.trim(),
        resolution, duration, aspectRatio, locale,
        ...(variant.strategy === "first-frame" ? { imageUrl: images.frame?.url } : {}),
      };
    }
    return {
      presetId: preset.id,
      presetVersion: preset.version,
      variantId: variant.id,
      pricingVersion: variant.pricingVersion,
      resolution, duration, aspectRatio, audio, locale,
      consent: true,
      ...(example?.id ? { exampleId: example.id } : {}),
      ...(variant.promptMode === "prefilled" || variant.promptMode === "append" ? { prompt: prompt.trim() } : {}),
      images: variant.slots.filter(slot => images[slot.id]).map(slot => ({ slotId: slot.id, url: images[slot.id].url })),
    };
  }

  async function previewRequest() {
    if (!user) { setShowSignModal(true); return; }
    if (!preset || !variant || !ready || busy || previewing || locked.current) return;
    const input = requestInput();
    if (!input) return;
    setPreviewing(true);
    setError("");
    try {
      const response = await fetch("/api/ai/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId: variant.toolId, modelId: variant.modelId, input }),
      });
      const result = await response.json();
      if (response.status === 401) { setShowSignModal(true); return; }
      if (!response.ok) throw new Error(result.error || "Preview failed");
      setRequestPreview({
        credits: result.credits,
        includesReferenceVideo: result.includesReferenceVideo === true,
        request: result.request ?? {},
      });
    } catch (cause) {
      setRequestPreview(null);
      setError(cause instanceof Error ? cause.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  async function generate() {
    if (!user) { setShowSignModal(true); return; }
    if (!preset || !variant || !ready || busy || previewing || locked.current) return;
    if (insufficient && pricing && !pricing.disabled) { setShowPricing(true); return; }
    const owner = user.uuid;
    const ticket = selection.current;
    const base = requestInput();
    if (!base) return;
    locked.current = true;
    setError("");
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const hook = variant.toolId === "reference-video" ? referenceTasks : videoTasks;
      const created = await hook.submit(variant.modelId, base);
      if (identity.current === owner && ticket === selection.current) {
        setTaskTool(variant.toolId);
        setTaskId(created.id);
        await fetchUserInfo();
      }
    } catch (cause) {
      if (identity.current !== owner) return;
      if (cause instanceof TaskRequestError && cause.status === 401) setShowSignModal(true);
      else if (cause instanceof TaskRequestError && cause.status === 402 && pricing && !pricing.disabled) setShowPricing(true);
      setError(cause instanceof Error ? cause.message : "Generation failed");
    } finally {
      locked.current = false;
    }
  }

  if (!preset || !variant) return <p>{zh ? "此站点未启用视频生成方案。" : "No video options are enabled."}</p>;
  const standardVariant = preset.variants.find(item => item.strategy === "image-reference");
  const fidelityVariant = preset.variants.find(item => item.strategy === "video-reference");
  const fidelityToggle = !!standardVariant && !!fidelityVariant && preset.variants.length === 2;
  return (
    <div className="w-full text-left">
      {(sectionTitle || sectionLead) && <header className="mx-auto mb-6 max-w-3xl space-y-2 text-center md:mb-8">
        {sectionTitle && <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{sectionTitle}</h2>}
        {sectionLead && <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{sectionLead}</p>}
      </header>}
      <div id={id} className="scroll-mt-20 min-w-0 max-w-full rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-5 md:scroll-mt-24 md:p-8">
        <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start lg:gap-8">
          <div className="min-w-0 space-y-4">
            {page.showPresetPicker && page.presets.length > 1 && (
              <div className="space-y-2 text-sm font-medium">
                <span className="block">{zh ? "玩法" : "Preset"}</span>
                <Select value={preset.id} disabled={busy} onValueChange={value => {
                  const next = page.presets.find(item => item.id === value);
                  const nextVariant = next?.variants.find(item => item.id === next.defaultVariantId) ?? next?.variants[0];
                  if (!next || !nextVariant) return;
                  applyVariant(next, nextVariant, {});
                  setConsent(false);
                  setTaskId(null);
                }}>
                  <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>{page.presets.map(item => <SelectItem key={item.id} value={item.id}>{item.title[lang]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {fidelityToggle && standardVariant && fidelityVariant && (
              <label className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                <input type="checkbox" className="mt-1" checked={variant.strategy === "video-reference"} disabled={busy || !variant.ready} onChange={event => {
                  const next = event.target.checked ? fidelityVariant : standardVariant;
                  const kept = Object.fromEntries(Object.entries(images).filter(([slotId, photo]) => next.slots.some(slot => slot.id === slotId && slot.purpose === photo.purpose)));
                  applyVariant(preset, next, kept);
                  setTaskId(null);
                }} />
                <span>
                  <span className="font-medium">{zh ? "高还原" : "Higher fidelity"}</span>
                  <span className="mt-1 block text-muted-foreground">{zh ? "沿用模板的动作和节奏。不勾选时只使用照片和提示词。" : "Follow the template's motion and timing. Leave this off to use your photos and the prompt only."}</span>
                </span>
              </label>
            )}
            {!fidelityToggle && preset.variants.length > 1 && (
              <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted/50 p-1" role="group" aria-label={zh ? "生成方式" : "Generation option"}>
                {preset.variants.map(item => {
                  const itemCredits = item.credits[workbenchCreditKey(item.output.resolution, item.output.duration, item.output.audio)];
                  const selected = item.id === variant.id;
                  const choice = item.strategy === "image-reference"
                    ? (zh ? "参考图片" : "Photo")
                    : item.strategy === "video-reference"
                      ? (zh ? "参考视频" : "Video")
                      : item.title[lang];
                  return (
                    <button type="button" key={item.id} disabled={busy} aria-pressed={selected} onClick={() => {
                      const kept = Object.fromEntries(Object.entries(images).filter(([slotId, photo]) => item.slots.some(slot => slot.id === slotId && slot.purpose === photo.purpose)));
                      applyVariant(preset, item, kept);
                      setTaskId(null);
                    }} className={cn(
                      "flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors disabled:opacity-60",
                      selected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}>
                      <span>{choice}</span>
                      {itemCredits !== undefined && <span className={cn("text-xs tabular-nums", selected ? "text-primary" : "text-muted-foreground")}>{itemCredits}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            {!variant.ready && <p role="status" className="rounded-lg border border-border bg-muted p-3 text-sm">{zh ? "这个方案还不能生成，也不会扣积分。" : "This option is not ready. It will not generate or charge credits."}</p>}
            {!!variant.slots.length && (
              <div className={cn("grid gap-3", variant.slots.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
                {variant.slots.map(slot => {
                  const photo = images[slot.id]?.purpose === slot.purpose ? images[slot.id] : undefined;
                  return (
                    <div key={`${variant.id}-${slot.id}`} className="min-w-0 space-y-2">
                      <p className="text-sm font-medium">{slot.label[lang]}</p>
                      <input ref={element => { fileInputs.current[slot.id] = element; }} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={!variant.ready || busy} onChange={event => { const file = event.target.files?.[0]; event.target.value = ""; void upload(slot.id, slot.purpose, file); }} />
                      <button type="button" disabled={!variant.ready || busy} onClick={() => fileInputs.current[slot.id]?.click()} className="relative flex h-[148px] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border/70 bg-muted/20">
                        {photo ? <img src={photo.url} alt={slot.label[lang]} className="absolute inset-0 size-full object-cover" /> : <span className="px-3 text-center text-sm text-muted-foreground">{slot.description[lang]}</span>}
                        {uploading === slot.id && <span className="absolute inset-0 flex items-center justify-center bg-background/75"><Icon name="RiLoader4Line" className="size-8 animate-spin text-primary" /></span>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {page.showOperatorPreview && variant.operatorPreviews.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{zh ? "已使用的预设素材" : "Preset material in use"}</p>
                <div className="flex gap-2 overflow-x-auto">
                  {variant.operatorPreviews.map(item => (
                    <div key={item.id} className="w-24 shrink-0">
                      {item.kind === "image" ? <img src={item.src} alt={item.label[lang]} className="aspect-[9/16] w-full rounded-lg object-cover" /> : <GalleryVideo src={item.src} label={item.label[lang]} className="aspect-[9/16] w-full rounded-lg object-cover" />}
                      <p className="mt-1 text-xs text-muted-foreground">{item.label[lang]}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {variant.defaultPrompt ? (
              <Collapsible>
                <CollapsibleTrigger className="group flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  <Icon name="RiArrowRightSLine" className="size-4 transition-transform group-data-[state=open]:rotate-90" />
                  {zh ? "修改提示词" : "Edit prompt"}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <Textarea value={prompt} disabled={busy || !variant.ready} rows={10} aria-label={zh ? "提示词" : "Prompt"} placeholder={zh ? "留空将使用内置提示词" : "Leave empty to use the built-in prompt"} onChange={event => { promptEdited.current = true; setPrompt(event.target.value); }} />
                </CollapsibleContent>
              </Collapsible>
            ) : variant.promptMode === "editable" ? (
              <label className="block space-y-2 text-sm">
                <span className="font-medium">{zh ? "提示词" : "Prompt"}</span>
                <Textarea value={prompt} disabled={busy || !variant.ready} rows={10} placeholder={zh ? "描述你想生成的视频" : "Describe the video"} onChange={event => { promptEdited.current = true; setPrompt(event.target.value); }} />
              </label>
            ) : null}
            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:flex-wrap">
              {variant.output.resolutions.length > 0 && (
                <label className="min-w-0 space-y-2 text-sm"><span className="block font-medium">{zh ? "画质" : "Quality"}</span>
                  <Select value={resolution} disabled={busy || !variant.ready} onValueChange={setResolution}><SelectTrigger className="h-10 w-full min-w-0 sm:w-[140px]"><SelectValue /></SelectTrigger><SelectContent>{variant.output.resolutions.map(item => <SelectItem key={item} value={item}>{item.toUpperCase()}</SelectItem>)}</SelectContent></Select>
                </label>
              )}
              {variant.output.durations.length > 0 && (
                <label className="min-w-0 space-y-2 text-sm"><span className="block font-medium">{zh ? "时长" : "Duration"}</span>
                  <Select value={String(duration)} disabled={busy || !variant.ready} onValueChange={value => setDuration(Number(value))}><SelectTrigger className="h-10 w-full min-w-0 sm:w-[120px]"><SelectValue /></SelectTrigger><SelectContent>{variant.output.durations.map(item => <SelectItem key={item} value={String(item)}>{item}s</SelectItem>)}</SelectContent></Select>
                </label>
              )}
              {variant.output.aspectRatios.length > 1 && (
                <label className="col-span-2 min-w-0 space-y-2 text-sm sm:col-span-1"><span className="block font-medium">{zh ? "比例" : "Ratio"}</span>
                  <Select value={aspectRatio} disabled={busy || !variant.ready} onValueChange={setAspectRatio}><SelectTrigger className="h-10 w-full min-w-0 sm:w-[120px]"><SelectValue /></SelectTrigger><SelectContent>{variant.output.aspectRatios.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
                </label>
              )}
              {variant.output.audioOptions.length > 1 && (
                <label className="col-span-2 min-w-0 space-y-2 text-sm sm:col-span-1"><span className="block font-medium">{zh ? "声音" : "Audio"}</span>
                  <Select value={audio} disabled={busy || !variant.ready} onValueChange={value => setAudio(value as "off" | "generated")}><SelectTrigger className="h-10 w-full min-w-0 sm:w-[160px]"><SelectValue /></SelectTrigger><SelectContent>
                    {variant.output.audioOptions.map(item => <SelectItem key={item} value={item}>{item === "generated" ? (zh ? "生成声音" : "Generated") : (zh ? "关闭" : "Off")}</SelectItem>)}
                  </SelectContent></Select>
                </label>
              )}
            </div>
            {!!variant.slots.length && (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-1" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} />
                <span>{zh ? "我有权使用上传的照片，并同意把它们用于这次生成。" : "I have permission to use the uploaded photos for this generation."}</span>
              </label>
            )}
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" className="h-12 w-full rounded-full" disabled={busy || previewing || !ready || task?.status === "needs_review"} onClick={() => void previewRequest()}>
                {previewing ? (zh ? "正在预览…" : "Previewing…") : (zh ? "预览本次请求" : "Preview this request")}
              </Button>
              <Button type="button" className="h-12 w-full rounded-full text-base font-semibold" disabled={busy || previewing || !ready || task?.status === "needs_review"} onClick={() => void generate()}>
                {(submitting || (!!task && ACTIVE.includes(task.status))) ? (zh ? "处理中…" : "Processing…") : `${zh ? "开始制作" : "Make it"}${credits === undefined ? "" : ` · ${credits} ${zh ? "积分" : "credits"}`}`}
              </Button>
            </div>
            {requestPreview && (
              <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{zh ? "这是预览。没有扣积分，也没有请求生成接口。" : "Preview only. No credits were charged and no generation request was sent."}</p>
                <p>{requestPreview.includesReferenceVideo ? (zh ? "会带上站内参照视频。" : "The site template video is included.") : (zh ? "不带参照视频，只发照片和提示词。" : "No reference video. Only the photos and prompt are included.")}</p>
                <p className="tabular-nums">{zh ? "若真正生成，将扣" : "A real generation would cost"} {requestPreview.credits} {zh ? "积分。" : "credits."}</p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-background p-3 text-xs">{JSON.stringify(requestPreview.request, null, 2)}</pre>
              </div>
            )}
            {insufficient && <p className="text-sm text-muted-foreground">{zh ? "当前积分不足。" : "You need more credits."}{pricing && !pricing.disabled && <button type="button" className="ml-2 text-primary underline" onClick={() => setShowPricing(true)}>{zh ? "充值" : "Get credits"}</button>}</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {(submitting || (!!task && ACTIVE.includes(task.status))) && <VideoGenerationProgress status={task?.status} uploading={false} imageMode={variant.slots.length > 0} message={zh ? "正在生成" : "Generating"} hint={zh ? "完成后会出现在右侧" : "The result will show on the right"} labels={{ upload: zh ? "上传" : "Upload", submit: zh ? "提交" : "Submit", generate: zh ? "生成" : "Generate" }} />}
          </div>
          <div ref={previewRef} className="scroll-mt-20 space-y-3 md:scroll-mt-24">
            <div className={cn("overflow-hidden rounded-2xl bg-muted", frameClass(aspectRatio))}>
              {result ? <video src={result} controls playsInline className="size-full object-contain" /> : example ? <GalleryVideo src={example.src} label={example.label[lang]} /> : <div className="flex h-full min-h-48 items-center justify-center px-4 text-center text-sm text-muted-foreground">{zh ? "生成结果会显示在这里" : "Your video will appear here"}</div>}
            </div>
            {task?.error && <p className="text-sm text-destructive">{task.error}</p>}
          </div>
        </div>
      </div>
      <Dialog open={showPricing} onOpenChange={setShowPricing}><DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader><DialogTitle>{zh ? "需要更多积分" : "More credits needed"}</DialogTitle><DialogDescription>{zh ? "选择适合你的套餐。" : "Choose a plan to continue."}</DialogDescription></DialogHeader>
        {pricing && <Pricing pricing={pricing} embed />}
      </DialogContent></Dialog>
    </div>
  );
}
