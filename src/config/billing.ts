/** Optional policies indexed by arbitrary product IDs (not a fixed set of tiers). */
export interface PlanPolicy {
  grantCadence: "billing" | "month";
  entitlements: string[];
}
export const planPolicies: Record<string, PlanPolicy> = {};
// Example: creator: { grantCadence: "month", entitlements: ["high-resolution"] }
// Existing plans preserve their per-payment credit quantity until explicitly configured.
export const defaultPlanPolicy: PlanPolicy = { grantCadence: "billing", entitlements: [] };
