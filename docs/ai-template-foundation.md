# AI 工具模版：配置、接入与上线

本次改造保留图片工具与首页模块，增加 `/tools` 和 `/tools/video-generator`。图片与视频共用任务、积分、支付；不同工具保留独立界面。

## 配置入口

- `src/config/ai.ts`：工具目录、模型、适配器、参数、报价规则、权益要求和并发上限。
- `AI_ENABLED_TOOLS`：启用的工具 ID，默认 `image-generator,video-generator`。图片站设为 `image-generator`；视频站设为 `video-generator`。API 也检查开关，不只是隐藏导航。
- `src/components/ai/tool-views.ts`：独立工具界面注册表。
- `src/components/landing/tools.tsx`：落地页工具插槽。页面 JSON 的 `tools.primary.type` 可以是 `image-generator` 或 `video-generator`；模块顺序与内容不变。
- `src/i18n/pages/pricing/en.json`：现有套餐金额、积分和周期的统一数据源；其他语言保留展示文案，经济字段由同一份数据覆盖。
- `src/config/billing.ts`：任意套餐 ID 对应的权益与积分发放策略。默认 `billing` 保持现有每次付款发放量。设置 `month` 后，年付分成 12 个按月生效的积分批次。

例如图片站不需要视频凭据，视频站设置 `KIE_API_KEY`，可用 `KIE_VIDEO_MODEL` 替换已兼容 Seedance 1.5 参数协议的模型；不同协议应添加适配器，不要仅替换模型名称。

所有工具默认按积分付费，不额外限制套餐。若某个模型专属付费套餐，在模型 `requiredEntitlements` 写入任意权益键（例如 `premium-models`），并在套餐策略配置同名键。服务端执行检查。不要在价格文案承诺尚未实现的优先队列、去水印等权益。

## 接入新工具

1. 在 `src/config/ai.ts` 注册工具与模型。`capabilities`、`pricing` 为可扩展对象；文本、音频、文件工具无须填入视频字段。
2. 实现 `ToolAdapter` 的 `validate`、`quote`、`checkConfiguration`、`submit`。长任务再实现 `poll`，在 `src/ai/adapters/index.ts` 注册。服务端报价必须是非负整数；任务创建时冻结报价和模型配置。
3. `submit` 可以直接返回文本/图片/文件等 artifacts，也可以返回供应商任务 ID。`poll` 每次只查询一次，不在请求里循环等待视频。
4. 实现工具界面并加入界面/落地页注册表。复用 `useAITasks`、`TaskHistory`、登录、套餐组件。无需修改订单或积分服务。

`validateInput` / `quoteCredits` 只是图片视频的复用实现，不是其他工具必须使用的输入格式或计费公式。

## 数据库迁移（部署前必须完成）

新增迁移 `src/db/migrations/0003_ai_foundation.sql`：通用任务表、订单策略快照、Stripe 客户 ID、积分生效时间及原子预占/退款触发器。

本次只生成并在内存 SQLite 中验证迁移，**没有操作现有远端数据库**。先备份目标 D1，按项目现有流程应用迁移，再部署代码。手动初始化数据库时也必须包含本迁移中的触发器；仅 `db:push` 同步表结构不足以安装触发器。

本地 D1 示例（用目标环境的实际绑定/数据库名，不要照抄远端名字）：

```sh
pnpm exec wrangler d1 execute <database-name> --local --file=src/db/migrations/0003_ai_foundation.sql
```

旧流水 `available_at=NULL` 继续立即可用；未来月份的流水在生效前不会计入余额。预占按最先过期的积分批次拆分；失败退款沿用原有效期，不能让过期额度复活。

## 任务恢复与运维

- `POST /api/ai/tasks`：登录后提交，必传 `Idempotency-Key`。同一用户、同一键只创建一个任务；不同输入复用同一键会拒绝。
- `GET /api/ai/tasks`：当前用户历史，最多 30 条。`GET /api/ai/tasks/:id` 检查任务归属并推进一次状态。
- 视频用户刷新、离开后再次访问，能从数据库恢复。页面打开时轮询状态；需要无人访问时也持续回收结果，可安排外部调度器每分钟调用 `POST /api/ai/maintenance`，Authorization 为 `Bearer <AI_MAINTENANCE_SECRET>`。本次没有创建线上调度器。
- 图片继续使用现有同步供应商适配，提交请求仍可能较长，但任务和预占可恢复查看。要实现完全脱离请求的图片执行，可接入具有提交/查询接口的适配器，或增设队列消费者。
- 网络断开不能证明付费生成失败。无法确认供应商是否接受的任务进入 `needs_review`，不会自动再次提交收费任务或提前退回占用积分。
- 管理员可通过 `GET /api/admin/ai-tasks` 检查异常任务。确认未生成后 POST `{id, action:"fail"}` 释放额度；找回供应商任务 ID 后 POST `{id, action:"reconcile", providerTaskId}` 恢复查询。仅 `ADMIN_EMAILS` 中的用户可操作，且仅处理待核查任务。
- 参考图上传限制为 PNG/JPEG/WebP、10MB，服务端检查文件签名。视频输入 URL 限定本项目存储域名。
- 当前视频输出搬运上限 64MB，超限保留任务等待处理，不重新发起生成。更大输出需实现流式存储适配。

## Stripe

公共客户端使用 Fetch HTTP 与安装 SDK 对应的 `2025-02-24.acacia` API 版本。Webhook 应按相同版本配置，保留原始请求体验签。

监听事件：`checkout.session.completed`、`invoice.paid`、`invoice.payment_failed`、`customer.subscription.updated`、`customer.subscription.deleted`。

首次订阅和续费均按账单 ID 发放积分，首付重定向与 webhook 并发不会重复发放。每月生效批次有唯一流水 ID；中途中断可以重试。支付状态在发放完毕后更新。策略快照保存于订单，修改套餐不会追溯改变已购订单。

配置 Stripe Customer Portal 后，“我的订单”提供管理订阅和付款方式入口。当前支持取消与支付方式管理；动态 Checkout 价格没有通用套餐升级映射，**不要在 Portal 开启套餐更换**，除非另行实现价格 ID 映射、差额积分和权益更新。

Creem / PayPal 原有逻辑保留；新配置的按月分发和模型权益套餐目前要求 Stripe，其他支付渠道会明确拒绝，不会假装已经支持这些权益。现有每次付款发积分的套餐仍兼容原渠道。

## 验证

```sh
pnpm exec fumadocs-mdx
pnpm exec tsc --noEmit --incremental false
pnpm exec tsx --test tests/ai-foundation.test.ts tests/landing.test.ts
pnpm build
```

回归覆盖预占、重复提交、超额扣款、按原有效期退款、未来积分、生效月末边界、模型校验和原落地页配置。真实供应商生成、R2 写入和 Stripe 测试支付应在目标测试环境完成；本地回归不调用付费接口。
