"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import VideoTool from "./video-tool";
import ReferenceVideoTool from "./reference-video-tool";
import VideoWorkbench from "./video-workbench";
import type { ToolModel, MediaModel } from "@/ai/types";
import type { PublicReferencePreset } from "@/ai/reference-video-types";
import type { PublicWorkbenchPage } from "@/ai/workbench-types";
import type { Pricing } from "@/types/blocks/pricing";
import { cn } from "@/lib/utils";

type Mode = "text" | "image" | "reference";
export interface VideoStudioProps {
  models: ToolModel[];
  pricing: Pricing | null;
  referencePresets?: PublicReferencePreset[];
  workbench?: PublicWorkbenchPage | null;
  id?: string;
  tool?: Record<string, unknown>;
  embed?: boolean;
  example?: { values: Record<string, string>; revision: number };
}

/** One configurable shell. A workbench page replaces the three technical tabs. */
export default function VideoStudio({ referencePresets, workbench, ...props }: VideoStudioProps) {
  const zh = useLocale() === "zh";
  const pickerModels = props.models.filter(model => model.audience !== "workbench");
  /** Reference mode is opt-in via `inputModes` (e.g. `reference` or `text|image|reference`). */
  const pageModes = String(props.tool?.inputModes ?? "text|image").split("|").map(s => s.trim()).filter(Boolean);
  const modes: Mode[] = (["text", "image", "reference"] as Mode[]).filter(mode =>
    pageModes.includes(mode) && (mode === "reference" ? referencePresets !== undefined : pickerModels.some(m => (m as MediaModel).capabilities.modes.includes(mode))));
  const [selected, setSelected] = useState<Mode>((props.tool?.defaultInputMode as Mode) ?? modes[0]);
  useEffect(() => {
    const next = props.example?.values.inputMode as Mode | undefined;
    if (next && modes.includes(next)) setSelected(next);
  }, [props.example?.revision]);
  const mode = modes.includes(selected) ? selected : modes[0];
  const [busy, setBusy] = useState(false);
  if (workbench?.presets.length) {
    return <VideoWorkbench page={workbench} pricing={props.pricing} id={props.id}
      sectionTitle={props.embed && typeof props.tool?.sectionTitle === "string" ? props.tool.sectionTitle : undefined}
      sectionLead={props.embed && typeof props.tool?.sectionLead === "string" ? props.tool.sectionLead : undefined}
      selectedExample={props.example} />;
  }
  const labels: Record<Mode, string> = zh
    ? { text: "文生视频", image: "图生视频", reference: "参考视频生成" }
    : { text: "Text to Video", image: "Image to Video", reference: "Reference Video" };
  const navigation = modes.length > 1 ? <div className="w-full min-w-0"><div className="flex w-full flex-wrap gap-1 rounded-2xl border border-border bg-muted/30 p-1" role="group" aria-label={zh ? "生成方式" : "Generation mode"}>
    {modes.map(item => <button type="button" key={item} disabled={busy} aria-pressed={mode === item} onClick={() => setSelected(item)} className={cn(
      "min-w-[46%] flex-1 rounded-full px-2 py-2 text-center text-xs font-medium transition-colors disabled:opacity-60 sm:min-w-0 sm:flex-none sm:px-4 sm:text-sm",
      mode === item ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    )}>{labels[item]}</button>)}
  </div></div> : null;
  if (!mode) return <p>{zh ? "此站点未启用视频生成模式。" : "No video generation modes are enabled."}</p>;
  if (mode === "reference") return <ReferenceVideoTool presets={referencePresets ?? []} pricing={props.pricing} id={props.id}
    sectionTitle={props.embed && typeof props.tool?.sectionTitle === "string" ? props.tool.sectionTitle : undefined}
    sectionLead={props.embed && typeof props.tool?.sectionLead === "string" ? props.tool.sectionLead : undefined}
    presetId={typeof props.tool?.presetId === "string" ? props.tool.presetId : undefined}
    selectedExampleId={props.example?.values.exampleId}
    navigation={navigation} onBusyChange={setBusy} />;
  return <VideoTool {...props} forcedMode={mode} navigation={navigation} onBusyChange={setBusy}
    models={pickerModels.filter(m => (m as MediaModel).capabilities.modes.includes(mode))} />;
}
