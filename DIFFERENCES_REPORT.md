# Astrocartography vs Shipfire 功能差异报告

## 📋 差异清单

### ✅ 已同步的功能
1. **Google 登录鉴权** - 完全一致，无需更新
2. **价格模块 (Pricing)** - 完全一致，无需更新
3. **基础邮箱服务** - 已添加通用 `sendEmail` 和 `sendContactFormEmail`

---

## 🔍 发现的差异点

### 1. 邮箱服务功能差异

#### 1.1 EmailType 枚举
- **Astrocartography**: 有 `EmailType` 枚举（OrderConfirmation, RefundNotification, ContactForm）
- **Shipfire**: 无此枚举
- **建议**: ⚠️ **通用功能** - 可以添加，用于类型定义和代码可读性

#### 1.2 订单确认邮件
- **Astrocartography**: 有 `sendOrderConfirmationEmail()` 函数
  - 发送订单确认邮件给客户
  - 包含订单详情、访问信息、帮助链接
- **Shipfire**: 无此功能
- **建议**: ✅ **通用功能** - 建议添加，这是电商/订阅服务的标准功能

#### 1.3 退款通知邮件
- **Astrocartography**: 枚举中有 `RefundNotification`，但未找到具体实现
- **Shipfire**: 无此功能
- **建议**: ⚠️ **通用功能** - 可以添加，但需要先确认是否有退款流程

---

### 2. 订单服务集成差异

#### 2.1 订单处理中的邮件发送
- **Astrocartography**: `handleOrderSession()` 在订单支付成功后自动发送确认邮件
- **Shipfire**: `handleOrderSession()` 不发送邮件
- **建议**: ✅ **通用功能** - 建议更新，在订单成功后自动发送确认邮件

---

### 3. 反馈功能差异

#### 3.1 反馈邮件通知
- **Astrocartography**: `add-feedback` API 会：
  - 获取用户邮箱和昵称
  - 发送邮件通知给支持邮箱（包含评分和反馈内容）
  - 支持未登录用户提供邮箱
- **Shipfire**: `add-feedback` API 只保存到数据库，不发送邮件
- **建议**: ✅ **通用功能** - 建议添加，便于及时收到用户反馈

---

### 4. 测试和调试功能

#### 4.1 测试邮件 API
- **Astrocartography**: 有 `/api/test-email` 路由
  - 用于测试 Resend 邮件配置
  - 发送测试邮件验证配置是否正确
- **Shipfire**: 无此功能
- **建议**: ✅ **通用功能** - 建议添加，开发/调试时很有用

---

### 5. 项目特定功能（不推荐同步）

以下功能是 astrocartography 项目特定的，**不建议**同步到 shipfire：

- ❌ `calculate-astrocartography` API - 星盘计算功能
- ❌ `search-location` API - 位置搜索功能
- ❌ `astro-chat` API - 星盘聊天功能
- ❌ 其他业务逻辑相关的 API

---

## 📊 优先级建议

### 高优先级（建议立即添加）
1. ✅ **订单确认邮件** (`sendOrderConfirmationEmail`)
2. ✅ **订单处理集成** (在 `handleOrderSession` 中调用邮件发送)
3. ✅ **反馈邮件通知** (更新 `add-feedback` API)

### 中优先级（建议添加）
4. ✅ **测试邮件 API** (`/api/test-email`)
5. ⚠️ **EmailType 枚举** (代码规范，可选)

### 低优先级（可选）
6. ⚠️ **退款通知邮件** (如果项目有退款流程)

---

## 🔧 实施建议

### 通用功能（可以安全添加）
- ✅ 订单确认邮件功能
- ✅ 反馈邮件通知
- ✅ 测试邮件 API
- ✅ EmailType 枚举

### 需要谨慎的功能
- ⚠️ 退款通知邮件（需要确认是否有退款流程）

### 不应添加的功能
- ❌ 所有项目特定的业务逻辑 API

---

## 📝 总结

**主要差异集中在邮件功能的完整性上**：
- Astrocartography 有完整的邮件通知体系（订单、反馈、测试）
- Shipfire 目前只有基础的联系表单邮件功能

**建议同步的功能都是通用的、模板项目应该具备的标准功能**，不会影响项目的通用性。

