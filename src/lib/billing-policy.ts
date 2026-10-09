import type { PlanPolicy } from "@/config/billing";

export interface BillingSnapshot extends PlanPolicy { planId: string; credits: number }
export function addUtcMonths(anchor: number, months: number): number {
  const date = new Date(anchor * 1000);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return Math.floor(date.getTime() / 1000);
}
/** Anchored calendar months, not 30-day intervals. Future grants cannot be spent early. */
export function creditWindows(start: number, end: number, cadence: PlanPolicy["grantCadence"]) {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end <= start) throw new Error("Invalid paid period");
  if (cadence === "billing") return [{ start, end }];
  const result: { start: number; end: number }[] = [];
  for (let i = 0; i < 120 && addUtcMonths(start, i) < end; i++) {
    result.push({ start: addUtcMonths(start, i), end: Math.min(addUtcMonths(start, i + 1), end) });
  }
  if (result.at(-1)?.end !== end) throw new Error("Paid period is too long");
  return result;
}
