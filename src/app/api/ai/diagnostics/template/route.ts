import { timingSafeEqual } from "node:crypto";
import { checkTemplateHealth } from "@/ai/template-health";

export async function POST(request: Request) {
  const expected = process.env.AI_MAINTENANCE_SECRET;
  const actual = request.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (!expected || Buffer.byteLength(actual) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const result = await checkTemplateHealth(body?.checkStorage === true);
  return Response.json(result, { status: result.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
