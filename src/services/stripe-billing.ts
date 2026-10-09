import type Stripe from "stripe";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { findOrderByOrderNo, findOrderBySubId } from "@/models/order";
import { getStripeClient } from "./stripe";
import { capOrderGrants, grantPaidPeriod } from "./billing";
import { updateAffiliateForOrder } from "./affiliate";
import { sendOrderConfirmationEmail } from "./email";
import type { Order } from "@/types/order";

const objectId = (value: string | { id: string } | null | undefined) => typeof value === "string" ? value : value?.id;

export async function fulfillStripeInvoice(invoice: Stripe.Invoice) {
  if (invoice.status !== "paid" || !["subscription_create", "subscription_cycle"].includes(invoice.billing_reason || "")) return;
  const subId = objectId(invoice.subscription);
  if (!subId) throw new Error("Paid subscription invoice has no subscription ID");
  const subscription = await getStripeClient().subscriptions.retrieve(subId);
  const order = subscription.metadata.order_no
    ? await findOrderByOrderNo(subscription.metadata.order_no)
    : await findOrderBySubId(subId);
  // Unknown orders fail/retry rather than silently dropping paid credits.
  if (!order) throw new Error("Subscription order not found");
  const line = invoice.lines.data.find(line => line.type === "subscription" && !line.proration);
  if (!line?.period) throw new Error("No subscription period on invoice");
  const { start, end } = line.period;
  // Compatible with pre-migration paid orders, whose first grant already exists.
  const legacyFirst = !order.billing_snapshot && order.status === "paid" && invoice.billing_reason === "subscription_create";
  if (!legacyFirst) await grantPaidPeriod(order, `stripe:${invoice.id}`, start, end);
  await db().update(orders).set({
    status: "paid", sub_id: subId, stripe_customer_id: objectId(subscription.customer), subscription_status: subscription.status,
    expired_at: sql`CASE WHEN COALESCE(${orders.sub_period_end},0)<=${end} THEN ${end} ELSE ${orders.expired_at} END`,
    sub_period_start: sql`MAX(COALESCE(${orders.sub_period_start},0),${start})`,
    sub_period_end: sql`MAX(COALESCE(${orders.sub_period_end},0),${end})`,
    paid_at: new Date((invoice.status_transitions.paid_at || start) * 1000),
  }).where(eq(orders.order_no, order.order_no));
  if (subscription.ended_at) await syncStripeSubscription(subscription);
}

export async function syncStripeSubscription(subscription: Stripe.Subscription) {
  const order = subscription.metadata.order_no
    ? await findOrderByOrderNo(subscription.metadata.order_no)
    : await findOrderBySubId(subscription.id);
  if (!order) throw new Error("Subscription order not found");
  // Fetch callers use current Stripe state, so out-of-order webhook payloads cannot roll it back.
  await db().update(orders).set({ subscription_status: subscription.status, sub_id: subscription.id, stripe_customer_id: objectId(subscription.customer) })
    .where(eq(orders.order_no, order.order_no));
  if (subscription.ended_at) {
    await capOrderGrants(order.order_no, subscription.ended_at);
    await db().update(orders).set({ expired_at: new Date(subscription.ended_at * 1000) }).where(and(eq(orders.order_no, order.order_no), sql`${orders.expired_at} > ${subscription.ended_at}`));
  }
}

export async function fulfillStripeCheckout(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid" || !session.metadata?.order_no) throw new Error("Checkout is not paid");
  const order = await findOrderByOrderNo(session.metadata.order_no);
  if (!order || (order.stripe_session_id && order.stripe_session_id !== session.id)) throw new Error("Checkout order mismatch");
  if (session.mode === "subscription") {
    const invoiceId = objectId(session.invoice);
    if (!invoiceId) throw new Error("Subscription checkout invoice is missing");
    await fulfillStripeInvoice(await getStripeClient().invoices.retrieve(invoiceId));
  } else {
    if (session.currency?.toLowerCase() !== order.currency?.toLowerCase() || session.amount_subtotal !== order.amount) throw new Error("Checkout price mismatch");
    if (!(order.status === "paid" && !order.billing_snapshot)) {
      const start = session.created;
      const end = Math.floor((order.expired_at?.getTime() || 0) / 1000);
      await grantPaidPeriod(order, `order:${order.order_no}`, start, end);
    }
  }
  // Mark paid only after all grants have been written; their unique IDs make retries safe.
  await db().update(orders).set({ status: "paid", paid_at: new Date(), paid_email: session.customer_details?.email || order.user_email,
    stripe_customer_id: objectId(session.customer), paid_detail: JSON.stringify({ session: session.id }) }).where(eq(orders.order_no, order.order_no));
  if (order.status !== "paid") {
    await updateAffiliateForOrder(order as unknown as Order);
    try { await sendOrderConfirmationEmail({ order: order as unknown as Order, customerEmail: session.customer_details?.email || order.user_email }); }
    catch { console.error("Order email could not be sent", order.order_no); }
  }
}
