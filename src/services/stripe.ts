import Stripe from "stripe";
let client: Stripe | undefined;
let configuredKey: string | undefined;
export function getStripeClient() {
  const key = process.env.STRIPE_PRIVATE_KEY;
  if (!key) throw new Error("Stripe is not configured");
  if (!client || key !== configuredKey) {
    client = new Stripe(key, { httpClient: Stripe.createFetchHttpClient(), apiVersion: "2025-02-24.acacia" });
    configuredKey = key;
  }
  return client;
}
