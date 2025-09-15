/**
 * @fileoverview 支付弹窗组件
 * @description 可复用的支付弹窗组件，支持桌面端和移动端适配，多语言支持
 * @author Miniatur AI Team
 * @created 2025-01-26
 * 
 * @features
 * - 响应式设计（桌面用Dialog，移动端用Drawer）
 * - 多语言支持（中文/英文/葡萄牙语/马来语）
 * - Stripe支付集成
 * - 套餐展示和选择
 * - 支付状态管理
 * - 自定义标题和描述
 * - 支付成功回调
 * - 半透明背景效果
 * 
 * @usage
 * ```tsx
 * <PaymentModal
 *   open={open}
 *   onOpenChange={setOpen}
 *   pricingItems={pricingItems}
 *   title={t('payment.modal.title')}
 *   description={t('payment.modal.description')}
 *   onSuccess={() => console.log("支付成功")}
 * />
 * ```
 */

"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { usePayment } from "@/hooks/usePayment";
import { PricingItem } from "@/types/blocks/pricing";
import { useTranslations } from 'next-intl';
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

/**
 * 支付弹窗组件参数接口
 */
interface PaymentModalProps {
  /** 弹窗是否打开 */
  open: boolean;
  /** 弹窗状态改变回调 */
  onOpenChange: (open: boolean) => void;
  /** 定价项目列表 */
  pricingItems: PricingItem[];
  /** 弹窗标题 */
  title?: string;
  /** 弹窗描述 */
  description?: string;
  /** 支付成功回调 */
  onSuccess?: () => void;
}

/**
 * 支付弹窗组件
 */
export default function PaymentModal({
  open,
  onOpenChange,
  pricingItems,
  title,
  description,
  onSuccess,
}: PaymentModalProps) {
  const t = useTranslations();
  const { handleCheckout, isLoading, productId } = usePayment();
  const isDesktop = useMediaQuery("(min-width: 768px)");

  /**
   * 处理支付点击事件
   * @param {PricingItem} item - 选中的定价项目
   */
  const onPayment = async (item: PricingItem) => {
    const result = await handleCheckout(item, false); // 只使用国际支付
    
    if (result.success) {
      onSuccess?.();
      onOpenChange(false);
    }
  };

  /**
   * 定价内容组件
   * @param {Object} props - 组件参数
   * @param {string} props.className - 自定义样式类名
   */
  const PricingContent = ({ className }: { className?: string }) => (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6", className)}>
      {pricingItems.map((item, index) => (
        <Card 
          key={item.product_id} 
          className={`relative ${item.is_featured ? 'ring-2 ring-primary' : ''}`}
        >
          {/* 热门标签 */}
          {item.is_featured && (
            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
              {t('payment.modal.most_popular')}
            </Badge>
          )}

          {/* 套餐头部信息 */}
          <CardHeader className="text-center pb-4">
            <h3 className="font-bold text-lg">{item.title || item.product_name}</h3>
            <div className="space-y-2">
              {/* 价格显示 */}
              <div className="text-3xl font-bold">
                {item.currency === 'usd' ? '$' : '¥'}
                {item.currency === 'usd' ? item.amount / 100 : (item.cn_amount || item.amount) / 100}
              </div>
              {/* 订阅周期 */}
              {item.interval !== 'one-time' && (
                <div className="text-sm text-muted-foreground">
                  / {t(`payment.modal.${item.interval}`)}
                </div>
              )}
            </div>
            {/* 积分数量 */}
            <div className="text-primary font-semibold">
              {item.description || `${item.amount / 100} ${t('payment.modal.credits')}`}
            </div>
          </CardHeader>

          {/* 套餐详情和购买按钮 */}
          <CardContent className="space-y-4">
            {/* 功能特性列表 */}
            {item.features && (
              <ul className="space-y-2">
                {item.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* 购买按钮 - 只保留一个按钮 */}
            <div className="space-y-2">
              <Button
                onClick={() => onPayment(item)}
                disabled={isLoading && productId === item.product_id}
                className="w-full"
                variant={item.is_featured ? "default" : "outline"}
              >
                {isLoading && productId === item.product_id
                  ? t('payment.modal.processing')
                  : t('payment.modal.select_plan')
                }
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // 桌面端显示 - 使用Dialog（自定义半透明遮罩层）
  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogPortal>
          {/* 自定义半透明遮罩层 */}
          <DialogOverlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {title || t('payment.modal.title')}
              </DialogTitle>
              {description && (
                <DialogDescription className="text-base">
                  {description}
                </DialogDescription>
              )}
            </DialogHeader>
            <PricingContent />
          </DialogContent>
        </DialogPortal>
      </Dialog>
    );
  }

  // 移动端显示 - 使用Drawer（添加半透明背景）
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t">
        <DrawerHeader className="text-center">
          <DrawerTitle className="text-2xl font-bold">
            {title || t('payment.modal.title')}
          </DrawerTitle>
          {description && (
            <DrawerDescription className="text-base">
              {description}
            </DrawerDescription>
          )}
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto">
          <PricingContent className="grid-cols-1" />
        </div>
      </DrawerContent>
    </Drawer>
  );
}