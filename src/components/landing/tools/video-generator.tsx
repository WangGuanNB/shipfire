"use client";

import VideoStudio from "@/components/ai/video-studio";
import type { PublicReferencePreset } from "@/ai/reference-video-types";
import type { PublicWorkbenchPage } from "@/ai/workbench-types";
import type { Pricing } from "@/types/blocks/pricing";
import { useToolSelection } from "../interactions";
import type { ToolModel } from "@/ai/types";

export default function VideoGeneratorSlot({
  embedInHero,
  id,
  slot,
  copy,
  models,
  pricing,
  referencePresets,
  workbench,
}: {
  embedInHero?: boolean;
  id: string;
  slot: string;
  copy: Record<string, string>;
  models: ToolModel[];
  pricing: Pricing | null;
  referencePresets?: PublicReferencePreset[];
  workbench?: PublicWorkbenchPage | null;
}) {
  const example = useToolSelection(slot);
  return (
    <VideoStudio
      id={id}
      embed
      embedInHero={embedInHero}
      toolSlot={slot}
      models={models}
      pricing={pricing}
      tool={copy}
      example={example}
      referencePresets={referencePresets}
      workbench={workbench}
    />
  );
}
