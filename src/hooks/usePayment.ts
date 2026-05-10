/**
 * @fileoverview 支付处理逻辑 Hook
 * @description 提供统一的支付处理逻辑，包括订单创建、Stripe/Creem支付跳转等功能
 *
 * @features
 * - 支付参数验证和处理
 * - Stripe/Creem支付会话创建
 * - 用户认证状态检查
 * - 支付加载状态管理
 * - 错误处理和用户提示
 * - 支付方式选择支持
 *
 * @usage
 * ```tsx
 * const { handleCheckout, isLoading, productId, showPaymentSelector, setShowPaymentSelector } = usePayment();
 *
 * const onPayment = async () => {
 *   const result = await handleCheckout(pricingItem, false);
 *   if (result.success) {
 *     // 支付成功处理
 *   }
 * };
 * ```
 */

"use client";

import { useState } from 'react';
import { useAppContext } from '@/contexts/app';
import { useLocale } from 'next-intl';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'sonner';
import { PricingItem } from '@/types/blocks/pricing';
import { PaymentMethod } from '@/components/payment/PaymentMethodSelector';
import { getEnabledPaymentMethods } from '@/services/payment-selector';

/**
 * 支付处理 Hook
 * @returns {Object} 支付相关的状态和方法
 * @returns {Function} handleCheckout - 处理支付的主函数
 * @returns {boolean} isLoading - 支付处理中的加载状态
 * @returns {string|null} productId - 当前 checkout 的键，格式 `product_id|group`（例如 `starter|monthly`），用于区分同一 product 不同计费周期
 * @returns {boolean} showPaymentSelector - 是否显示支付方式选择器
 * @returns {Function} setShowPaymentSelector - 设置支付方式选择器显示状态
 * @returns {Function} handlePaymentMethodSelect - 处理支付方式选择
 */
export function usePayment() {
  const { user, setShowSignModal } = useAppContext();
  const locale = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [productId, setProductId] = useState<string | null>(null);
  const [showPaymentSelector, setShowPaymentSelector] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{
    item: PricingItem;
    cn_pay: boolean;
  } | null>(null);

  /**
   * 发起 checkout（弹窗选择后或仅一种支付方式时直接调用）
   */
  const runCheckout = async (
    item: PricingItem,
    cn_pay: boolean,
    paymentMethod: PaymentMethod
  ) => {
    try {
      const params: {
        product_id: string;
        product_name?: string;
        credits?: number;
        interval: "month" | "year" | "one-time";
        amount?: number;
        currency?: string;
        valid_months?: number;
        locale: string;
        creem_product_id?: string;
        payment_method: PaymentMethod;
      } = {
        product_id: item.product_id,
        product_name: item.product_name,
        credits: item.credits,
        interval: item.interval,
        amount: cn_pay ? item.cn_amount : item.amount,
        currency: cn_pay ? "cny" : item.currency,
        valid_months: item.valid_months,
        locale: locale || "en",
        payment_method: paymentMethod,
      };

      if (item.creem_product_id) {
        params.creem_product_id = item.creem_product_id;
      }

      setIsLoading(true);
      setProductId(`${item.product_id}|${item.group ?? ""}`);

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (response.status === 401) {
        setShowSignModal(true);
        return { needAuth: true };
      }

      const { code, message, data } = await response.json();
      if (code !== 0) {
        toast.error(message);
        return { success: false, message };
      }

      if (paymentMethod === "creem") {
        const { checkout_url } = data;
        if (checkout_url) {
          window.open(checkout_url, "_blank", "noopener,noreferrer");
          return { success: true };
        }
        toast.error("Failed to get checkout URL");
        return { success: false, message: "Failed to get checkout URL" };
      }

      if (paymentMethod === "paypal") {
        const { approval_url } = data;
        if (approval_url) {
          window.location.href = approval_url;
          return { success: true };
        }
        toast.error("Failed to get PayPal approval URL");
        return { success: false, message: "Failed to get PayPal approval URL" };
      }

      const { public_key, session_id } = data;
      if (!public_key || !session_id) {
        toast.error("Invalid payment response");
        return { success: false, message: "Invalid payment response" };
      }

      const stripe = await loadStripe(public_key);
      if (!stripe) {
        toast.error("checkout failed");
        return { success: false };
      }

      const result = await stripe.redirectToCheckout({
        sessionId: session_id,
      });

      if (result.error) {
        toast.error(result.error.message);
        return { success: false, message: result.error.message };
      }

      return { success: true };
    } catch (e) {
      console.log("checkout failed: ", e);
      toast.error("checkout failed");
      return { success: false };
    } finally {
      setIsLoading(false);
      setProductId(null);
      setPendingPayment(null);
    }
  };

  /**
   * 处理支付流程：多种已启用支付方式时弹窗；仅一种时直接进入该渠道。
   */
  const handleCheckout = async (
    item: PricingItem,
    cn_pay: boolean = false
  ) => {
    if (!user) {
      setShowSignModal(true);
      return { needAuth: true };
    }

    const enabled = getEnabledPaymentMethods();
    if (enabled.length === 0) {
      toast.error("No payment method is enabled");
      return { success: false, message: "No payment method" };
    }

    if (enabled.length === 1) {
      setShowPaymentSelector(false);
      return runCheckout(item, cn_pay, enabled[0]);
    }

    setPendingPayment({ item, cn_pay });
    setShowPaymentSelector(true);
    return { showingSelector: true };
  };

  /**
   * 处理支付方式选择（弹窗内）
   */
  const handlePaymentMethodSelect = async (paymentMethod: PaymentMethod) => {
    if (!pendingPayment) return;
    const { item, cn_pay } = pendingPayment;
    setShowPaymentSelector(false);
    return runCheckout(item, cn_pay, paymentMethod);
  };

  return {
    handleCheckout,
    handlePaymentMethodSelect,
    isLoading,
    productId,
    showPaymentSelector,
    setShowPaymentSelector,
  };
}
