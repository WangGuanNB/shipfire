import { randomUUID } from "node:crypto";
import { getUserUuid } from "@/services/user";
import { advanceTask, createTask, publicTask } from "@/ai/tasks";
import { ToolError } from "@/ai/types";
import { respData, respErr, respJson } from "@/lib/resp";

/** Compatibility endpoint. New tools use /api/ai/tasks directly. */
export async function POST(req: Request) {
  try {
    const userId = await getUserUuid();
    if (!userId) return respJson(-2, "no auth");
    const input = await req.json();
    const task = await advanceTask(await createTask(userId, "image-generator", "default", {
      prompt: input.prompt, aspectRatio: input.aspect_ratio ?? "auto", resolution: input.resolution ?? "2K", outputFormat: input.output_format, locale: input.locale,
    }, req.headers.get("Idempotency-Key") || randomUUID()));
    if (task.status !== "succeeded") return respJson(-1, "Check task history for the generation status", { task: publicTask(task) });
    const asset = publicTask(task).artifacts[0];
    return respData({ url: asset?.url, key: asset?.key, taskId: task.id });
  } catch (e) {
    if (e instanceof ToolError && e.status === 402) return respJson(-3, e.message, { insufficient: true });
    return respErr(e instanceof ToolError ? e.message : "Image generation is temporarily unavailable");
  }
}
