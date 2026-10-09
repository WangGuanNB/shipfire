import { getUserUuid } from "@/services/user";
import { getStripeClient } from "@/services/stripe";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getCanonicalUrl } from "@/lib/utils";
export async function POST(req: Request) {
  const userId = await getUserUuid();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { locale } = await req.json().catch(() => ({}));
  const [order] = await db().select().from(orders).where(and(eq(orders.user_uuid, userId), eq(orders.status, "paid"), isNotNull(orders.stripe_customer_id))).orderBy(desc(orders.created_at)).limit(1);
  if (!order?.stripe_customer_id) return Response.json({ error: "No Stripe billing account found" }, { status: 404 });
  try {
    const session = await getStripeClient().billingPortal.sessions.create({ customer: order.stripe_customer_id, return_url: getCanonicalUrl(locale === "zh" ? "zh" : "en", "/my-orders") });
    return Response.json({ url: session.url });
  } catch { return Response.json({ error: "Billing portal is unavailable" }, { status: 503 }); }
}
