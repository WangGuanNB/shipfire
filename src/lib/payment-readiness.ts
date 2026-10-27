/** Presence check only; never log or return secret values. No external payment request is made. */
export function stripeConfigurationReady(env: Record<string, string | undefined> = process.env): boolean {
  return ["STRIPE_PRIVATE_KEY", "STRIPE_PUBLIC_KEY", "STRIPE_WEBHOOK_SECRET"].every(key => !!env[key]?.trim());
}
