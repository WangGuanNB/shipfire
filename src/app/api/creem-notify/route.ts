/**
 * @fileoverview Creem Webhook 通知处理
 * @description 处理 Creem 支付成功回调及订阅续费事件
 *
 * Webhook URL 配置：https://yourdomain.com/api/creem-notify
 * 在 Creem Dashboard > Webhooks 中配置此地址
 *
 * 处理的事件类型（根据 Creem 官方文档）：
 * - checkout.completed        → 首次支付成功（含订阅首扣），建立订单记录
 * - subscription.paid         → 每次订阅扣款成功（首次 + 续费都触发）；
 *                               内部通过 current_period_end_date 与 expired_at 对比来判断是否续费
 * - subscription.canceled     → 订阅取消，将 expired_at 设为当前周期末
 * - subscription.active       → 仅用于同步，不发放权限（Creem 官方说明）
 *
 * ⚠️  Creem 不存在 subscription.renewed 事件，请勿监听该名称
 */

import { handleCreemOrder, handleCreemSubscriptionRenewal, handleCreemSubscriptionCanceled } from "@/services/order";
import { respOk } from "@/lib/resp";
import {
  verifyCreemWebhookSignature,
  parseCreemWebhookEvent,
} from "@/services/creem";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    if (!body) {
      throw new Error("empty webhook body");
    }

    // 验证签名（配置了 CREEM_WEBHOOK_SECRET 后才校验，未配置则跳过用于开发调试）
    const secret = process.env.CREEM_WEBHOOK_SECRET;
    if (secret) {
      const signature =
        req.headers.get("creem-signature") ||
        req.headers.get("x-creem-signature") ||
        "";
      const isValid = verifyCreemWebhookSignature(body, signature, secret);
      if (!isValid) {
        console.error("❌ [Creem Webhook] 签名验证失败");
        return Response.json({ error: "Invalid signature" }, { status: 401 });
      }
    } else {
      console.warn("⚠️ [Creem Webhook] CREEM_WEBHOOK_SECRET 未配置，已跳过签名验证（仅开发环境适用）");
    }

    const eventData = JSON.parse(body);
    const { type, data } = parseCreemWebhookEvent(eventData);

    console.log("🔔 [Creem Webhook] 收到事件:", type);

    switch (type) {
      // 首次支付成功（一次性 或 订阅首次扣款）
      case "checkout.completed":
      case "payment.succeeded":
      case "checkout.session.completed":
        await handleCreemOrder(data);
        break;

      // subscription.paid：每次订阅扣款成功都会触发（首次 + 续费）
      // 内部通过 current_period_end_date vs expired_at 判断是否是续费，避免与 checkout.completed 重复处理
      case "subscription.paid":
        await handleCreemSubscriptionRenewal(data);
        break;

      // 订阅取消：用户取消后将 expired_at 设为当前周期末，到期自动失效
      case "subscription.canceled":
        await handleCreemSubscriptionCanceled(data);
        break;

      default:
        console.log("⚠️ [Creem Webhook] 未处理的事件类型:", type, "完整数据:", JSON.stringify(eventData));
    }

    return respOk();
  } catch (e: any) {
    console.error("❌ [Creem Webhook] 处理失败:", e);
    return Response.json(
      { error: `handle creem notify failed: ${e.message}` },
      { status: 500 }
    );
  }
}
