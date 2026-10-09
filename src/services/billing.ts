import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { credits, orders } from "@/db/schema";
import { defaultPlanPolicy, planPolicies } from "@/config/billing";
import { ToolError } from "@/ai/types";
import { creditWindows, type BillingSnapshot } from "@/lib/billing-policy";

export function makeBillingSnapshot(planId: string, amount: number): BillingSnapshot {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Invalid credit quantity");
  return { planId, credits: amount, ...(planPolicies[planId] ?? defaultPlanPolicy) };
}
export function orderPolicy(order: typeof orders.$inferSelect): BillingSnapshot {
  return order.billing_snapshot ? JSON.parse(order.billing_snapshot) : makeBillingSnapshot(order.product_id ?? "", order.credits);
}
export async function grantPaidPeriod(order: typeof orders.$inferSelect, periodKey: string, start: number, end: number) {
  const policy = orderPolicy(order);
  for (const window of creditWindows(start, end, policy.grantCadence)) {
    await db().insert(credits).values({
      trans_no: `grant:${periodKey}:${window.start}`, user_uuid: order.user_uuid,
      trans_type: "paid_period", credits: policy.credits, order_no: order.order_no,
      created_at: new Date(), available_at: new Date(window.start * 1000), expired_at: new Date(window.end * 1000),
    }).onConflictDoNothing({ target: credits.trans_no });
  }
}
export async function assertEntitlements(userId: string, required: string[]) {
  if (!required.length) return;
  const active = await db().select().from(orders).where(and(eq(orders.user_uuid, userId), eq(orders.status, "paid"), gt(orders.expired_at, new Date())));
  const allowed = new Set(active.flatMap(order => orderPolicy(order).entitlements));
  if (required.some(key => !allowed.has(key))) throw new ToolError("Your plan does not include this tool or model", 403);
}
export async function capOrderGrants(orderNo: string, end: number) {
  await db().update(credits).set({ expired_at: new Date(end * 1000) }).where(and(eq(credits.order_no, orderNo), eq(credits.trans_type, "paid_period"), sql`${credits.expired_at} > ${end}`));
}
