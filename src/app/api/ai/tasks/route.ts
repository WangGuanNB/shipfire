import { getUserUuid } from "@/services/user";
import { advanceTask, createTask, listTasks, publicTask } from "@/ai/tasks";
import { ToolError } from "@/ai/types";

export async function POST(req: Request) {
  try {
    const userId = await getUserUuid();
    if (!userId) return Response.json({ error: "Sign in to generate" }, { status: 401 });
    const body = await req.json();
    if (!body || typeof body !== "object" || !body.input || typeof body.input !== "object") throw new ToolError("Invalid task input");
    const task = await createTask(userId, String(body.toolId), String(body.modelId), body.input, req.headers.get("Idempotency-Key") || "");
    return Response.json({ task: publicTask(await advanceTask(task)) });
  } catch (e) {
    if (e instanceof ToolError) return Response.json({ error: e.message }, { status: e.status });
    console.error("Create task failed", e);
    return Response.json({ error: "Could not submit the task. Check your task history before retrying." }, { status: 500 });
  }
}
export async function GET(req: Request) {
  const userId = await getUserUuid();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const toolId = new URL(req.url).searchParams.get("toolId") || undefined;
  return Response.json({ tasks: (await listTasks(userId, toolId)).map(publicTask) }, { headers: { "Cache-Control": "no-store" } });
}
