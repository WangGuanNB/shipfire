"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export interface ToolSelection {
  tool: string;
  values: Record<string, string>;
  revision: number;
}

export const LANDING_PHOTO_UPLOAD_EVENT = "landing-tool-photo-upload";
export const LANDING_VIDEO_UPLOAD_EVENT = "landing-tool-video-upload";
export const LANDING_TOOL_OPEN_EVENT = "landing-tool-open";

const Context = createContext<{
  selection: ToolSelection | null;
  select: (tool: string, values: Record<string, string>) => void;
  requestPhotoUpload: (tool: string, values: Record<string, string>) => void;
  requestVideoUpload: (tool: string, values: Record<string, string>) => void;
  anchors: Record<string, string>;
} | null>(null);

export function LandingInteractions({ children, anchors }: { children: ReactNode; anchors: Record<string, string> }) {
  const [selection, setSelection] = useState<ToolSelection | null>(null);

  function focusTool(tool: string) {
    const target = document.getElementById(anchors[tool]);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    return target;
  }

  function select(tool: string, values: Record<string, string>) {
    setSelection((previous) => ({ tool, values, revision: (previous?.revision ?? 0) + 1 }));
    window.dispatchEvent(new CustomEvent(LANDING_TOOL_OPEN_EVENT, { detail: { tool } }));
    const target = focusTool(tool);
    target?.querySelector<HTMLElement>("textarea, input, button")?.focus({ preventScroll: true });
  }

  function requestPhotoUpload(tool: string, values: Record<string, string>) {
    select(tool, values);
    window.dispatchEvent(
      new CustomEvent(LANDING_PHOTO_UPLOAD_EVENT, {
        detail: { tool, inputMode: values.inputMode, templateId: values.templateId },
      }),
    );
  }

  function requestVideoUpload(tool: string, values: Record<string, string>) {
    select(tool, { ...values, inputMode: values.inputMode || "transform" });
    window.dispatchEvent(new CustomEvent(LANDING_VIDEO_UPLOAD_EVENT, { detail: { tool, inputMode: values.inputMode } }));
  }

  return (
    <Context.Provider value={{ selection, anchors, select, requestPhotoUpload, requestVideoUpload }}>
      {children}
    </Context.Provider>
  );
}

export function useLandingToolActions() {
  const context = useContext(Context);
  if (!context) {
    return {
      select: () => {},
      requestPhotoUpload: () => {},
      requestVideoUpload: () => {},
    };
  }
  return context;
}

export function useToolSelection(tool: string) {
  const context = useContext(Context);
  return context?.selection?.tool === tool ? context.selection : undefined;
}

export function UseSampleButton({
  label,
  tool,
  values,
}: {
  label: string;
  tool: string;
  values: Record<string, string>;
}) {
  const context = useContext(Context);
  if (!context?.anchors[tool]) return null;
  return (
    <button
      type="button"
      className="pointer-events-auto absolute inset-x-2 bottom-2 z-20 rounded-full bg-primary px-2 py-1.5 text-[11px] font-medium leading-tight text-primary-foreground shadow-sm lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
      onClick={() => context.select(tool, values)}
    >
      {label}
    </button>
  );
}

export function ExampleAction({
  label,
  tool,
  values,
}: {
  label: string;
  tool: string;
  values: Record<string, string>;
}) {
  const context = useContext(Context);
  if (!context?.anchors[tool]) return null;
  function handleClick() {
    if (values.inputMode === "viral" || values.inputMode === "image") {
      context!.requestPhotoUpload(tool, values);
      return;
    }
    if (values.inputMode === "transform") {
      context!.requestVideoUpload(tool, values);
      return;
    }
    context!.select(tool, values);
  }
  return (
    <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" onClick={handleClick}>
      {label}
    </Button>
  );
}
