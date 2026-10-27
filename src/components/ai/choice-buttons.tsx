"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/** Keep a small set of important options visible, with touch and keyboard focus targets. */
export default function ChoiceButtons({ label, value, options, disabled, onChange }: {
  label: string; value: string; options: { value: string; label: string }[];
  disabled?: boolean; onChange(value: string): void;
}) {
  return <div role="group" aria-label={label} className="flex flex-wrap gap-2">
    {options.map(option => <button type="button" key={option.value} disabled={disabled} aria-pressed={option.value === value}
      onClick={() => onChange(option.value)} className={cn("min-h-11 min-w-11 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50", option.value === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary")}>{option.label}</button>)}
  </div>;
}
