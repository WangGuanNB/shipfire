# 更新说明：订阅支付系统升级

## 元数据
- **更新日期**：2025-01-20
- **更新类型**：功能增强
- **影响范围**：支付系统、定价页面、订单管理、积分系统
- **优先级**：中（功能增强）
- **兼容性**：向后兼容（支持一次性购买 + 订阅）
- **预计工作量**：大（8-12小时）

## 更新摘要

为 ShipFire 添加完整的订阅支付能力，支持：
- **月订阅**（Monthly）：每月自动续费
- **年订阅**（Yearly）：每年自动续费
- **一次性购买**（One-time）：买断，不续费

支持 Creem、PayPal、Stripe 三种支付渠道，配置驱动的定价页面显示。

## 背景说明

原有系统只支持一次性购买，无法满足 SaaS 订阅模式的需求。本次升级实现：
1. 多种计费周期（月/年/一次性）
2. 自动续费和积分重置
3. 订阅管理（取消、续费）
4. 配置驱动的产品展示

## 影响的文件

### 新增文件
- `src/app/api/creem-notify/route.ts` - Creem Webhook 处理器（**重要：当前缺失**）

### 修改文件
- `src/i18n/pages/pricing/en.json` - 定价页面文案（3 个 Tab）
- `src/i18n/pages/pricing/zh.json` - 定价页面文案（3 个 Tab）
- `src/components/blocks/pricing/index.tsx` - 定价页面 UI（支持动态 Tab）
- `src/services/config.ts` - 新增 `getAvailableGroups()` 函数
- `src/services/page.ts` - `getPricingPage()` 过滤逻辑
- `src/app/api/checkout/route.ts` - 统一 checkout 支持订阅
- `src/app/api/checkout/creem/route.ts` - Creem checkout 支持订阅
- `src/services/creem.ts` - Creem API 订阅支持
- `src/services/order.ts` - 订单处理逻辑（首次订阅 + 续费）
- `src/services/credit.ts` - 积分续费逻辑
- `src/models/order.ts` - 新增订阅相关查询函数
- `wrangler.jsonc` - 新增订阅产品 ID 环境变量

### 数据库字段（已存在，开始启用）
- `orders.interval` - 计费周期
- `orders.sub_id` - 订阅 ID
- `orders.sub_period_start` - 周期开始时间
- `orders.sub_period_end` - 周期结束时间
- `orders.sub_times` - 续费次数
- `orders.expired_at` - 权限到期时间

## 依赖变更

无新增依赖，使用现有的支付 SDK。

## 配置变更

### 环境变量（wrangler.jsonc）

#### 新增 Creem 产品 ID
```jsonc
{
  "vars": {
    // ========== 月订阅产品 ID ==========
    "NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_MONTHLY": "",
    "NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_MONTHLY": "",
    "NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_MONTHLY": "",
    
    // ========== 年订阅产品 ID ==========
    "NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_YEARLY": "",
    "NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_YEARLY": "",
    "NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_YEARLY": "",
    
    // ========== 一次性购买产品 ID ==========
    "NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_ONETIME": "",
    "NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_ONETIME": "",
    "NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_ONETIME": "",
    
    // ========== Webhook 密钥 ==========
    "CREEM_WEBHOOK_SECRET": ""  // 生产环境用 wrangler secret put
  }
}
```

**注释说明：**
- Webhook URL: `https://yourdomain.com/api/creem-notify/`（**必须带尾部斜杠**，因为 `trailingSlash: true`）

## 迁移步骤

### 步骤 1：在 Creem Dashboard 创建产品

