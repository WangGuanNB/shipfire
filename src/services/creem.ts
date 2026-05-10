/**
 * @fileoverview Creem 支付服务
 * @description 提供 Creem 支付相关的工具函数，包括创建支付会话、验证 webhook 签名等
 */

import crypto from "crypto";

/**
 * Creem 支付会话创建参数
 */
export interface CreemCheckoutSessionParams {
  product_id: string;
  product_name: string;
  amount: number; // 金额（分）
  currency: string;
  order_no: string;
  user_email: string;
  user_uuid: string;
  credits: number;
  locale: string;
  success_url: string;
  cancel_url: string;
  is_subscription?: boolean;
  interval?: "month" | "year";
}

/**
 * Creem 支付会话响应
 */
export interface CreemCheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
}

/**
 * 创建 Creem 支付会话
 * @param params 支付会话参数
 * @returns 支付会话信息
 */
export async function createCreemCheckoutSession(
  params: CreemCheckoutSessionParams
): Promise<CreemCheckoutSessionResponse> {
  try {
    const creemApiKey = process.env.CREEM_API_KEY;
    // 🔥 根据 Creem 文档，尝试多个可能的 API 端点
    // 如果 /v1/checkout/sessions 不存在，尝试其他端点
    const creemApiUrl = process.env.CREEM_API_URL || "https://api.creem.io";

    // 如果未配置 API Key，使用产品 ID 直接生成支付链接（方案 1）
    if (!creemApiKey) {
      console.log("CREEM_API_KEY not configured, using product ID direct link");
      const { isCreemTestMode } = await import("@/services/config");
      const isTestMode = isCreemTestMode();
      const baseUrl = isTestMode
        ? "https://www.creem.io/test/payment"
        : "https://www.creem.io/payment";

      const checkoutUrl = `${baseUrl}/${params.product_id}?order_no=${encodeURIComponent(
        params.order_no
      )}&email=${encodeURIComponent(params.user_email)}`;

      return {
        checkout_url: checkoutUrl,
        session_id: params.product_id,
      };
    }

    // 使用 Creem API 创建支付会话
    // 根据 Creem 文档：https://docs.creem.io/features/checkout/checkout-api#rest-api
    // 🔥 关键：使用 request_id 传递 order_no，支付成功后会作为 request_id 查询参数返回
    // 🔥 注意：根据文档示例，基础参数只需要 product_id 和 success_url
    // cancel_url 和 customer_email 可能在某些版本中不支持，先移除
    const requestBody: any = {
      product_id: params.product_id, // 🔥 必需：产品 ID
      request_id: params.order_no, // 🔥 关键：使用 request_id 传递订单号
      success_url: params.success_url, // 🔥 必需：成功后的重定向 URL
    };

    // 🔥 根据错误日志，测试 API 不支持 cancel_url 和 customer_email
    // 暂时注释掉，如果后续需要可以尝试添加
    // if (params.cancel_url) {
    //   requestBody.cancel_url = params.cancel_url;
    // }

    // 添加 metadata（用于 webhook，如果支持）
    if (params.order_no) {
      requestBody.metadata = {
        order_no: params.order_no,
        user_uuid: params.user_uuid,
        credits: params.credits.toString(),
        locale: params.locale,
      };
    }

    // 订阅周期由 Creem 后台「产品」本身配置（recurring / billing_period）。
    // test-api / v1/checkouts 会返回 400：property subscription should not exist — 不要传 subscription 对象。

    // 🔥 根据 Creem 文档，API 端点是 /v1/checkouts（不是 /v1/checkout/sessions）
    // 测试模式使用 test-api.creem.io，生产模式使用 api.creem.io
    // 文档：https://docs.creem.io/getting-started/test-mode#rest-api
    const { isCreemTestMode } = await import("@/services/config");
    const isTestMode = isCreemTestMode();
    const baseApiUrl = isTestMode ? "https://test-api.creem.io" : "https://api.creem.io";
    
    // 🔥 只使用正确的端点
    const endpoint = `${baseApiUrl}/v1/checkouts`;
    
    console.log("🔔 [Creem API] 使用端点:", endpoint);
    console.log("🔔 [Creem API] 测试模式:", isTestMode);
    console.log("🔔 [Creem API] 请求体:", JSON.stringify(requestBody, null, 2));

    try {
      // 🔥 根据 Creem 文档，使用 x-api-key 请求头（不是 Authorization: Bearer）
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": creemApiKey, // 🔥 文档明确使用 x-api-key
        },
        body: JSON.stringify(requestBody),
      });

      // 🔥 添加详细日志：打印响应信息
      console.log("🔔 [Creem API] 响应状态:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [Creem API] 请求失败:`, {
          endpoint,
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        
        // 尝试解析错误信息
        try {
          const errorJson = JSON.parse(errorText);
          console.error("❌ [Creem API] 错误详情:", errorJson);
        } catch (e) {
          // 忽略解析错误
        }
        
        throw new Error(`Creem API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log("✅ [Creem API] 支付会话创建成功:", data);

      return {
        checkout_url: data.checkout_url || data.url || data.payment_url,
        session_id: data.session_id || data.id || params.order_no,
      };
    } catch (error: any) {
      console.error("❌ [Creem API] 请求异常:", error.message);
      throw error;
    }
  } catch (error: any) {
    console.error("Failed to create Creem checkout session:", error);
    throw error;
  }
}

/**
 * 验证 Creem Webhook 签名
 * @param body 请求体（原始字符串）
 * @param signature 签名（从请求头获取）
 * @param secret Webhook 密钥
 * @returns 是否验证通过
 */
export function verifyCreemWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  try {
    if (!signature || !secret) {
      return false;
    }

    // Creem 可能使用 HMAC-SHA256 签名
    // 格式可能是: sha256=xxx 或直接是签名值
    let expectedSignature = signature.trim();

    // 如果签名包含算法前缀，提取签名值
    if (expectedSignature.includes("=")) {
      expectedSignature = expectedSignature.split("=")[1].trim();
    }

    // 计算 HMAC-SHA256
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(body);
    const calculatedSignature = hmac.digest("hex");

    // 转换为 Buffer 进行比较
    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const calculatedBuffer = Buffer.from(calculatedSignature, "hex");

    // 长度必须相同才能使用 timingSafeEqual
    if (expectedBuffer.length !== calculatedBuffer.length) {
      return false;
    }

    // 使用时间安全比较防止时序攻击
    return crypto.timingSafeEqual(expectedBuffer, calculatedBuffer);
  } catch (error) {
    console.error("Failed to verify Creem webhook signature:", error);
    return false;
  }
}

/**
 * 解析 Creem Webhook 事件
 * @param eventData 事件数据（已解析的 JSON 对象）
 * @returns 事件类型和数据
 */
export function parseCreemWebhookEvent(eventData: any): {
  type: string;
  data: any;
} {
  // Creem webhook 事件可能的结构：
  // 1. { type: "payment.succeeded", data: {...} }
  // 2. { event: "payment.succeeded", ... }
  // 3. { eventType: "checkout.completed", object: { order: {...} } } - 实际结构
  // 4. { status: "paid", order_no: "...", ... }

  let eventType = "";
  let eventData_obj = eventData;

  // 尝试从不同可能的字段获取事件类型
  if (eventData.type) {
    eventType = eventData.type;
    eventData_obj = eventData.data || eventData;
  } else if (eventData.eventType) {
    // 🔥 Creem 实际使用的字段名是 eventType
    eventType = eventData.eventType;
    eventData_obj = eventData; // 保持完整数据结构，因为 metadata 可能在 object.order 中
  } else if (eventData.event) {
    eventType = eventData.event;
    eventData_obj = eventData;
  } else if (eventData.status) {
    // 如果只有 status，根据 status 推断事件类型
    const status = eventData.status.toLowerCase();
    if (status === "paid" || status === "succeeded" || status === "completed") {
      eventType = "payment.succeeded";
    } else if (status === "failed" || status === "failed") {
      eventType = "payment.failed";
    } else {
      eventType = "payment.unknown";
    }
    eventData_obj = eventData;
  } else {
    // 默认假设是支付成功事件
    eventType = "payment.succeeded";
    eventData_obj = eventData;
  }

  return {
    type: eventType,
    data: eventData_obj, // 返回完整数据，让 handleCreemOrder 自己提取
  };
}

