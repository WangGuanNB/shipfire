import { getToolCatalog } from "@/config/ai";
export async function GET() {
  return Response.json({ tools: getToolCatalog().filter(t => t.enabled).map(t => ({
    id: t.id, label: t.label, models: t.models.filter(m => m.enabled).map(({ adapter, providerModel, ...model }) => model),
  })) });
}
