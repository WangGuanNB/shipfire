# 订阅支付开发文档

> 本文档描述为 ShipFire 模板新增「订阅支付」能力的完整技术方案与任务清单。  
> 开发顺序：**Creem → PayPal → Stripe**，每阶段独立完整可上线。

---

## 一、需求概览

| 付费模式 | 计费周期 | 套餐 | 对应 `interval` |
|----------|----------|------|-----------------|
| 月订阅 | 每月自动续费 | Basic / Standard / Premium | `month` |
| 年订阅 | 每年自动续费 | Basic / Standard / Premium | `year` |
| 一次性 | 买断，不续费 | Basic / Standard / Premium | `one-time` |

**配置驱动原则**：环境变量里有对应产品 ID，才会在定价页显示对应 Tab。  
例如：只配了 one-time 的产品 ID，定价页只出现「One-time」Tab；三种都配，三 Tab 全显示。

**积分续期规则**：订阅续费后，积分按套餐额度重置（旧积分到期自然失效，新周期插入新积分记录）。

---

## 二、支付渠道能力对照

| 渠道 | 一次性 | 月订阅 | 年订阅 | 备注 |
|------|--------|--------|--------|------|
| Creem | ✅ | ✅ | ✅ | 主力支付，Phase 1 |
| PayPal | ✅ | 🚧 | 🚧 | 需 Billing Plans API，Phase 2 |
| Stripe | ✅ | ✅ | ✅ | 代码已具备，补 webhook，Phase 3 |

---

## 三、架构说明

### 数据流（订阅首次购买）

```
用户点击「Subscribe」
    → usePayment.handleCheckout(item)
    → 弹出 PaymentMethodSelector
    → 用户选择 Creem
    → POST /api/checkout  (or /api/checkout/creem)
    → validateAndCreateOrder()  创建 created 状态订单
    → handleCreemCheckout()  is_subscription 根据 interval 动态计算
    → createCreemCheckoutSession() 携带 subscription: { interval }
    → 返回 checkout_url
    → 用户在 Creem 页面完成支付
    → Creem 回调 /api/creem-notify
    → handleCreemOrder()  更新订单状态 + 发放积分 + 存储 sub_id
```

### 数据流（订阅续费）

```
Creem 每期扣款成功
    → Creem 发送 webhook 到 /api/creem-notify/（须带尾部斜杠，见第十节）
    → eventType: "subscription.paid"（官方文档如此；不存在 subscription.renewed）
    → handleCreemSubscriptionRenewal()
        → 若 current_period_end_date 未晚于 order.expired_at（+1 天容差）→ 视为首扣已由 checkout.completed 处理，跳过
        → 否则：findOrderBySubId(sub_id) → renewSubscriptionOrder() 更新同一订单行
        → resetCreditsForRenewal() 插入新周期积分（trans_type: subscription_renew）
```

### 配置驱动的 Tab 显示

```
getPricingPage(locale)
    → getAvailableGroups()  读取环境变量
    → 过滤 pricing.groups  (只保留有产品 ID 的)
    → 过滤 pricing.items   (只保留对应 group 的)
    → 返回给前端
```

---

## 四、数据库字段说明（orders 表）

订阅相关字段均已存在，Phase 1 开始正式启用：

| 字段 | 含义 | 何时写入 |
|------|------|----------|
| `interval` | 计费周期：`month` / `year` / `one-time` | 创建订单时 |
| `sub_id` | Creem 订阅 ID | 首次支付 webhook 处理后 |
| `sub_period_start` | 当前周期开始时间（Unix 秒） | 首次 + 每次续费 |
| `sub_period_end` | 当前周期结束时间（Unix 秒） | 首次 + 每次续费 |
| `sub_times` | 已续费次数 | 每次续费 +1 |
| `expired_at` | 权限到期时间 | 创建时 + 每次续费延长 |

---

## 五、积分机制说明

积分表（`credits_shipfire`）每条记录均有 `expired_at`。  
**月订阅积分重置原理**：

