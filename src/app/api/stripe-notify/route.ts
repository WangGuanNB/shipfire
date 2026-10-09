import Stripe from "stripe";
import { handleOrderSession } from "@/services/order";
import { respOk } from "@/lib/resp";
import { getStripeClient } from "@/services/stripe";
import { fulfillStripeInvoice, syncStripeSubscription } from "@/services/stripe-billing";

export async function POST(req: Request) {
  try {
    const stripePrivateKey = process.env.STRIPE_PRIVATE_KEY;
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripePrivateKey || !stripeWebhookSecret) {
      throw new Error("invalid stripe config");
    }

    const stripe = getStripeClient();

    const sign = req.headers.get("stripe-signature") as string;
    const body = await req.text();
    if (!sign || !body) {
      throw new Error("invalid notify data");
    }

    const event = await stripe.webhooks.constructEventAsync(
      body,
      sign,
      stripeWebhookSecret
    );

    console.log("stripe notify event:", event.type, event.id);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        await handleOrderSession(session);
        break;
      }

      case "invoice.paid":
        await fulfillStripeInvoice(event.data.object as Stripe.Invoice);
        break;
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const current = await stripe.subscriptions.retrieve(event.data.object.id);
        await syncStripeSubscription(current);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const id = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (id) await syncStripeSubscription(await stripe.subscriptions.retrieve(id));
        break;
      }

      default:
        console.log("not handle event: ", event.type);
    }

    return respOk();
  } catch (e: any) {
    console.log("stripe notify failed: ", e);
    return Response.json(
      { error: "Webhook could not be processed" },
      { status: e?.type === "StripeSignatureVerificationError" ? 400 : 500 }
    );
  }
}
