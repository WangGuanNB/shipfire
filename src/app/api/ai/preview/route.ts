import { buildGenerationPreview } from "@/ai/preview";
import { ToolError, type ToolInput } from "@/ai/types";
import { getUserUuid } from "@/services/user";

export async function POST(req: Request) {
  try {
    const userId = await getUserUuid();
    if (!userId) return Response.json({ error: "Sign in to preview" }, { status: 401 });
    const body = await req.json();
    if (!body || typeof body !== "object" || !body.input || typeof body.input !== "object") throw new ToolError("Invalid task input");
    const preview = buildGenerationPreview(String(body.toolId), String(body.modelId), body.input as ToolInput);
    return Response.json({ preview: true, charged: false, providerCalled: false, ...preview }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof ToolError) return Response.json({ error: error.message }, { status: error.status });
    console.error("Generation preview failed", error);
    return Response.json({ error: "Could not preview this request." }, { status: 500 });
  }
}
