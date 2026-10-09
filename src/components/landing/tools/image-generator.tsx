"use client";

import ImageGeneratorTool from "@/components/blocks/image-generator-tool";
import type { Pricing } from "@/types/blocks/pricing";
import { useToolSelection } from "../interactions";
import type { MediaModel } from "@/ai/types";

export default function ImageGeneratorSlot({ id, slot, copy, creditCost, pricing, model }: {
  model?: MediaModel;
  id: string;
  slot: string;
  copy: Record<string, string>;
  creditCost: number;
  pricing: Pricing | null;
}) {
  const example = useToolSelection(slot);
  return <ImageGeneratorTool id={id} embed tool={copy} example={example} creditCost={creditCost} pricing={pricing} model={model} />;
}
