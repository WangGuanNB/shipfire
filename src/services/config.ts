/**
 * @fileoverview 系统配置服务
 * @description 统一管理所有可配置的系统参数，从环境变量读取，提供默认值
 */

/**
 * 获取新用户注册时赠送的积分数量
 * @returns 积分数量（默认：20）
 */
export function getNewUserCredits(): number {
  const credits = process.env.NEW_USER_CREDITS;
  if (credits) {
    const parsed = parseInt(credits, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 20; // 默认 20 积分
}

/**
 * 获取 AI 聊天每次消耗的积分数量
 * @returns 积分数量（默认：10）
 */
export function getAIChatCreditCost(): number {
  const cost = process.env.AI_CHAT_CREDIT_COST;
  if (cost) {
    const parsed = parseInt(cost, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return 10; // 默认消耗 10 积分
}

/**
 * 判断是否为 Creem 测试模式
 * @returns true=测试环境，false=生产环境
 */
export function isCreemTestMode(): boolean {
  return process.env.CREEM_TEST_MODE === "true";
}

/**
 * 根据环境变量判断哪些定价 Tab 可用
 * - 至少一个支付渠道配置了对应产品 ID，该 Tab 才显示
 * - Stripe 配置了私钥则所有模式均可用（动态 price_data）
 */
export function getAvailableGroups(): {
  monthly: boolean;
  yearly: boolean;
  onetime: boolean;
} {
  const hasStripe = !!process.env.STRIPE_PRIVATE_KEY;

  const hasMonthly =
    hasStripe ||
    !!(
      process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_MONTHLY ||
      process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_MONTHLY ||
      process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_MONTHLY
    );

  const hasYearly =
    hasStripe ||
    !!(
      process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_YEARLY ||
      process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_YEARLY ||
      process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_YEARLY
    );

  const hasOnetime =
    hasStripe ||
    !!(
      process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_ONETIME ||
      process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_ONETIME ||
      process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_ONETIME
    );

  return { monthly: hasMonthly, yearly: hasYearly, onetime: hasOnetime };
}

export type PricingTabGroup = "monthly" | "yearly" | "one-time";

/**
 * 定价页 Tab 白名单（可选）。
 * - 未配置或为空：不限制，仅由 {@link getAvailableGroups}（产品 ID / Stripe）决定显示哪些 Tab。
 * - 已配置：只显示列表中出现的 Tab，且须同时满足 getAvailableGroups（避免无产品的空 Tab）。
 * - 顺序：按本变量中从左到右的顺序排列 Tab（例如 `yearly,monthly` 先显示年付）。
 *
 * 环境变量：`NEXT_PUBLIC_PRICING_VISIBLE_TABS`
 * 示例：`monthly,yearly,one-time` | `Monthly, Yearly` | `one-time`
 */
export function getPricingTabAllowlist(): PricingTabGroup[] | null {
  const raw = process.env.NEXT_PUBLIC_PRICING_VISIBLE_TABS?.trim();
  if (!raw) return null;

  const toCanonical = (token: string): PricingTabGroup | null => {
    const t = token.trim().toLowerCase().replace(/_/g, "-");
    const compact = t.replace(/\s+/g, "");
    if (t === "monthly" || t === "month" || compact === "m") return "monthly";
    if (t === "yearly" || t === "year" || compact === "y") return "yearly";
    if (
      t === "one-time" ||
      t === "one time" ||
      compact === "onetime" ||
      t === "once"
    ) {
      return "one-time";
    }
    return null;
  };

  const seen = new Set<PricingTabGroup>();
  const out: PricingTabGroup[] = [];
  for (const part of raw.split(/[,，]/)) {
    const c = toCanonical(part);
    if (c && !seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  }
  return out.length > 0 ? out : null;
}

