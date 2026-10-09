import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { aiTasks } from "@/db/schema";
import { inArray, asc } from "drizzle-orm";
import { advanceTask } from "@/ai/tasks";
/** Optional external scheduler: one pass, no long-running in-request video polling. */
export async function POST(req: Request) {
  const expected = process.env.AI_MAINTENANCE_SECRET;
  const actual = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (!expected || Buffer.byteLength(actual) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const tasks = await db().select().from(aiTasks).where(inArray(aiTasks.status, ["running", "submitting"])).orderBy(asc(aiTasks.next_poll_at)).limit(10);
  const result = await Promise.allSettled(tasks.map(advanceTask));
  return Response.json({ checked: result.length, errors: result.filter(r => r.status === "rejected").length });
}
