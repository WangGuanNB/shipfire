import { getUserInfo } from "@/services/user";
import { handleAiDiagnostics } from "@/ai/diagnostics";

export async function POST(req: Request) {
  try {
    return await handleAiDiagnostics(req, await getUserInfo());
  } catch {
    return Response.json({ error: "Could not verify diagnostic access" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
