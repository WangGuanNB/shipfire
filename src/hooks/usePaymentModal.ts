/**
 * @fileoverview 支付弹窗控制 Hook
 * @description 管理支付弹窗的显示状态、配置数据和交互逻辑
 * @author Miniatur AI Team
 * @created 2025-01-26
 * 
 * @features
 * - 弹窗开关状态管理
 * - 定价数据状态管理
 * - 弹窗配置参数管理
 * - 支付成功回调处理
 * - 优化的性能控制（useCallback）
 * 
 * @usage
 * ```tsx
 * const { open, pricingItems, showPaymentModal, setOpen } = usePaymentModal();
 * 
 * const handleShowPayment = () => {
 *   showPaymentModal(items, {
 *     title: "选择套餐",
 *     description: "升级解锁更多功能",
 *     onSuccess: () => console.log("支付成功")
 *   });
 * };
 * 
 * return (
 *   <PaymentModal
 *     open={open}
 *     onOpenChange={setOpen}
 *     pricingItems={pricingItems}
 *   />
 * );
 * ```
 */

"use client";

import { useState, useCallback } from 'react';
import { PricingItem } from '@/types/blocks/pricing';

/**
 * 弹窗配置接口
 */
interface ModalConfig {
  title?: string;
  description?: string;
  onSuccess?: () => void;
}

/**
 * 支付弹窗控制 Hook
 * @returns {Object} 弹窗相关的状态和控制方法
 * @returns {boolean} open - 弹窗是否打开
 * @returns {PricingItem[]} pricingItems - 定价项目列表
 * @returns {ModalConfig} modalConfig - 弹窗配置参数
 * @returns {Function} showPaymentModal - 显示支付弹窗
 * @returns {Function} hidePaymentModal - 隐藏支付弹窗
 * @returns {Function} setOpen - 直接设置弹窗状态
 */
export function usePaymentModal() {
  // 弹窗开关状态
  const [open, setOpen] = useState(false);
  
  // 定价项目数据
  const [pricingItems, setPricingItems] = useState<PricingItem[]>([]);
  
  // 弹窗配置参数
  const [modalConfig, setModalConfig] = useState<ModalConfig>({});

  /**
   * 显示支付弹窗
   * @param {PricingItem[]} items - 定价项目列表
   * @param {ModalConfig} config - 弹窗配置参数
   */
  const showPaymentModal = useCallback((
    items: PricingItem[],
    config?: ModalConfig
  ) => {
    setPricingItems(items);
    setModalConfig(config || {});
    setOpen(true);
  }, []);

  /**
   * 隐藏支付弹窗
   */
  const hidePaymentModal = useCallback(() => {
    setOpen(false);
  }, []);

  return {
    open,
    pricingItems,
    modalConfig,
    showPaymentModal,
    hidePaymentModal,
    setOpen,
  };
}