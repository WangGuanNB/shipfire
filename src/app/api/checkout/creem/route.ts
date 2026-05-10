/**
 * @fileoverview Creem 支付 Checkout API
 * @description 创建 Creem 支付会话并返回支付链接
 */

import { getUserEmail, getUserUuid } from "@/services/user";
import { insertOrder, updateOrderSession } from "@/models/order";
import { respData, respErr } from "@/lib/resp";

import { Order } from "@/types/order";
import { findUserByUuid } from "@/models/user";
import { getSnowId } from "@/lib/hash";
import { getPricingPage } from "@/services/page";
import { PricingItem } from "@/types/blocks/pricing";
import { orders } from "@/db/schema";
import { createCreemCheckoutSession } from "@/services/creem";

export async function POST(req: Request) {
  try {
    let {
      credits,
      currency,
      amount,
      interval,
      product_id,
      product_name,
      valid_months,
      cancel_url,
      locale,
      creem_product_id, // Creem 产品 ID（可选，如果提供则直接使用）
    } = await req.json();

    if (!cancel_url) {
      cancel_url = `${
        process.env.NEXT_PUBLIC_PAY_CANCEL_URL ||
        process.env.NEXT_PUBLIC_WEB_URL
      }`;

      if (cancel_url && cancel_url.startsWith("/")) {
        cancel_url = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}${cancel_url}`;
      }
    }

    if (!amount || !interval || !currency || !product_id) {
      return respErr("invalid params");
    }

    // 验证订单参数
    const page = await getPricingPage(locale);
    if (!page || !page.pricing || !page.pricing.items) {
      return respErr("invalid pricing table");
    }

    // 按 product_id + amount 精确匹配，支持 6 套餐
    const item = page.pricing.items.find(
      (i: PricingItem) =>
        i.product_id === product_id &&
        (currency === "cny" ? i.cn_amount === amount : i.amount === amount)
    );

    let isPriceValid = false;

    if (currency === "cny") {
      isPriceValid = item?.cn_amount === amount;
    } else {
      isPriceValid = item?.amount === amount && item?.currency === currency;
    }

    if (
      !item ||
      !item.amount ||
      !item.interval ||
      !item.currency ||
      item.interval !== interval ||
      item.credits !== credits ||
      item.valid_months !== valid_months ||
      !isPriceValid
    ) {
      return respErr("invalid checkout params");
    }

    if (!["year", "month", "one-time"].includes(interval)) {
      return respErr("invalid interval");
    }

    // 解析 Creem 产品 ID：creem_product_id 可为 key(starter/standard_monthly 等) 或 prod_* 实际 ID
    const creemKeyMap: Record<string, string | undefined> = {
      starter:          process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_MONTHLY,
      starter_monthly:  process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_MONTHLY,
      starter_yearly:   process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_YEARLY,
      starter_onetime:  process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_ONETIME,
      standard_monthly: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_MONTHLY,
      standard_yearly:  process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_YEARLY,
      standard_onetime: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_ONETIME,
      premium_monthly:  process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_MONTHLY,
      premium_yearly:   process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_YEARLY,
      premium_onetime:  process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_ONETIME,
    };
    const rawCreemId = creem_product_id || (item as PricingItem).creem_product_id;
    const creem_product_id_resolved =
      (rawCreemId?.startsWith("prod_") ? rawCreemId : undefined) ||
      (rawCreemId ? creemKeyMap[rawCreemId] : undefined) ||
      creemKeyMap[product_id] ||
      product_id;

    const is_subscription = interval === "month" || interval === "year";

    if (interval === "year" && valid_months !== 12) {
      return respErr("invalid valid_months");
    }

    if (interval === "month" && valid_months !== 1) {
      return respErr("invalid valid_months");
    }

    // 获取用户信息
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("no auth, please sign-in");
    }

    let user_email = await getUserEmail();
    if (!user_email) {
      const user = await findUserByUuid(user_uuid);
      if (user) {
        user_email = user.email;
      }
    }
    if (!user_email) {
      return respErr("invalid user");
    }

    // 创建订单
    const order_no = getSnowId();
    const currentDate = new Date();
    const created_at = currentDate.toISOString();

    let expired_at = "";

    const timePeriod = new Date(currentDate);
    timePeriod.setMonth(currentDate.getMonth() + valid_months);

    const timePeriodMillis = timePeriod.getTime();
    let delayTimeMillis = 0;

    // subscription
    if (is_subscription) {
      delayTimeMillis = 24 * 60 * 60 * 1000; // delay 24 hours expired
    }

    const newTimeMillis = timePeriodMillis + delayTimeMillis;
    const newDate = new Date(newTimeMillis);

    expired_at = newDate.toISOString();

    const order = {
      order_no: order_no,
      created_at: new Date(created_at),
      user_uuid: user_uuid,
      user_email: user_email,
      amount: amount,
      interval: interval,
      expired_at: new Date(expired_at),
      status: "created",
      credits: credits,
      currency: currency,
      product_id: product_id,
      product_name: product_name,
      valid_months: valid_months,
    };
    await insertOrder(order as typeof orders.$inferInsert);

    // 构建成功和取消 URL
    // 🔥 根据 Creem 文档：支付成功后会重定向到 success_url，并带有查询参数
    // - 如果使用 API 创建 checkout：会带有 request_id（对应我们传递的 request_id）
    // - 如果使用产品 ID 直接链接：我们可以在 URL 中添加 order_no 参数
    // 为了兼容两种方式，我们使用查询参数方式，支持 request_id 和 order_no
    // 注意：Creem API 会自动添加 request_id 参数，所以我们不需要在 URL 中手动添加
    const success_url = `${process.env.NEXT_PUBLIC_WEB_URL}/${locale}/pay-success/creem`;

    // 金额转换为分（Creem API 需要）
    const amountInCents = Math.round(amount);

    // 🔥 优先使用 Creem API 创建支付会话（如果配置了 CREEM_API_KEY）
    // 如果 API 失败，自动回退到产品 ID 直接链接方式
    let checkout_url: string | undefined;
    let session_id: string | undefined;

    const creemApiKey = process.env.CREEM_API_KEY;
    
    if (creemApiKey) {
      // 方案 1: 使用 Creem API 创建支付会话（推荐，可以传递 referenceId 和 metadata）
      try {
        console.log("🔔 [Creem Checkout] 尝试使用 API 方式创建支付会话");
        const checkoutSession = await createCreemCheckoutSession({
          product_id: creem_product_id_resolved,
          product_name: product_name,
          amount: amountInCents,
          currency: currency,
          order_no: order_no, // 作为 referenceId 传递
          user_email: user_email,
          user_uuid: user_uuid,
          credits: credits,
          locale: locale,
          success_url: success_url,
          cancel_url: cancel_url,
          is_subscription: is_subscription,
          interval: interval === "year" ? "year" : "month",
        });

        checkout_url = checkoutSession.checkout_url;
        session_id = checkoutSession.session_id;
        console.log("✅ [Creem Checkout] API 支付会话创建成功:", { checkout_url, session_id });
      } catch (error: any) {
        console.error("❌ [Creem Checkout] API 创建支付会话失败:", error);
        console.warn("⚠️ [Creem Checkout] API 方式失败，回退到产品 ID 直接链接方式");
        // 继续执行，使用产品 ID 方式
      }
    }

    // 方案 2: 如果未配置 API Key 或 API 调用失败，使用产品 ID 直接链接方式
    if (!checkout_url) {
      if (!creem_product_id_resolved) {
        return respErr("Creem product ID is required when API Key is not configured");
      }

      console.log("🔔 [Creem Checkout] 使用产品 ID 直接链接方式");
      const { isCreemTestMode } = await import("@/services/config");
      const isTestMode = isCreemTestMode();
      const baseUrl = isTestMode 
        ? "https://www.creem.io/test/payment"
        : "https://www.creem.io/payment";
      
      // 🔥 关键：将 order_no 和 email 作为 URL 参数传递
      checkout_url = `${baseUrl}/${creem_product_id_resolved}?order_no=${encodeURIComponent(order_no)}&email=${encodeURIComponent(user_email)}`;
      session_id = creem_product_id_resolved;
      console.log("✅ [Creem Checkout] 产品 ID 支付链接生成成功:", { checkout_url });
    }

    // 确保 checkout_url 和 session_id 都有值
    if (!checkout_url || !session_id) {
      return respErr("Failed to create checkout session");
    }

    // 保存会话信息
    // 🔥 关键：将 order_no 也保存到 order_detail，方便后续匹配
    const order_detail = JSON.stringify({
      checkout_url,
      session_id,
      creem_product_id: creem_product_id_resolved,
      order_no: order_no, // 保存订单号，方便 webhook 匹配
      user_email: user_email, // 保存邮箱，方便匹配
      amount: amountInCents, // 保存金额，方便匹配
    });

    await updateOrderSession(order_no, session_id, order_detail);

    return respData({
      checkout_url: checkout_url,
      session_id: session_id,
      order_no: order_no,
    });
  } catch (e: any) {
    console.log("creem checkout failed: ", e);
    return respErr("creem checkout failed: " + e.message);
  }
}

