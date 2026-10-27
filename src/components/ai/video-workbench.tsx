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
import ChoiceButtons from "./choice-buttons";
import WorkbenchResult from "./workbench-result";
import { ToolResult } from "./tool-result-layout";
import Icon from "@/components/icon";
import { cn } from "@/lib/utils";
import GalleryVideo from "@/components/landing/gallery-video";
import { LANDING_PHOTO_UPLOAD_EVENT } from "@/components/landing/interactions";
import { videoWaitCopy } from "@/lib/video-generation-wait";

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
  embedInHero = false,
}: {
  page: PublicWorkbenchPage;
  pricing: PricingType | null;
  id?: string;
  sectionTitle?: string;
  sectionLead?: string;
  selectedExample?: { values: Record<string, string>; revision: number };
  toolSlot?: string;
  embedInHero?: boolean;
}) {
  const locale = useLocale();
  const lang = locale === "zh" ? "zh" : "en";
  const zh = lang === "zh";
  const wait = videoWaitCopy(zh);
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
  const [showResult, setShowResult] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskTool, setTaskTool] = useState<string>("video-generator");
  const [showPricing, setShowPricing] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
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
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const consentRef = useRef<HTMLInputElement>(null);
  identity.current = user?.uuid;
  const creditKey = variant ? workbenchCreditKey(resolution, duration, audio) : "";
  const credits = variant?.credits[creditKey];
  const missingPhoto = variant?.slots.find(slot => slot.required && images[slot.id]?.purpose !== slot.purpose);
  const photosReady = !!variant && !missingPhoto;
  const promptReady = !variant || variant.promptMode === "prefilled" || variant.promptMode === "locked" || variant.promptMode === "append" || prompt.trim().length > 0;
  const consentReady = !variant?.slots.length || consent;
  const ready = !!variant?.ready && photosReady && promptReady && consentReady && Number.isSafeInteger(credits);
  const nextStep = missingPhoto ? "photo" : !promptReady ? "prompt" : !consentReady ? "consent" : null;
  const nextLabel = nextStep === "photo" ? `${zh ? "上传" : "Upload"} ${missingPhoto?.label[lang]}`
    : nextStep === "prompt" ? (zh ? "填写提示词" : "Add your prompt")
    : nextStep === "consent" ? (zh ? "确认照片使用许可" : "Confirm photo permission") : null;
  const insufficient = !!user && (user.credits?.left_credits ?? 0) < (credits ?? 0);
  const example = variant?.examples.find(item => item.id === exampleId) ?? variant?.examples[0];

  useEffect(() => {
    if (!embedInHero || !showResult) return;
    const frame = requestAnimationFrame(() => previewRef.current?.scrollIntoView({behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block:"start"}));
    return () => cancelAnimationFrame(frame);
  }, [embedInHero, showResult, taskId]);

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
    const nextPrompt = nextVariant.promptSource === "preset" ? (nextVariant.defaultPrompt?.[lang] ?? "") : nextVariant.strategy === "image-reference"
      ? duoImagePrompt(lang, nextDuration, nextAspect)
      : nextVariant.strategy === "video-reference"
        ? duoVideoPrompt(lang, nextDuration, nextResolution)
        : (nextVariant.defaultPrompt?.[lang] ?? "");
    setPrompt(nextPrompt);
    setImages(keepPhotos);
    setExampleId(nextVariant.examples[0]?.id ?? "");
    setError("");
    setShowResult(false);
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
    if (variant?.promptSource === "preset") return;
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
      if (firstSlotId) choosePhoto(firstSlotId);
    }
    window.addEventListener(LANDING_PHOTO_UPLOAD_EVENT, handlePhotoUpload);
    return () => window.removeEventListener(LANDING_PHOTO_UPLOAD_EVENT, handlePhotoUpload);
  }, [toolSlot, variant?.slots, user?.uuid]);

  function choosePhoto(slotId: string) {
    if (!user) { setShowSignModal(true); return; }
    fileInputs.current[slotId]?.click();
  }

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
    if (!preset || !variant || busy || previewing || locked.current || !variant.ready) return;
    if (nextStep) {
      if (nextStep === "photo") {
        if (!user) { setShowSignModal(true); return; }
        if (missingPhoto) fileInputs.current[missingPhoto.id]?.click();
      } else {
        const target = nextStep === "prompt" ? promptRef.current : consentRef.current;
        target?.focus({ preventScroll: true });
        target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
      }
      return;
    }
    if (!ready) return;
    if (!user) { setShowSignModal(true); return; }
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
    if (embedInHero) setTaskId(null);
    setShowResult(true);
    if (!embedInHero) previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const allVideoReference = preset.variants.every(item => item.strategy === "video-reference");
  const useModalPicker = page.variantPicker === "modal" || (page.variantPicker !== "tabs" && page.variantPicker !== "cards" && allVideoReference);
  const useInlineCardPicker = page.variantPicker === "cards";

  function templatePreviewSrc(item: PublicWorkbenchVariant): string | undefined {
    return item.operatorPreviews.find(preview => preview.kind === "video")?.src ?? item.examples[0]?.src;
  }

  function selectTemplate(item: PublicWorkbenchVariant) {
    const kept = Object.fromEntries(Object.entries(images).filter(([slotId, photo]) => item.slots.some(slot => slot.id === slotId && slot.purpose === photo.purpose)));
    applyVariant(preset!, item, kept);
    setTaskId(null);
    setShowResult(false);
    setShowTemplatePicker(false);
  }

  const sidePreviewSrc = result
    ?? example?.src
    ?? templatePreviewSrc(variant);
  const selectedCredits = credits;
  return (
    <div className="w-full text-left">
      {!embedInHero && (sectionTitle || sectionLead) && <header className="mx-auto mb-6 max-w-3xl space-y-2 text-center md:mb-8">
        {sectionTitle && <h2 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{sectionTitle}</h2>}
        {sectionLead && <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{sectionLead}</p>}
      </header>}
      <div id={id} className="scroll-mt-20 min-w-0 max-w-full rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-5 md:scroll-mt-24 md:p-8">
        <div className={cn("grid min-w-0 gap-6 lg:items-start lg:gap-8", !embedInHero && "lg:grid-cols-2")}>
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
            {preset.variants.length === 1 && <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium">{variant.title[lang]}</span><span className="text-xs text-muted-foreground">{credits} {zh ? "积分" : "credits"}</span></div>}
            {!fidelityToggle && useModalPicker && preset.variants.length > 1 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{zh ? "模板" : "Template"}</p>
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/20 p-3">
                  <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {templatePreviewSrc(variant)
                      ? <GalleryVideo src={templatePreviewSrc(variant)!} label={variant.title[lang]} className="size-full object-cover" />
                      : <div className="flex size-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground">{variant.title[lang]}</div>}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-semibold">{variant.title[lang]}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{variant.description[lang]}</p>
                    {selectedCredits !== undefined && (
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {zh ? "约" : "From"} {selectedCredits} {zh ? "积分" : "credits"}
                      </p>
                    )}
                  </div>
                  {preset.variants.length > 1 && (
                    <Button type="button" variant="outline" size="sm" className="shrink-0 rounded-full" disabled={busy} onClick={() => setShowTemplatePicker(true)}>
                      <Icon name="RiAppsLine" className="mr-1 size-4" />
                      {zh ? "更换" : "Change"}
                    </Button>
                  )}
                </div>
              </div>
            )}
            {!fidelityToggle && preset.variants.length > 1 && useInlineCardPicker && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{zh ? "选择模板" : "Choose a template"}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="listbox" aria-label={zh ? "视频模板" : "Video templates"}>
                  {preset.variants.map(item => {
                    const itemCredits = item.credits[workbenchCreditKey(item.output.resolution, item.output.duration, item.output.audio)];
                    const selected = item.id === variant.id;
                    const previewSrc = templatePreviewSrc(item);
                    return (
                      <button
                        type="button"
                        key={item.id}
                        role="option"
                        aria-selected={selected}
                        disabled={busy || !item.ready}
                        onClick={() => selectTemplate(item)}
                        className={cn(
                          "overflow-hidden rounded-2xl border text-left transition-colors disabled:opacity-60",
                          selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40",
                        )}
                      >
                        <div className="relative aspect-[9/16] bg-muted">
                          {previewSrc
                            ? <GalleryVideo src={previewSrc} label={item.title[lang]} className="size-full object-cover" />
                            : <div className="flex size-full items-center justify-center px-2 text-center text-xs text-muted-foreground">{item.title[lang]}</div>}
                          {itemCredits !== undefined && (
                            <span className="absolute bottom-2 right-2 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground shadow-sm">
                              {itemCredits} {zh ? "积分" : "cr"}
                            </span>
                          )}
                        </div>
                        <div className="space-y-0.5 p-2.5">
                          <p className="text-sm font-medium leading-tight">{item.title[lang]}</p>
                          <p className="line-clamp-2 text-xs text-muted-foreground">{item.description[lang]}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {!fidelityToggle && preset.variants.length > 1 && !useModalPicker && !useInlineCardPicker && (
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
                      <button type="button" disabled={!variant.ready || busy} onClick={() => choosePhoto(slot.id)} className="relative flex h-[148px] w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border/70 bg-muted/20">
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
            {variant.defaultPrompt && variant.promptMode !== "locked" ? (
              <Collapsible>
                <CollapsibleTrigger className="group flex items-center gap-1 text-sm font-medium text-muted-foreground">
                  <Icon name="RiArrowRightSLine" className="size-4 transition-transform group-data-[state=open]:rotate-90" />
                  {zh ? "修改提示词" : "Edit prompt"}
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <Textarea ref={promptRef} value={prompt} disabled={busy || !variant.ready} rows={10} aria-label={zh ? "提示词" : "Prompt"} placeholder={zh ? "留空将使用内置提示词" : "Leave empty to use the built-in prompt"} onChange={event => { promptEdited.current = true; setPrompt(event.target.value); }} />
                </CollapsibleContent>
              </Collapsible>
            ) : variant.promptMode === "editable" ? (
              <label className="block space-y-2 text-sm">
                <span className="font-medium">{zh ? "提示词" : "Prompt"}</span>
                <Textarea ref={promptRef} value={prompt} disabled={busy || !variant.ready} rows={10} placeholder={zh ? "描述你想生成的视频" : "Describe the video"} onChange={event => { promptEdited.current = true; setPrompt(event.target.value); }} />
              </label>
            ) : null}
            {[variant.output.resolutions, variant.output.durations, variant.output.aspectRatios, variant.output.audioOptions].every(options => options.length === 1) ? <div className="rounded-xl bg-muted/30 px-3 py-3 text-xs text-muted-foreground">{resolution.toUpperCase()} · {duration}s · {aspectRatio} · {audio === "template" ? (zh ? "模板原音" : "Template sound") : audio === "generated" ? (zh ? "生成声音" : "Generated sound") : (zh ? "静音" : "Muted")}</div> : <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-row sm:flex-wrap">
              {variant.output.resolutions.length > 0 && (
                <label className="min-w-0 space-y-2 text-sm"><span className="block font-medium">{zh ? "画质" : "Quality"}</span>
                  <ChoiceButtons label={zh ? "画质" : "Quality"} value={resolution} disabled={busy || !variant.ready} onChange={setResolution} options={variant.output.resolutions.map(value => ({value, label:value.toUpperCase()}))} />
                </label>
              )}
              {variant.output.durations.length > 0 && (
                <label className="min-w-0 space-y-2 text-sm"><span className="block font-medium">{zh ? "时长" : "Duration"}</span>
                  <ChoiceButtons label={zh ? "时长" : "Duration"} value={String(duration)} disabled={busy || !variant.ready} onChange={value => setDuration(Number(value))} options={variant.output.durations.map(value => ({value:String(value), label:`${value}s`}))} />
                </label>
              )}
              {variant.output.aspectRatios.length > 1 && (
                <label className="col-span-2 min-w-0 space-y-2 text-sm sm:col-span-1"><span className="block font-medium">{zh ? "比例" : "Ratio"}</span>
                  <Select value={aspectRatio} disabled={busy || !variant.ready} onValueChange={setAspectRatio}><SelectTrigger className="h-10 w-full min-w-0 sm:w-[120px]"><SelectValue /></SelectTrigger><SelectContent>{variant.output.aspectRatios.map(item => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
                </label>
              )}
              {variant.output.audioOptions.length > 1 && (
                <label className="col-span-2 min-w-0 space-y-2 text-sm sm:col-span-1"><span className="block font-medium">{zh ? "声音" : "Audio"}</span>
                  <Select value={audio} disabled={busy || !variant.ready} onValueChange={value => setAudio(value as "off" | "generated" | "template")}><SelectTrigger className="h-10 w-full min-w-0 sm:w-[160px]"><SelectValue /></SelectTrigger><SelectContent>
                    {variant.output.audioOptions.map(item => <SelectItem key={item} value={item}>{item === "template" ? (zh ? "模板原音" : "Template sound") : item === "generated" ? (zh ? "生成声音" : "Generated") : (zh ? "关闭" : "Off")}</SelectItem>)}
                  </SelectContent></Select>
                </label>
              )}
            </div>}
            {!!variant.slots.length && (
              <label className="flex items-start gap-2 text-sm">
                <input ref={consentRef} type="checkbox" className="mt-1" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} />
                <span>{zh ? "我有权使用上传的照片，并同意把它们用于这次生成。" : "I have permission to use the uploaded photos for this generation."}</span>
              </label>
            )}
            <div className={cn("grid gap-2", page.showRequestPreview && "sm:grid-cols-2")}>
              {page.showRequestPreview && <Button type="button" variant="outline" className="h-12 w-full rounded-full" disabled={busy || previewing || !ready || task?.status === "needs_review"} onClick={() => void previewRequest()}>
                {previewing ? (zh ? "正在预览…" : "Previewing…") : (zh ? "预览本次请求" : "Preview this request")}
              </Button>}
              <Button type="button" aria-describedby={nextLabel ? `${id}-next-step` : undefined} className="h-auto min-h-12 w-full whitespace-normal rounded-full text-base font-semibold" disabled={busy || previewing || !variant.ready || !Number.isSafeInteger(credits) || task?.status === "needs_review"} onClick={() => void generate()}>
                {(submitting || (!!task && ACTIVE.includes(task.status))) ? (zh ? "处理中…" : "Processing…") : nextLabel ?? `${zh ? "开始制作" : "Make it"}${credits === undefined ? "" : ` · ${credits} ${zh ? "积分" : "credits"}`}`}
              </Button>
            </div>
            {nextLabel && <p id={`${id}-next-step`} role="status" className="text-sm text-muted-foreground">{zh ? "下一步：" : "Next: "}{nextLabel}</p>}
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
            {!embedInHero && (submitting || (!!task && ACTIVE.includes(task.status))) && <VideoGenerationProgress status={task?.status} uploading={false} imageMode={variant.slots.length > 0} message={wait.generating} hint={wait.hintResultRight} labels={{ upload: zh ? "上传" : "Upload", submit: zh ? "提交" : "Submit", generate: zh ? "生成" : "Generate" }} />}
          </div>
          {!embedInHero && <div ref={previewRef} className="scroll-mt-20 space-y-3 md:scroll-mt-24">
            <div className={cn("overflow-hidden rounded-2xl bg-muted", frameClass(aspectRatio))}>
              {sidePreviewSrc
                ? result
                  ? <video src={result} controls playsInline className="size-full object-contain" />
                  : <GalleryVideo src={sidePreviewSrc} label={variant.title[lang]} />
                : <div className="flex h-full min-h-48 items-center justify-center px-4 text-center text-sm text-muted-foreground">{zh ? "生成结果会显示在这里" : "Your video will appear here"}</div>}
            </div>
            {task?.error && <p className="text-sm text-destructive">{task.error}</p>}
          </div>}
        </div>
      </div>
      {embedInHero && showResult && <ToolResult><section ref={previewRef} className="scroll-mt-24" aria-labelledby={`${id}-result`}><WorkbenchResult headingId={`${id}-result`} status={task?.status} submitting={submitting} result={result} error={task?.error || error} aspectRatio={aspectRatio} zh={zh} /></section></ToolResult>}
      <Dialog open={showPricing} onOpenChange={setShowPricing}><DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
        <DialogHeader><DialogTitle>{zh ? "需要更多积分" : "More credits needed"}</DialogTitle><DialogDescription>{zh ? "选择适合你的套餐。" : "Choose a plan to continue."}</DialogDescription></DialogHeader>
        {pricing && <Pricing pricing={pricing} embed />}
      </DialogContent></Dialog>
      <Dialog open={showTemplatePicker} onOpenChange={setShowTemplatePicker}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{zh ? "选择模板" : "Choose a template"}</DialogTitle>
            <DialogDescription>
              {zh
                ? "每个模板都有独立的参照视频、提示词和输出参数。选中后会自动应用到下方表单。"
                : "Each template ships its own reference video, prompt and output settings. Your selection updates the form below."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2 sm:gap-3 lg:grid-cols-3" role="listbox" aria-label={zh ? "视频模板" : "Video templates"}>
            {preset.variants.map(item => {
              const itemCredits = item.credits[workbenchCreditKey(item.output.resolution, item.output.duration, item.output.audio)];
              const selected = item.id === variant.id;
              const previewSrc = templatePreviewSrc(item);
              return (
                <button
                  type="button"
                  key={item.id}
                  role="option"
                  aria-selected={selected}
                  disabled={busy || !item.ready}
                  onClick={() => selectTemplate(item)}
                  className={cn(
                    "flex gap-3 overflow-hidden rounded-2xl border p-2.5 text-left transition-colors disabled:opacity-60 sm:flex-col sm:gap-0 sm:p-0",
                    selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="relative h-[84px] w-[60px] shrink-0 overflow-hidden rounded-lg bg-muted sm:aspect-[9/16] sm:h-auto sm:max-h-44 sm:w-full sm:rounded-none">
                    {previewSrc
                      ? <GalleryVideo src={previewSrc} label={item.title[lang]} className="size-full object-cover" />
                      : <div className="flex size-full items-center justify-center px-1 text-center text-[10px] text-muted-foreground">{item.title[lang]}</div>}
                    {selected && (
                      <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground sm:left-2 sm:top-2 sm:px-2 sm:text-[11px]">
                        {zh ? "已选" : "Selected"}
                      </span>
                    )}
                    {itemCredits !== undefined && (
                      <span className="absolute bottom-1 right-1 hidden rounded-full bg-background/90 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-foreground shadow-sm sm:inline sm:bottom-2 sm:right-2 sm:px-2 sm:text-[11px]">
                        {itemCredits} {zh ? "积分" : "cr"}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1 py-0.5 sm:space-y-1.5 sm:p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-tight">{item.title[lang]}</p>
                      {itemCredits !== undefined && (
                        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground sm:hidden">
                          {itemCredits} {zh ? "积分" : "cr"}
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{item.description[lang]}</p>
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                      <span className="rounded-full bg-muted px-2 py-0.5">{item.output.duration}s</span>
                      <span className="rounded-full bg-muted px-2 py-0.5">{item.output.resolution.toUpperCase()}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5">{item.output.aspectRatio}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
