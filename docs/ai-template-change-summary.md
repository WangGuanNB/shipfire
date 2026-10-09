# ShipFire 模版改造交接说明

## 改造目标

将 ShipFire 从单一图片生成模版，调整为可复用的 AI 工具站模版。

图片、视频、音频、文本或 PDF 工具都可以共用账户、积分、任务、支付和存储基础；具体工具通过独立适配器和页面接入。

## 已完成的改动

### 1. 通用 AI 任务系统

新增：

- `src/ai/types.ts`
- `src/ai/tasks.ts`
- `src/ai/catalog.ts`
- `src/app/api/ai/tasks/`
- `src/app/api/ai/tools/`

支持：

- 任务创建、状态查询和历史记录
- `Idempotency-Key` 防止重复提交
- `queued / running / succeeded / failed / needs_review` 状态
- 用户只能查看自己的任务
- 长任务通过轮询推进，不在请求中无限等待

### 2. 工具和模型配置

核心配置文件：

`src/config/ai.ts`

配置内容包括：

- 启用哪些工具
- 模型列表
- 模型参数能力
- 积分计算方式
- 套餐权益要求

环境变量：

```env
AI_ENABLED_TOOLS=image-generator,video-generator
```

只做图片站时可以设置为：

```env
AI_ENABLED_TOOLS=image-generator
```

### 3. 供应商适配器

新增：

- `src/ai/adapters/image.ts`
- `src/ai/adapters/kie-video.ts`
- `src/ai/adapters/index.ts`

视频当前使用 KIE Seedance 适配器：

```env
KIE_API_KEY=...
KIE_VIDEO_MODEL=bytedance/seedance-1.5-pro
```

更换供应商时新增适配器，不要修改积分、支付和任务核心逻辑。

### 4. 图片与视频工具页面

新增：

- `/[locale]/tools/`
- `/[locale]/tools/[toolId]/`
- `src/components/ai/video-tool.tsx`
- `src/components/ai/task-history.tsx`
- `src/hooks/use-ai-tasks.ts`

视频工具支持：

- 文生视频
- 图生视频
- 模型、分辨率、时长、比例选择
- 积分预估
- 视频播放和下载
- 生成历史

原有 `/api/generate-image` 接口保留，但内部已接入统一任务系统，避免旧图片页面失效。

### 5. 积分系统

积分现在支持：

- 任务提交时预占
- 成功后结算
- 明确失败后按原有效期退款
- 未来生效的积分不会提前计入余额
- 按最早过期批次扣除

相关文件：

- `src/services/credit.ts`
- `src/models/credit.ts`
- `src/lib/credits-sql.ts`
- `src/db/migrations/0003_ai_foundation.sql`

### 6. 套餐和计费策略

新增：

- `src/config/billing.ts`
- `src/services/billing.ts`
- `src/lib/billing-policy.ts`

套餐不再依赖固定的 `starter / standard / premium` 名称，可以使用任意套餐 ID。

支持配置：

- 积分数量
- 付款周期
- 积分发放周期
- 模型或工具权益

年付套餐可以按月生成积分批次。

### 7. Stripe 逻辑

新增或调整：

- `src/services/stripe.ts`
- `src/services/stripe-billing.ts`
- `src/app/api/stripe-notify/route.ts`
- `src/app/api/billing/portal/route.ts`

支持：

- Checkout 幂等键
- `invoice.paid` 续费发放积分
- 订阅状态同步
- 支付失败同步
- Customer Portal
- 重复 webhook 不重复发积分

### 8. 数据库

新增迁移：

`src/db/migrations/0003_ai_foundation.sql`

新增 AI 任务表，并扩展订单和积分字段。新环境部署前必须执行该迁移；本次没有操作远程数据库。

### 9. 文件上传安全

`src/app/api/upload-image/route.ts` 增加：

- PNG/JPEG/WebP 限制
- 文件签名检查
- 10MB 大小限制
- 生成随机文件名

## 不应改变的内容

- 不要删除首页已有模块
- 不要隐藏 testimonial、FAQ 或 CTA
- 不要把视频逻辑写进支付组件
- 不要把供应商密钥写进前端
- 不要把模型价格硬编码到页面组件
- 不要直接对生产 D1 执行迁移

## 验证命令

```bash
pnpm exec tsc --noEmit --incremental false
pnpm exec tsx --test tests/ai-services.test.ts tests/ai-foundation.test.ts tests/landing.test.ts
pnpm build
```

测试覆盖任务幂等、并发扣费、余额不足、积分过期、失败退款、未来积分、Stripe 重试和原有落地页配置。

## 后续接入新工具

1. 在 `src/config/ai.ts` 注册工具和模型。
2. 实现 `ToolAdapter`：`validate`、`quote`、`submit`，长任务再实现 `poll`。
3. 在 `src/ai/adapters/index.ts` 注册适配器。
4. 新增工具自己的 UI，并复用 `useAITasks` 和 `TaskHistory`。
5. 不修改订单、积分和支付核心逻辑。
