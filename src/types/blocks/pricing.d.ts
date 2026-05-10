import { Button } from "@/types/blocks/base/button";

export interface PricingGroup {
  name?: string;
  title?: string;
  description?: string;
  label?: string;
}

/** Same feature row on every tier card; booleans control check vs strikethrough. */
export interface PricingComparisonRow {
  text: string;
  starter: boolean;
  standard: boolean;
  premium: boolean;
  /** If set, only these tiers render this row (e.g. one credits line per plan, no strikeouts). */
  visible_for?: ("starter" | "standard" | "premium")[];
}

export interface PricingItem {
  title?: string;
  description?: string;
  label?: string;
  price?: string;
  original_price?: string;
  currency?: string;
  unit?: string;
  unit_note?: string;
  features_title?: string;
  features?: string[];
  button?: Button;
  tip?: string;
  is_featured?: boolean;
  interval: "month" | "year" | "one-time";
  product_id: string;
  product_name?: string;
  amount: number;
  cn_amount?: number;
  currency: string;
  credits?: number;
  valid_months?: number;
  group?: string;
  creem_product_id?: string; // Creem 产品 ID（可选）
}

export interface Pricing {
  disabled?: boolean;
  name?: string;
  title?: string;
  description?: string;
  /** Shown above the unified comparison list (e.g. "All features") */
  comparison_title?: string;
  /** Keys: `monthly` | `yearly` | `one-time` — must match `PricingItem.group` */
  comparison_features_by_group?: Record<string, PricingComparisonRow[]>;
  items?: PricingItem[];
  groups?: PricingGroup[];
}