**操作：**
1. 访问 [Creem Dashboard](https://dashboard.creem.io)
2. 创建 9 个产品（3 个套餐 × 3 种周期）：
   - **Starter Monthly** - 月订阅，设置为 recurring
   - **Starter Yearly** - 年订阅，设置为 recurring
   - **Starter One-time** - 一次性购买
   - **Standard Monthly** - 月订阅，设置为 recurring
   - **Standard Yearly** - 年订阅，设置为 recurring
   - **Standard One-time** - 一次性购买
   - **Premium Monthly** - 月订阅，设置为 recurring
   - **Premium Yearly** - 年订阅，设置为 recurring
   - **Premium One-time** - 一次性购买
3. 复制每个产品的 `prod_xxx` ID

**说明：**
- 订阅产品必须在 Creem Dashboard 中设置为 "Recurring"
- 一次性产品设置为 "One-time"

### 步骤 2：配置环境变量

**操作：**
在 `wrangler.jsonc` 中填入产品 ID（见上面配置变更部分）

### 步骤 3：更新定价页面文案

**操作：**
修改 `src/i18n/pages/pricing/en.json` 和 `zh.json`：

```json
{
  "groups": [
    {
      "id": "monthly",
      "name": "Monthly",
      "description": "Billed monthly, cancel anytime"
    },
    {
      "id": "yearly",
      "name": "Yearly",
      "description": "Billed yearly, save 20%"
    },
    {
      "id": "one-time",
      "name": "One-time",
      "description": "Pay once, lifetime access"
    }
  ],
  "items": [
    // Starter Monthly
    {
      "id": "starter_monthly",
      "group": "monthly",
      "name": "Starter",
      "price": "$9.99",
      "amount": 999,
      "currency": "usd",
      "interval": "month",
      "valid_months": 1,
      "credits": 1000,
      "creem_product_id": "starter_monthly",
      "features": [...]
    },
    // ... 其他 8 个套餐
  ]
}
```

**关键字段：**
- `interval`: `"month"` / `"year"` / `"one-time"`
- `valid_months`: 月订阅 = 1，年订阅 = 12，一次性 = 根据业务定义
- `creem_product_id`: 对应环境变量的 key（如 `starter_monthly`）

### 步骤 4：实现配置驱动的 Tab 显示

**操作：**
在 `src/services/config.ts` 中添加：

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

修改 `src/services/page.ts` 的 `getPricingPage()` 函数，在返回前过滤：

```typescript
export async function getPricingPage(locale: string) {
  const pricing = await import(`@/i18n/pages/pricing/${locale}.json`);
  
  // 获取可用的 groups
  const availableGroups = getAvailableGroups();
  const availableGroupIds = Object.entries(availableGroups)
    .filter(([_, enabled]) => enabled)
    .map(([key]) => key === 'onetime' ? 'one-time' : key);
  
  // 过滤 groups 和 items
  const filteredGroups = pricing.groups.filter(g => 
    availableGroupIds.includes(g.id)
  );
  const filteredItems = pricing.items.filter(item => 
    availableGroupIds.includes(item.group)
  );
  
  return {
    ...pricing,
    groups: filteredGroups,
    items: filteredItems,
  };
}
```

### 步骤 5：更新 Checkout API

**操作：**
修改 `src/app/api/checkout/route.ts` 和 `src/app/api/checkout/creem/route.ts`：

1. **产品 ID 映射补全**：
```typescript
const creemProductIdMap: Record<string, string | undefined> = {
  starter_monthly: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_MONTHLY,
  standard_monthly: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_MONTHLY,
  premium_monthly: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_MONTHLY,
  starter_yearly: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_YEARLY,
  standard_yearly: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_YEARLY,
  premium_yearly: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_YEARLY,
  starter_onetime: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STARTER_ONETIME,
  standard_onetime: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_STANDARD_ONETIME,
  premium_onetime: process.env.NEXT_PUBLIC_CREEM_PRODUCT_ID_PREMIUM_ONETIME,
};
```

2. **修复 `is_subscription` 硬编码**：
```typescript
async function handleCreemCheckout(params: {
  order_no: string;
  product_id: string;
  amount: number;
  currency: string;
  success_url: string;
  cancel_url: string;
  user_email: string;
  credits: number;
  interval: string;  // 新增
}) {
  const is_subscription = params.interval === "month" || params.interval === "year";
  
  const session = await createCreemCheckoutSession({
    product_id: params.product_id,
    success_url: params.success_url,
    cancel_url: params.cancel_url,
    metadata: {
      order_no: params.order_no,
      user_email: params.user_email,
      credits: params.credits.toString(),
    },
    is_subscription,
    interval: params.interval === "year" ? "year" : "month",
  });
  
  // ...
}
```

### 步骤 6：创建 Creem Webhook 处理器

**操作：**
创建 `src/app/api/creem-notify/route.ts`（完整代码见代码示例部分）

**关键事件：**
- `checkout.completed` - 首次支付成功（包含订阅首扣）
- `subscription.paid` - 每期扣款成功（**包含首扣 + 续费**，需去重）
- `subscription.canceled` - 订阅取消

### 步骤 7：实现订阅续费逻辑

**操作：**

1. **在 `src/models/order.ts` 中添加**：
```typescript
// 通过 sub_id 查找订阅订单
export async function findOrderBySubId(
  sub_id: string
): Promise<typeof orders.$inferSelect | undefined> {
  const [order] = await db()
    .select()
    .from(orders)
    .where(eq(orders.sub_id, sub_id))
    .limit(1);
  return order;
}

// 续费：延长 expired_at 并更新周期信息
export async function renewSubscriptionOrder(
  order_no: string,
  new_expired_at: Date,
  sub_period_end: number,
  sub_period_start: number,
  sub_times: number,
  paid_detail: string
) {
  const [order] = await db()
    .update(orders)
    .set({
      expired_at: new_expired_at,
      sub_period_end,
      sub_period_start,
      sub_times,
      paid_detail,
    })
    .where(eq(orders.order_no, order_no))
    .returning();
  return order;
}
```

2. **在 `src/services/credit.ts` 中添加**：
```typescript
export enum CreditsTransType {
  // ... 现有类型
  SubscriptionRenew = "subscription_renew",
}

// 订阅续费：插入新周期积分
export async function resetCreditsForRenewal(
  user_uuid: string,
  credits: number,
  order_no: string,
  expired_at: Date
) {
  const trans_no = getSnowId();
  await insertCredit({
    trans_no,
    user_uuid,
    trans_type: CreditsTransType.SubscriptionRenew,
    credits,
    order_no,
    expired_at,
    created_at: new Date(),
  });
}
```

3. **在 `src/services/order.ts` 中添加**：
```typescript
// 处理订阅续费（subscription.paid 事件）
export async function handleCreemSubscriptionRenewal(data: any) {
  const sub_id = data.object?.id;
  if (!sub_id) return;
  
  // 查找原始订单
  const order = await findOrderBySubId(sub_id);
  if (!order || order.status !== OrderStatus.Paid) return;
  
  // 去重：比较周期结束日期
  const periodEnd = new Date(data.object.current_period_end_date);
  const currentExpired = order.expired_at;
  
  // 如果周期结束日期未晚于当前到期日期（+1天容差），视为首扣已处理
  if (periodEnd <= new Date(currentExpired.getTime() + 24 * 60 * 60 * 1000)) {
    console.log("[handleCreemSubscriptionRenewal] 首扣已由 checkout.completed 处理，跳过");
    return;
  }
  
  // 真实续费：更新订单
  const newExpiredAt = periodEnd;
  const subTimes = (order.sub_times || 0) + 1;
  
  await renewSubscriptionOrder(
    order.order_no,
    newExpiredAt,
    Math.floor(periodEnd.getTime() / 1000),
    Math.floor(new Date(data.object.current_period_start_date).getTime() / 1000),
    subTimes,
    JSON.stringify(data)
  );
  
  // 发放新周期积分
  await resetCreditsForRenewal(
    order.user_uuid,
    order.credits,
    order.order_no,
    newExpiredAt
  );
  
  console.log(`[handleCreemSubscriptionRenewal] 订阅续费成功: ${order.order_no}, 第 ${subTimes} 次`);
}
```

### 步骤 8：更新定价页面 UI

**操作：**
修改 `src/components/blocks/pricing/index.tsx`：

```typescript
export function PricingBlock({ pricing }: { pricing: PricingData }) {
  const [activeGroup, setActiveGroup] = useState(pricing.groups[0]?.id || "monthly");
  
  // 根据 activeGroup 过滤 items
  const filteredItems = pricing.items.filter(item => item.group === activeGroup);
  
  return (
    <div>
      {/* Tab 切换（如果只有 1 个 group 则隐藏） */}
      {pricing.groups.length > 1 && (
        <div className="tabs">
          {pricing.groups.map(group => (
            <button
              key={group.id}
              onClick={() => setActiveGroup(group.id)}
              className={activeGroup === group.id ? "active" : ""}
            >
              {group.name}
            </button>
          ))}
        </div>
      )}
      
      {/* 套餐卡片 */}
      <div className="pricing-cards">
        {filteredItems.map(item => (
          <PricingCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}
```

### 步骤 9：配置 Webhook

**操作：**
1. 访问 Creem Dashboard → Settings → Webhooks
2. 添加 Webhook URL: `https://yourdomain.com/api/creem-notify/`（**必须带尾部斜杠**）
3. 订阅事件：
   - `checkout.completed`
   - `subscription.paid`
   - `subscription.canceled`
4. 复制 Webhook Secret 到 `CREEM_WEBHOOK_SECRET`

## 代码示例

### 示例 1：Creem Webhook 处理器 (src/app/api/creem-notify/route.ts)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { handleCreemOrder, handleCreemSubscriptionRenewal } from "@/services/order";

// 验证 Creem Webhook 签名
function verifyCreemWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body);
  const expectedSignature = hmac.digest("hex");
  return signature === expectedSignature;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("creem-signature") || "";
    const secret = process.env.CREEM_WEBHOOK_SECRET;
    
    // 验证签名（生产环境必须）
    if (secret && !verifyCreemWebhookSignature(body, signature, secret)) {
      console.error("[Creem Webhook] 签名验证失败");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    
    const eventData = JSON.parse(body);
    const eventType = eventData.type;
    
    console.log(`[Creem Webhook] 收到事件: ${eventType}`);
    
    switch (eventType) {
      case "checkout.completed":
      case "payment.succeeded":
        // 首次支付成功（包含订阅首扣）
        await handleCreemOrder(eventData.data);
        break;
        
      case "subscription.paid":
        // 订阅扣款成功（包含首扣 + 续费，需去重）
        await handleCreemSubscriptionRenewal(eventData.data);
        break;
        
      case "subscription.canceled":
        // 订阅取消
        await handleCreemSubscriptionCanceled(eventData.data);
        break;
        
      default:
        console.log(`[Creem Webhook] 未处理的事件类型: ${eventType}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Creem Webhook] 处理失败:", error);
    return NextResponse.json({ error: "Webhook处理失败" }, { status: 500 });
  }
}
```

### 示例 2：订阅首次支付处理 (src/services/order.ts)

```typescript
export async function handleCreemOrder(data: any) {
  const order_no = data.metadata?.order_no;
  if (!order_no) {
    console.error("[handleCreemOrder] 缺少 order_no");
    return;
  }
  
  const order = await findOrderByOrderNo(order_no);
  if (!order || order.status === OrderStatus.Paid) {
    return; // 幂等性
  }
  
  // 更新订单状态
  await updateOrderStatus(
    order_no,
    OrderStatus.Paid,
    new Date().toISOString(),
    data.customer?.email || order.user_email,
    JSON.stringify(data)
  );
  
  // 如果是订阅，保存 sub_id
  if (order.interval !== "one-time" && data.object?.object === "subscription") {
    const sub_id = data.object.id;
    const sub_period_start = Math.floor(new Date(data.object.current_period_start_date).getTime() / 1000);
    const sub_period_end = Math.floor(new Date(data.object.current_period_end_date).getTime() / 1000);
    
    await updateOrderSubscription(
      order_no,
      sub_id,
      order.interval === "year" ? 12 : 1,
      sub_period_start,
      sub_period_end,
      sub_period_start,
      OrderStatus.Paid,
      new Date().toISOString(),
      1, // sub_times
      data.customer?.email || order.user_email,
      JSON.stringify(data)
    );
  }
  
  // 发放积分
  await addUserCredits(
    order.user_uuid,
    order.credits,
    order.order_no,
    CreditsTransType.OrderPay,
    order.expired_at
  );
  
  console.log(`[handleCreemOrder] 订单处理成功: ${order_no}`);
}
```

## 注意事项

⚠️ **重要警告**
- **Webhook URL 必须带尾部斜杠**：`https://yourdomain.com/api/creem-notify/`（因为 `trailingSlash: true`）
- **`subscription.paid` 包含首扣**：必须实现去重逻辑，避免重复发放积分
- **不存在 `subscription.renewed` 事件**：官方文档只有 `subscription.paid`
- **订阅续费更新同一订单**：不要每期创建新订单，除非业务明确要求

💡 **最佳实践**
- 先在 Creem 测试环境完整测试订阅流程
- 使用 Creem Dashboard 的 "Send test event" 测试 Webhook
- 保留详细的日志，方便排查问题
- 订阅取消后，将 `expired_at` 设置为当前周期末（不立即失效）

✅ **兼容性说明**
- 完全向后兼容，支持一次性购买 + 订阅并存
- 如果只配置一次性产品 ID，定价页只显示 One-time Tab
- 如果三种都配置，显示三个 Tab

## 验证清单

完成更新后，请逐项检查：

- [ ] Creem Dashboard 已创建 9 个产品（3 套餐 × 3 周期）
- [ ] wrangler.jsonc 已配置所有产品 ID
- [ ] 定价页面文案已更新（en.json + zh.json）
- [ ] `getAvailableGroups()` 函数已实现
- [ ] `getPricingPage()` 过滤逻辑已实现
- [ ] Checkout API 已支持订阅（`is_subscription` 动态计算）
- [ ] Creem Webhook 路由已创建（`/api/creem-notify/route.ts`）
- [ ] `findOrderBySubId()` 函数已实现
- [ ] `renewSubscriptionOrder()` 函数已实现
- [ ] `resetCreditsForRenewal()` 函数已实现
- [ ] `handleCreemSubscriptionRenewal()` 函数已实现（含去重逻辑）
- [ ] 定价页面 UI 已更新（支持动态 Tab）
- [ ] Creem Webhook 已配置（URL + 事件订阅）
- [ ] 本地测试：
  - [ ] 只配置 one-time 产品 ID 时，只显示 One-time Tab
  - [ ] 配置 monthly 产品 ID 后，显示 Monthly Tab
  - [ ] 月订阅 checkout 向 Creem 传 `is_subscription: true`
- [ ] 生产测试：
  - [ ] 首次订阅支付后 `order.sub_id` 有值
  - [ ] Webhook 能正常接收 `subscription.paid` 事件
  - [ ] 续费后 `expired_at` 延长，`sub_times` 增加
  - [ ] 续费后 credits 表有 `subscription_renew` 记录

## 回滚方案

如果更新出现问题，可以回滚：

1. **代码回滚**
   ```bash
   git revert <commit-hash>
   ```

2. **配置回滚**
   - 清空 wrangler.jsonc 中的订阅产品 ID
   - 定价页面会自动只显示配置了的 Tab

3. **数据库**
   - 订阅相关字段不影响现有功能
   - 如果有订阅订单，保留即可

## 常见问题

### Q1: 为什么 `subscription.paid` 会触发两次？
**A:** `subscription.paid` 在首扣和每次续费都会触发。必须实现去重逻辑（比较 `current_period_end_date` 与 `order.expired_at`）。

### Q2: 如何测试订阅续费？
**A:** 
- 方法 1：在 Creem Dashboard 使用 "Send test event"，手动修改 `current_period_end_date` 为未来日期
- 方法 2：创建真实订阅，等待第二期扣款（测试环境可以设置短周期）

### Q3: 订阅取消后用户还能使用吗？
**A:** 可以。订阅取消后，`expired_at` 设置为当前周期末，用户可以用到周期结束。

### Q4: 如何处理订阅降级/升级？
**A:** 当前实现不支持。如需支持，需要：
1. 取消旧订阅
2. 创建新订阅
3. 处理积分差额

### Q5: 积分如何按周期重置？
**A:** 每次续费时，插入新的积分记录（`trans_type: subscription_renew`），旧积分靠 `expired_at` 自然失效。`getUserValidCredits()` 只返回未过期的积分。

## 相关文档

- [Creem Webhooks 文档](https://docs.creem.io/code/webhooks)
- [Creem Subscriptions 文档](https://docs.creem.io/subscriptions)
- [原始开发文档](../../../SUBSCRIPTION_PAYMENT.md)

## 更新日志

- **2025-01-20**: 初始版本
- **2025-01-21**: 补充 Webhook 去重逻辑说明
- **2025-01-22**: 添加常见问题解答
