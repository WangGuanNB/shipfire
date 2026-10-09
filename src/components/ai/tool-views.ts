import VideoTool from "./video-tool";
import type { ComponentType } from "react";
import type { ToolModel } from "@/ai/types";
import type { Pricing } from "@/types/blocks/pricing";
/** UI is registered independently: a chat or document tool need not look like video. */
export const toolViews: Record<string, ComponentType<{ models: ToolModel[]; pricing: Pricing | null }>> = { "video-generator": VideoTool };
