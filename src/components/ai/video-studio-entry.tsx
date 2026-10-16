import VideoStudio, { type VideoStudioProps } from "./video-studio";
import ReferenceVideoTool from "./reference-video-tool";
import { getToolCatalog } from "@/config/ai";
import { publicReferencePresets } from "@/ai/reference-video";
import { publicWorkbench } from "@/ai/workbench";

/** Resolve operator-only configuration on the server, send only public form fields. */
export default function VideoStudioEntry(props: VideoStudioProps) {
  const reference = getToolCatalog().find(t => t.id === "reference-video" && t.enabled);
  const pageId = typeof props.tool?.workbench === "string" ? props.tool.workbench : "";
  return <VideoStudio {...props} workbench={pageId ? publicWorkbench(pageId) : null} referencePresets={reference ? publicReferencePresets(reference.models) : undefined} />;
}

export function ReferenceVideoEntry({ models, pricing }: VideoStudioProps) {
  return <ReferenceVideoTool presets={publicReferencePresets(models)} pricing={pricing} />;
}
