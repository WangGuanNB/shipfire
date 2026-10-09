import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { aiTasks } from "@/db/schema";
import { taskPolicy } from "@/config/ai";
import { resolveTool } from "./catalog";
import { adapters } from "./adapters";
import { assertEntitlements } from "@/services/billing";
import { SubmissionRejected, ToolError, type AdapterResult, type PublicTask, type ToolInput, type ToolModel } from "./types";

export type TaskRow = typeof aiTasks.$inferSelect;
const now = () => Math.floor(Date.now() / 1000);
function causedBy(error: unknown, message: string): boolean {
  for (let depth = 0; error && depth < 8; depth++) {
    if (String(error).includes(message)) return true;
    error = (error as { cause?: unknown }).cause;
  }
  return false;
}
export function publicTask(row: TaskRow): PublicTask {
  return { id: row.id, toolId: row.tool_id, modelId: row.model_id, status: row.status as PublicTask["status"], credits: row.credits,
    artifacts: row.status === "succeeded" ? JSON.parse(row.artifacts || "[]") : [], error: row.status === "submitting" ? undefined : row.error ?? undefined, createdAt: row.created_at };
}
export async function getTask(id: string, userId: string) {
  const [row] = await db().select().from(aiTasks).where(and(eq(aiTasks.id, id), eq(aiTasks.user_id, userId))).limit(1);
  if (!row) throw new ToolError("Task not found", 404);
  return row;
}
export async function listTasks(userId: string, toolId?: string) {
  return db().select().from(aiTasks).where(and(eq(aiTasks.user_id, userId), toolId ? eq(aiTasks.tool_id, toolId) : undefined)).orderBy(desc(aiTasks.created_at)).limit(30);
}

export async function createTask(userId: string, toolId: string, modelId: string, rawInput: ToolInput, requestKey: string) {
  if (!/^[a-zA-Z0-9_-]{16,100}$/.test(requestKey)) throw new ToolError("A unique request key is required");
  const { model } = resolveTool(toolId, modelId);
  const adapter = adapters[model.adapter];
  if (!adapter) throw new ToolError("Tool adapter is not installed", 503);
  const input = adapter.validate(rawInput, model);
  const serialized = JSON.stringify(input);
  const id = createHash("sha256").update(`${userId}:${requestKey}`).digest("hex");
  const existing = await db().select().from(aiTasks).where(eq(aiTasks.id, id)).limit(1);
  if (existing[0]) {
    if (existing[0].input !== serialized || existing[0].tool_id !== toolId || existing[0].model_id !== modelId) throw new ToolError("Request key was already used for different inputs", 409);
    return existing[0];
  }
  await assertEntitlements(userId, model.requiredEntitlements ?? []);
  adapter.checkConfiguration();
  const credits = adapter.quote(input, model);
  if (!Number.isSafeInteger(credits) || credits < 0) throw new ToolError("Invalid credit quote", 503);
  const time = now();
  try {
    // Single SQL statement + reservation trigger: concurrent requests cannot overspend.
    await db().run(sql`INSERT INTO ai_tasks_shipfire
      (id,user_id,request_key,tool_id,model_id,model_snapshot,input,status,credits,created_at,updated_at,next_poll_at)
      SELECT ${id},${userId},${requestKey},${toolId},${modelId},${JSON.stringify(model)},${serialized},'queued',${credits},${time},${time},0
      WHERE (SELECT COUNT(*) FROM ai_tasks_shipfire WHERE user_id=${userId} AND status IN ('queued','submitting','running','needs_review')) < ${taskPolicy.maxActivePerUser}
      ON CONFLICT DO NOTHING`);
  } catch (error) {
    if (causedBy(error, "insufficient_credits")) throw new ToolError("Insufficient credits", 402);
    throw error;
  }
  const rows = await db().select().from(aiTasks).where(eq(aiTasks.id, id)).limit(1);
  if (!rows[0]) throw new ToolError("Too many active tasks. Wait for a task to finish.", 429);
  // Also check after racing requests used the same key.
  if (rows[0].input !== serialized || rows[0].tool_id !== toolId || rows[0].model_id !== modelId) throw new ToolError("Request key conflict", 409);
  return rows[0];
}

async function finish(row: TaskRow, result: AdapterResult) {
  const values = result.status === "running"
    ? { status: "running", provider_task_id: result.providerTaskId, error: null }
    : result.status === "succeeded"
      ? { status: "succeeded", artifacts: JSON.stringify(result.artifacts), error: null }
      : { status: "failed", error: result.error };
  await db().update(aiTasks).set({ ...values, updated_at: now(), next_poll_at: now() + taskPolicy.pollIntervalSeconds })
    .where(and(eq(aiTasks.id, row.id), sql`${aiTasks.status} NOT IN ('succeeded','failed')`));
}

/** A short poll performs one provider read. Synchronous adapters may finish in submit. */
export async function advanceTask(row: TaskRow): Promise<TaskRow> {
  const model = JSON.parse(row.model_snapshot) as ToolModel;
  const adapter = adapters[model.adapter];
  if (!adapter) return row;
  const time = now();
  if (row.status === "running" && row.created_at < time - taskPolicy.reviewAfterSeconds * 4) {
    await db().update(aiTasks).set({ status: "needs_review", error: "This task needs support review before it can be retried." }).where(and(eq(aiTasks.id, row.id), eq(aiTasks.status, "running")));
    return getTask(row.id, row.user_id);
  }
  if (row.status === "queued") {
    const claim = randomUUID();
    await db().update(aiTasks).set({ status: "submitting", updated_at: time, error: claim })
      .where(and(eq(aiTasks.id, row.id), eq(aiTasks.status, "queued")));
    const owned = await getTask(row.id, row.user_id);
    if (owned.error !== claim) return owned;
    try { await finish(row, await adapter.submit(JSON.parse(row.input), model, row.id, row.user_id)); }
    catch (error) {
      console.error("AI task submission failed", row.id, error instanceof Error ? error.name : "Error");
      await finish(row, error instanceof SubmissionRejected
        ? { status: "failed", error: error.message }
        : { status: "running", providerTaskId: "" });
      if (!(error instanceof SubmissionRejected)) await db().update(aiTasks).set({ status: "needs_review", error: "Submission could not be confirmed. Contact support with this task ID; do not submit it again." }).where(and(eq(aiTasks.id, row.id), sql`${aiTasks.status} NOT IN ('succeeded','failed')`));
    }
  } else if (row.status === "running" && adapter.poll && row.provider_task_id && row.next_poll_at <= time) {
    // Compare-and-set the poll timestamp: only one caller downloads/finalizes a result.
    const claim = await db().update(aiTasks).set({ next_poll_at: time + 120 }).where(and(eq(aiTasks.id, row.id), eq(aiTasks.status, "running"), eq(aiTasks.next_poll_at, row.next_poll_at))).returning({ id: aiTasks.id });
    if (claim.length) {
      try { await finish(row, await adapter.poll(row.provider_task_id, JSON.parse(row.input), model, row.id, row.user_id)); }
      catch { await db().update(aiTasks).set({ next_poll_at: time + 30, error: "Result retrieval will retry shortly." }).where(and(eq(aiTasks.id, row.id), eq(aiTasks.status, "running"))); }
    }
  } else if (row.status === "submitting" && row.updated_at < time - taskPolicy.reviewAfterSeconds) {
    await db().update(aiTasks).set({ status: "needs_review", error: "Submission was interrupted. Contact support with this task ID." }).where(and(eq(aiTasks.id, row.id), eq(aiTasks.status, "submitting")));
  }
  return getTask(row.id, row.user_id);
}
