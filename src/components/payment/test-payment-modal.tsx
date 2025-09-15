/**
 * @fileoverview 支付弹窗测试组件
 * @description 用于测试支付弹窗功能的临时组件，支持多语言
 * @author Miniatur AI Team
 * @created 2025-01-26
 * 
 * @note 此文件仅用于开发测试，生产环境可删除
 */

"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import PaymentModal from "./payment-modal";
import { usePaymentModal } from "@/hooks/usePaymentModal";
import { useTranslations } from 'next-intl';
import { PricingItem } from '@/types/blocks/pricing';

/**
 * 生成多语言测试数据
 * @param t 翻译函数
 * @returns 测试用的定价项目数组
 */
const getMockPricingItems = (t: any): PricingItem[] => [
  {
    product_id: "basic",
    title: t('payment.test.basic.title'),
    description: t('payment.test.basic.description'),
    amount: 999,
    cn_amount: 999,
    currency: "usd",
    interval: "one-time",
    is_featured: false,
    features: [
      t('payment.test.basic.feature1'),
      t('payment.test.basic.feature2'),
      t('payment.test.basic.feature3')
    ]
  },
  {
    product_id: "pro",
    title: t('payment.test.pro.title'),
    description: t('payment.test.pro.description'),
    amount: 2999,
    cn_amount: 2999,
    currency: "usd",
    interval: "one-time",
    is_featured: true,
    features: [
      t('payment.test.pro.feature1'),
      t('payment.test.pro.feature2'),
      t('payment.test.pro.feature3'),
      t('payment.test.pro.feature4')
    ]
  },
  {
    product_id: "enterprise",
    title: t('payment.test.enterprise.title'),
    description: t('payment.test.enterprise.description'),
    amount: 9999,
    cn_amount: 9999,
    currency: "usd",
    interval: "one-time",
    is_featured: false,
    features: [
      t('payment.test.enterprise.feature1'),
      t('payment.test.enterprise.feature2'),
      t('payment.test.enterprise.feature3'),
      t('payment.test.enterprise.feature4'),
      t('payment.test.enterprise.feature5')
    ]
  }
];

export default function TestPaymentModal() {
  const t = useTranslations();
  const { 
    open, 
    pricingItems, 
    modalConfig, 
    showPaymentModal, 
    setOpen 
  } = usePaymentModal();

  /**
   * 显示默认配置的支付弹窗
   */
  const handleShowPayment = () => {
    const mockItems = getMockPricingItems(t);
    showPaymentModal(mockItems, {
      title: t('payment.modal.title'),
      description: t('payment.modal.description'),
      onSuccess: () => {
        console.log("🎉 支付成功回调触发!");
        alert(t('payment.test.success_message') || "支付成功！积分已到账");
      }
    });
  };

  /**
   * 显示自定义配置的支付弹窗
   */
  const handleShowCustomPayment = () => {
    const mockItems = getMockPricingItems(t);
    showPaymentModal(mockItems, {
      title: t('payment.test.insufficient_title') || "积分不足",
      description: t('payment.test.insufficient_description') || "您的积分不足，请升级套餐继续使用AI功能",
      onSuccess: () => {
        console.log("🎉 自定义支付成功!");
        alert(t('payment.test.upgrade_success') || "升级成功！功能已解锁");
      }
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="border rounded-lg p-6 bg-card">
        <h1 className="text-2xl font-bold mb-4">
          🧪 {t('payment.test.test_title') || "支付弹窗测试"}
        </h1>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Button onClick={handleShowPayment} size="lg" className="w-full">
              🚀 {t('payment.test.open_default') || "打开支付弹窗 (默认配置)"}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t('payment.test.default_description') || "使用翻译配置的标题和描述"}
            </p>
          </div>
          
          <div className="space-y-2">
            <Button onClick={handleShowCustomPayment} size="lg" variant="outline" className="w-full">
              ⚡ {t('payment.test.open_custom') || "打开支付弹窗 (自定义配置)"}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t('payment.test.custom_description') || "模拟积分不足时的支付场景"}
            </p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">
            📝 {t('payment.test.instructions_title') || "测试说明"}:
          </h3>
          <ul className="text-sm space-y-1">
            <li>• {t('payment.test.instruction1') || "桌面端显示为 Dialog 弹窗"}</li>
            <li>• {t('payment.test.instruction2') || "移动端显示为 Drawer 抽屉"}</li>
            <li>• {t('payment.test.instruction3') || "支持多语言切换"}</li>
            <li>• {t('payment.test.instruction4') || "包含国际支付和中国支付选项"}</li>
            <li>• {t('payment.test.instruction5') || "需要登录才能进行支付"}</li>
          </ul>
        </div>
      </div>

      <PaymentModal
        open={open}
        onOpenChange={setOpen}
        pricingItems={pricingItems}
        title={modalConfig.title}
        description={modalConfig.description}
        onSuccess={modalConfig.onSuccess}
      />
    </div>
  );
}