```
第 1 个月付款 → 插入积分记录，expired_at = 第 1 个月末
第 2 个月续费 → 插入新积分记录，expired_at = 第 2 个月末
             第 1 个月积分已自然过期，用户有效积分 = 第 2 个月的积分
```

不需要手动"清零"，`getUserValidCredits()` 只返回未过期的积分。

---

## 六、开发任务清单（Phase 1 - Creem）

### 前置：读文件清单
每次 AI 接手任务前必须先读：
- `src/i18n/pages/pricing/en.json`
- `src/i18n/pages/pricing/zh.json`
- `src/components/blocks/pricing/index.tsx`
- `src/hooks/usePayment.ts`
- `src/app/api/checkout/route.ts`
- `src/app/api/checkout/creem/route.ts`
- `src/services/creem.ts`
- `src/services/order.ts`
- `src/services/credit.ts`
- `src/services/config.ts`
- `src/models/order.ts`
- `src/db/schema.ts`
- `src/types/blocks/pricing.d.ts`
- `wrangler.jsonc`

---

### TASK 1 — 更新定价 JSON

**文件**：`src/i18n/pages/pricing/en.json` + `zh.json`

- `groups` 改为 3 个：`monthly` / `yearly` / `one-time`
- monthly 套餐：`interval` → `"month"`，`valid_months: 1`
- yearly 套餐：`interval` → `"year"`，`valid_months: 12`
- 新增 one-time 套餐（3 个），`interval: "one-time"`，`group: "one-time"`
- creem_product_id 引用新 env var 别名：`starter_onetime` / `standard_onetime` / `premium_onetime`

---

### TASK 2 — 更新 wrangler.jsonc

**文件**：`wrangler.jsonc`

新增环境变量：
```
NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_ONETIME   = ""
NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_ONETIME  = ""
NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_ONETIME   = ""
CREEM_WEBHOOK_SECRET                           = ""  (生产用 wrangler secret put)
```

注释中注明 Webhook URL: `https://yourdomain.com/api/creem-notify/`（`trailingSlash: true` 时必须带 `/`）

---

### TASK 3 — `config.ts` 新增 `getAvailableGroups()`

**文件**：`src/services/config.ts`

```typescript
export function getAvailableGroups(): {
  monthly: boolean;
  yearly: boolean;
  onetime: boolean;
} {
  const hasMonthly = !!(
    process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_MONTHLY ||
    process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_MONTHLY ||
    process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_MONTHLY ||
    process.env.STRIPE_PRIVATE_KEY
  );
  const hasYearly = !!(
    process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_YEARLY ||
    process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_YEARLY ||
    process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_YEARLY ||
    process.env.STRIPE_PRIVATE_KEY
  );
  const hasOnetime = !!(
    process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_ONETIME ||
    process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_ONETIME ||
    process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_ONETIME ||
    process.env.STRIPE_PRIVATE_KEY
  );
  return { monthly: hasMonthly, yearly: hasYearly, onetime: hasOnetime };
}
```

---

### TASK 4 — `page.ts` 更新 `getPricingPage()`

**文件**：`src/services/page.ts`

修改 `getPricingPage()` 在返回数据前：
1. 调用 `getAvailableGroups()`
2. 计算可用 group names 列表
3. 过滤 `pricing.groups`（保留可用的）
4. 过滤 `pricing.items`（只保留属于可用 group 的）

---

### TASK 5 — 修复统一 checkout 的 `is_subscription` 硬编码

**文件**：`src/app/api/checkout/route.ts`

`handleCreemCheckout` 函数：
- 参数 interface 加 `interval: string`
- `is_subscription: false` → `is_subscription: interval === "month" || interval === "year"`
- 同时传 `interval: interval === "year" ? "year" : "month"`
- POST handler 调用处补传 `interval`

---

### TASK 6 — 产品 ID 映射补全 one-time

**文件**：`src/app/api/checkout/route.ts` + `src/app/api/checkout/creem/route.ts`

