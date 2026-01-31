import { findOrderByOrderNo, OrderStatus } from "@/models/order";
import { redirect } from "@/i18n/navigation";
import { capturePayPalOrder } from "@/services/paypal";

/**
 * PayPal 支付成功页面
 * PayPal 支付成功后会重定向到这里，并带有查询参数：
 * - order_no: 我们的订单号
 * - token: PayPal 返回的 token（可选）
 * - PayerID: PayPal 返回的 PayerID（可选）
 * 
 * 注意：PayPal 的订单处理主要通过 Webhook 完成，这个页面主要用于：
 * 1. 捕获订单（如果还没有被捕获）
 * 2. 检查订单状态
 * 3. 跳转到成功页面
 */
export default async function ({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    order_no?: string;
    token?: string;
    PayerID?: string;
    [key: string]: string | undefined;
  }>;
}) {
  let redirectLocale = "en";

  try {
    const { locale } = await params;
    const urlSearchParams = await searchParams;

    if (locale) {
      redirectLocale = locale;
    }

    // 从查询参数获取订单号
    const order_no = urlSearchParams.order_no;

    if (!order_no) {
      console.error("❌ [PayPal Pay Success] 无法获取订单号", {
        order_no: urlSearchParams.order_no,
        all_search_params: urlSearchParams,
      });
      // 即使没有订单号，也跳转到成功页面
      redirect({
        href: process.env.NEXT_PUBLIC_PAY_SUCCESS_URL || "/",
        locale: redirectLocale,
      });
      return;
    }

    console.log("🔔 [PayPal Pay Success] 获取到订单号:", {
      order_no,
      token: urlSearchParams.token,
      PayerID: urlSearchParams.PayerID,
      all_params: urlSearchParams,
    });

    // 查询订单
    const order = await findOrderByOrderNo(order_no);
    if (!order) {
      console.error("❌ [PayPal Pay Success] Order not found:", order_no);
      // 即使找不到订单，也跳转到成功页面
      redirect({
        href: process.env.NEXT_PUBLIC_PAY_SUCCESS_URL || "/",
        locale: redirectLocale,
      });
      return;
    }

    // 检查订单状态
    if (order.status === OrderStatus.Paid) {
      console.log("✅ [PayPal Pay Success] 订单已处理（Paid）:", order_no);
      // 订单已处理，直接跳转
    } else if (order.status === OrderStatus.Created) {
      console.log("🔔 [PayPal Pay Success] 订单状态为 Created，等待 Webhook 处理");
      // 订单状态为 Created，说明可能还没有收到 Webhook
      // 这里可以尝试捕获订单，但主要依赖 Webhook 处理
      // 为了用户体验，先跳转到成功页面，Webhook 会异步处理订单
    } else {
      console.log("⚠️ [PayPal Pay Success] 订单状态异常:", order_no, order.status);
    }

    // 🔥 跳转到支付成功页面
    redirect({
      href: process.env.NEXT_PUBLIC_PAY_SUCCESS_URL || "/",
      locale: redirectLocale,
    });
  } catch (e: any) {
    // 🔥 Next.js 15 中，redirect() 会抛出 NEXT_REDIRECT 错误来触发重定向
    // 这是正常行为，不应该被当作错误处理，需要重新抛出
    // digest 格式: 'NEXT_REDIRECT;replace;/url/url/url;307;'
    const isRedirectError =
      typeof e?.digest === "string" && e.digest.startsWith("NEXT_REDIRECT");

    if (isRedirectError) {
      throw e; // 重新抛出 redirect 错误，让 Next.js 正常处理重定向
    }

    console.error("❌ [PayPal Pay Success] 处理失败:", e);
    // 即使处理失败，也跳转到成功页面
    try {
      const { locale: catchLocale } = await params;
      const catchRedirectLocale = catchLocale || redirectLocale;

      redirect({
        href: process.env.NEXT_PUBLIC_PAY_SUCCESS_URL || "/",
        locale: catchRedirectLocale,
      });
    } catch (innerE: any) {
      // 同样检查是否是 redirect 错误
      const isInnerRedirectError =
        typeof innerE?.digest === "string" && innerE.digest.startsWith("NEXT_REDIRECT");

      if (isInnerRedirectError) {
        throw innerE;
      }
      // 如果连参数都获取不到，跳转到首页
      redirect({
        href: "/",
        locale: redirectLocale,
      });
    }
  }
}
