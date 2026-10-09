import { getUserInfo } from "@/services/user";
import { db } from "@/db";
import { aiTasks } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { publicTask } from "@/ai/tasks";
async function isAdmin() {
  const actor = await getUserInfo();
  return !!actor?.email && (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim()).includes(actor.email);
}
export async function GET() {
  if (!await isAdmin()) return Response.json({ error: "Forbidden" }, { status: 403 });
  const tasks = await db().select().from(aiTasks).where(inArray(aiTasks.status, ["needs_review", "submitting", "running"])).orderBy(desc(aiTasks.created_at)).limit(100);
  return Response.json({ tasks: tasks.map(t => ({ ...publicTask(t), userId: t.user_id, providerTaskId: t.provider_task_id })) });
}
export async function POST(req: Request) {
  if (!await isAdmin()) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id, action, providerTaskId } = await req.json();
  if (action !== "fail" && !(action === "reconcile" && typeof providerTaskId === "string" && /^[\w-]{1,200}$/.test(providerTaskId))) return Response.json({ error: "Invalid action" }, { status: 400 });
  const rows = await db().update(aiTasks).set(action === "fail"
    ? { status: "failed", error: "Task closed by support; credits released.", updated_at: Math.floor(Date.now()/1000) }
    : { status: "running", provider_task_id: providerTaskId, error: null, next_poll_at: 0 })
    .where(and(eq(aiTasks.id, String(id)), eq(aiTasks.status, "needs_review"))).returning({ id: aiTasks.id });
  return Response.json({ updated: rows.length });
}