两文件的 `creemProductIdMap` / `creemKeyMap` 新增：
```typescript
starter_onetime:  process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_ONETIME,
standard_onetime: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_ONETIME,
premium_onetime:  process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_ONETIME,
```

---

### TASK 7 — 新建 Creem Webhook 路由【重要：此路由当前缺失！】

**文件**：新建 `src/app/api/creem-notify/route.ts`

处理事件（以 [Creem Webhooks 文档](https://docs.creem.io/code/webhooks) 为准）：
- `checkout.completed` / `payment.succeeded` → `handleCreemOrder()`（首单含订阅首扣）
- **`subscription.paid`** → `handleCreemSubscriptionRenewal()`（每期扣款都会发；**首扣与续费需去重**，见第十节）
- **`subscription.canceled`** → `handleCreemSubscriptionCanceled()`（可选）
- **勿**把 `subscription.active` 当续费处理（官方建议仅用 checkout / subscription.paid 开通权益）

包含签名验证（`CREEM_WEBHOOK_SECRET` 配置后才校验）。

> ⚠️ **不存在** `subscription.renewed` 事件名；若文档旧稿写 renewed，以官方 `subscription.paid` 为准。

---

### TASK 8 — `models/order.ts` 新增 `findOrderBySubId()`

通过 `sub_id` 字段查找订阅订单，用于续费时匹配原始订单。

---

### TASK 9 — `models/order.ts` 新增 `renewSubscriptionOrder()`

续费时更新 `expired_at`、`sub_period_end`、`sub_period_start`、`sub_times`、`paid_detail`。

---

### TASK 10 — `services/credit.ts` 订阅续费积分支持

1. `CreditsTransType` 枚举新增 `SubscriptionRenew = "subscription_renew"`
2. 新增 `resetCreditsForRenewal()` 函数：插入新周期积分记录（旧积分到期自然失效）

---

### TASK 11 — `services/order.ts` 新增 `handleCreemSubscriptionRenewal()`

核心续费处理函数（**事件为 `subscription.paid`**，且须实现 **10.3 首扣/续费去重**）：
1. 从 webhook data 提取 `sub_id`（`object.object === "subscription"` 时取 `object.id`）
2. `findOrderBySubId()` 找原始订单；找不到或非 `paid` 则安全返回
3. 比较 `current_period_end_date` 与 `order.expired_at`，未越过首扣周期则跳过
4. 否则：`renewSubscriptionOrder()` 更新**同一**订单；`resetCreditsForRenewal()` 发放新周期积分

---

### TASK 12 — `handleCreemOrder()` 首次订阅后存储 `sub_id`

**文件**：`src/services/order.ts`

首次支付成功后，如果是订阅型订单（`interval !== "one-time"`），从 webhook data 提取 `sub_id` 并调用 `updateOrderSubscription()` 保存。

---

### TASK 13 — 定价 UI 改为三 Tab

**文件**：`src/components/blocks/pricing/index.tsx`

- `pricing.groups` 服务端已过滤，前端直接渲染传来的 groups
- Tab 数量由 `groups.length` 动态决定（1 个 group 时隐藏 Tab 栏）
- 卡片渲染逻辑完全不变

---

## 七、验收清单

| 检查项 | 验证方法 |
|--------|----------|
| 只配 one-time 产品 ID 时，仅显示 One-time Tab | 清空 monthly/yearly env var 后刷新 |
| Monthly checkout 向 Creem 传 `is_subscription: true` | 查 Creem Dashboard 订单类型 |
| 首次订阅支付后 `order.sub_id` 有值 | 查数据库 orders 表 |
| `/api/creem-notify` POST 能正常响应 | curl 发测试 POST |
| 续费：`subscription.paid` 且周期结束日晚于当前 `expired_at` 后 `expired_at` 延长 | 真实二期或改日期后 curl（见第十节） |
| 续费后 credits 表有 `subscription_renew` 记录 | 查数据库 credits 表 |

---

## 八、Phase 2 预告：PayPal 订阅

工作量较大（需要独立的 Billing Plans API）：

1. 在 PayPal Dashboard 为每个套餐/周期创建 Billing Plan，获取 `plan_id`
2. `wrangler.jsonc` 新增 `PAYPAL_PLAN_ID_BASIC_MONTHLY` 等 6 个 env var
3. `handlePayPalCheckout` 订阅模式走 `/v1/billing/subscriptions` 而非 Orders v2
4. `/api/paypal-notify` 补 `BILLING.SUBSCRIPTION.RENEWED` 事件
5. 复用 `renewSubscriptionOrder()` + `resetCreditsForRenewal()` (Phase 1 已建好)

## 九、Phase 3 预告：Stripe 订阅

改动量最小，框架已基本具备：

1. `/api/stripe-notify` 补 `invoice.payment_succeeded` 事件处理
2. 补 `customer.subscription.deleted` 事件处理  
3. 复用 Phase 1 建好的所有 model 函数

---

## 十、跨项目复用：订阅 + 积分逻辑（给 AI / 二次接入用）

> 本节总结 **ShipFire 当前实现** 的设计约束与易错点，便于在**另一个项目**中复制「一次性 + 订阅」并存、且**续费改原订单 + 积分按周期重置**的模式，**避免按错误事件名或错误数据源实现**。

### 10.1 一次性购买 vs 订阅（产品层）

| 维度 | 一次性 (`one-time`) | 订阅 (`month` / `year`) |
|------|---------------------|-------------------------|
| 订单 `interval` | `one-time` | `month` 或 `year` |
| Creem 结账 | 非订阅产品 / `is_subscription: false` | 产品在 Dashboard 配为 recurring；请求体通常**不再**额外带 `subscription: {…}`（以 Creem API 当前要求为准） |
| 首笔成功 | **`checkout.completed`** → 订单 `paid`、发积分（如 `order_pay`）、**无** `sub_id` | 同上 + 从 payload 写入 **`sub_id`** 到订单 |
| 后续扣款 | 无 | **`subscription.paid`**（每期一次），**不是** `subscription.renewed`（官方无此事件名） |
| 订单行策略 | 一笔订单一笔交易 | **推荐**：**同一 `sub_id` 只对应一条主订单**；续费 **UPDATE** 该行（`expired_at`、`sub_times`、周期字段），**不要**每期 `INSERT` 新订单（除非你的产品定义要求「每期一张销售单」） |
| 积分策略 | 一条（或按业务）`expired_at` 与合约一致 | **首扣**：`order_pay`（或等价类型）；**续费**：**新插一条** `subscription_renew`（或等价），`expired_at` = **新周期末**；旧周期积分靠 `expired_at` **自然失效**，不必物理删除 |

### 10.2 Creem Webhook：必须对齐官方事件名

参考：<https://docs.creem.io/code/webhooks>

- **`checkout.completed`**：结账完成；订阅首扣在这里拿到 `object.subscription.id`（`sub_id`）。
- **`subscription.paid`**：**每次**订阅扣款成功都会触发（**包含首扣 + 每一期续费**）。
- **`subscription.canceled`**：取消；可将订单 `expired_at` 收敛到当前周期末（与 ShipFire `handleCreemSubscriptionCanceled` 一致）。
- **`subscription.active`**：订阅激活；文档说明**仅同步**，**不要**与 **`subscription.paid`** 重复发放权益或重复当「续费」处理，否则易与 `checkout.completed` 冲突。

**严禁**在代码里监听臆造的 **`subscription.renewed`**（官方文档无此 `eventType`）。

### 10.3 核心难点：`subscription.paid` 首扣与续费去重

因为 **`subscription.paid` 在首扣也会发**，若每次收到都「续费发积分 + 延长订单」，会**重复**于 `checkout.completed`。

**ShipFire 做法**（迁移时请保留等价逻辑）：

1. 用 payload 中 **`object.id`**（即 `sub_id`）`findOrderBySubId`。
2. 若找不到订单 → **直接 return**（可能首扣时 `checkout.completed` 尚未写入 `sub_id`，属竞态，勿抛致命错）。
3. 若订单非 `paid` → return。
4. 取 **`object.current_period_end_date`**，与数据库 **`order.expired_at`** 比较：  
   - 若 `periodEnd <= expired_at + 1 天`（容差避免边界时差）→ 视为**首扣已由 `checkout.completed` 处理**，**跳过**。  
   - 若 **`periodEnd` 明显晚于** 当前 `expired_at` → 视为**真实续费**：更新订单到期、`sub_times += 1`，并 **`resetCreditsForRenewal`**。

续费后的 **`expired_at` / 新积分包的到期** 优先采用 Creem 的 **`current_period_end_date`**，比本地「+1 月」推算更准。

### 10.4 订单表与积分表职责分离（测「到期」必看）

- **`orders.expired_at`**：表示**合约/订阅周期**层面的到期展示与逻辑判断之一。
- **积分表每条记录的 `expired_at`**：决定 **`getUserValidCredits` 类汇总**是否计入该包。

**只改 `orders.expired_at` 为过去，不会自动让已发放积分失效**；要模拟用户「完全没权益」，需同时把**对应积分行**的 `expired_at` 改为过去，或实现「订单过期同步作废积分」任务。

### 10.5 Webhook 工程细节（另一项目也易踩坑）

1. **URL 尾部斜杠**：若 Next 配置 **`trailingSlash: true`**，Webhook 须为 **`https://域名/api/creem-notify/`**；无斜杠常 **308**，且部分客户端对 POST 跟随重定向行为不一致。
2. **签名**：请求体 **原始字符串** 做 **HMAC-SHA256**，密钥为 **`CREEM_WEBHOOK_SECRET`**，摘要 **hex**，请求头 **`creem-signature`**（与 ShipFire `verifyCreemWebhookSignature` 一致）。
3. **Creem「Send test event」**：示例 payload 里的 **`sub_id` 多为虚构**，与你们库中订单对不上 → 日志会「找不到订单」属正常；**真测续费**应用真实 `sub_id` 并改 **`current_period_end_date` 晚于** 当前 `expired_at`（或等真实第二期扣款）。

### 10.6 迁移到另一项目的实施顺序（建议）

1. **数据模型**：订单表具备 `interval`、`sub_id`、`sub_times`、`expired_at`（及可选 `sub_period_*`）；积分表具备 `trans_type`、`order_no`、`expired_at`。
2. **Checkout**：`month`/`year` 走订阅结账；`one-time` 走一次性；映射正确的产品 ID。
3. **Webhook 路由**：验签 → 分发 **`checkout.completed`** / **`subscription.paid`** / **`subscription.canceled`**。
4. **`checkout` 处理**：幂等、更新订单 `paid`、写 `sub_id`、首笔积分。
5. **`subscription.paid` 处理**：按 **10.3** 去重后，再更新订单 + 续费积分。
6. **验收**：首单后库中有 `sub_id`；手动或第二期真实 `subscription.paid` 后 **同一订单** `sub_times` 增加、`expired_at` 延长、积分表出现 **`subscription_renew`**（或你项目中的等价类型）。

### 10.7 常见错误清单（AI 自检）

| 错误 | 后果 |
|------|------|
| 监听 `subscription.renewed` | 永远收不到或行为与文档不符 |
| 把 `subscription.active` 当续费 | 与首单重复处理或缺字段报错 |
| 每次 `subscription.paid` 都发积分、不做 10.3 比较 | 首扣**双倍**积分 |
| 续费 `INSERT` 新订单且同一 `sub_id` | 对账混乱；除非明确要「每期一单」 |
| 认为改 `orders.expired_at` 即收回积分 | 余额仍按积分表计算，现象与预期不符 |
| Webhook URL 无尾部斜杠 | 308 / 验签 body 与重定向不一致 |
| 本地 curl 与线上 `CREEM_WEBHOOK_SECRET` 混用 | 401 Invalid signature |

---

*最后更新：2026-05-10*
