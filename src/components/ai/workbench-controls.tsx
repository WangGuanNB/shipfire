"use client";

import * as React from "react";
import { workbenchCreditKey, type PublicWorkbenchVariant } from "@/ai/workbench-types";
import { Check, ImagePlus, LoaderCircle, Pencil } from "lucide-react";

/** Presentation only: values and prices always come from the public server configuration. */
export function WorkbenchQualityPicker({ variant, resolution, duration, audio, disabled, zh, onChange }: {
  variant: PublicWorkbenchVariant;
  resolution: string;
  duration: number;
  audio: string;
  disabled: boolean;
  zh: boolean;
  onChange(value: string): void;
}) {
  const name = React.useId();
  return <fieldset className="min-w-0 space-y-3" disabled={disabled}>
    <legend className="sr-only">{zh ? "画质" : "Video quality"}</legend>
    <div className="workbench-quality-grid">
      {variant.output.resolutions.map(value => {
        const cost = variant.credits[workbenchCreditKey(value, duration, audio)];
        const available = Number.isSafeInteger(cost);
        const title = value === "480p" ? (zh ? "标准版" : "Standard") : value === "720p" ? (zh ? "高清版" : "HD") : value.toUpperCase();
        const selected = value === resolution;
        return <label key={value} className="workbench-quality-option">
          <input type="radio" name={name} value={value} checked={selected} disabled={disabled || !available} onChange={() => onChange(value)} className="workbench-quality-input" />
          <span className="workbench-quality-card" data-selected={selected}>
            <span className="flex items-center justify-between gap-2">
              <span className="flex flex-wrap items-baseline gap-x-1.5"><span className="text-sm font-semibold">{title}</span><span className="text-[11px] text-muted-foreground">{value.toUpperCase()}</span></span>
              <span className="workbench-radio-mark" aria-hidden="true">{selected && <Check className="size-3" />}</span>
            </span>
            <span className="mt-1 flex flex-wrap items-baseline gap-x-1.5 tabular-nums">
              <span className="text-base font-semibold tracking-tight">{available ? cost : "—"}</span>
              <span className="text-xs text-muted-foreground">{available ? (zh ? "积分 / 条" : "credits / video") : (zh ? "暂不可用" : "Unavailable")}</span>
            </span>
          </span>
        </label>;
      })}
    </div>
  </fieldset>;
}

export function WorkbenchPhotoButton({ label, description, photo, uploading, disabled, zh, onClick }: {
  label: string;
  description: string;
  photo?: string;
  uploading: boolean;
  disabled: boolean;
  zh: boolean;
  onClick(): void;
}) {
  return <button type="button" className="workbench-photo-button" data-filled={!!photo} aria-label={`${photo ? (zh ? "更换照片" : "Change photo") : (zh ? "上传照片" : "Upload photo")}: ${label}`} aria-busy={uploading} disabled={disabled} onClick={onClick}>
    <span className="workbench-photo-canvas">
      {photo ? <img src={photo} alt={label} className="absolute inset-0 size-full object-contain" /> : <span className="flex flex-col items-center gap-2 px-2">
        <span className="workbench-upload-icon"><ImagePlus className="size-5" /></span>
        <span className="text-sm font-medium text-foreground">{zh ? "上传照片" : "Upload photo"}</span>
        <span className="text-xs leading-relaxed text-muted-foreground">{description}</span>
      </span>}
      {uploading && <span role="status" className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/90 text-sm"><LoaderCircle className="size-6 animate-spin text-primary" />{zh ? "上传中…" : "Uploading…"}</span>}
    </span>
    <span className="workbench-photo-footer">{photo ? <><span className="flex items-center gap-1.5"><Check className="size-3.5 text-primary" />{zh ? "已上传" : "Added"}</span><span className="flex items-center gap-1"><Pencil className="size-3" />{zh ? "更换" : "Change"}</span></> : <><span>JPG · PNG · WebP</span><span>10 MB</span></>}</span>
  </button>;
}

export function WorkbenchStep({ number, children }: { number: number; children: React.ReactNode }) {
  return <h3 className="workbench-step"><span aria-hidden="true">{String(number).padStart(2, "0")}</span>{children}</h3>;
}
