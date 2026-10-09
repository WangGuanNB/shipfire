import { getUserUuid } from "@/services/user";
import { advanceTask, getTask, publicTask } from "@/ai/tasks";
import { ToolError } from "@/ai/types";
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await getUserUuid();
    if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
    const task = await getTask((await params).id, userId);
    return Response.json({ task: publicTask(await advanceTask(task)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e instanceof ToolError ? e.message : "Task temporarily unavailable" }, { status: e instanceof ToolError ? e.status : 500 });
  }
}
