# ShipFire：克隆新工具站

这次回收的是通用能力。模板没有复制 Tiny Desk 的品牌、五个乐队角色、固定 15 秒和每条 30 积分的业务规则；默认示例恰好为 15 秒，报价来自示例预设，可独立修改。

## 1. 固定素材默认放 public

统一清单：`src/config/public-media.ts`。

- 当前真实模板：`public/video/template/reference-duo.mp4`，已检查为 15 秒、有音轨。
- 浏览器和模型配置使用 `/video/template/reference-duo.mp4`，不填写电脑的绝对路径。
- Hero 素材的 `kind` 可选 `video` 或 `image`，更换示范图片时无需改页面组件。
- Hero 可填写 `preview.assetId: "hero"`，示例卡片可填写 `video.assetId: "template-original"`，避免在多份文案中重复维护文件地址。已有直接 `src`/`video` 地址仍可使用。
- 新增模板：放入真实视频和封面，在清单中加入条目。只有 `enabled: true` 的条目会进入默认模板和示例目录；不使用虚构的 Remix、慢动作占位素材。
- `REFERENCE_VIDEO_URL` 仍可显式覆盖第一条生成参考，默认值已改为站内路径。更换素材时，清单时长也要对应修改。
- `public` 素材会随站点一起部署。模型读取的是生产域名上的 HTTPS 地址，不能读取开发者电脑或 localhost。
- 用户上传和生成结果仍使用原有存储配置；不需要为固定模板视频先配置 R2。

检查命令：`pnpm run check:template`。只读取本地文件，检查素材是否存在、时长/音轨、模型能力及站内报价，不发起模型或支付请求。构建时也会运行该检查。

## 2. 支付默认使用 Stripe

- `wrangler.jsonc` 默认 Stripe 开启，Creem / PayPal 关闭。已有本地 `.env.local` 和 `.env.production` 的支付开关也已对齐，这两份私密文件仍不提交到仓库。
- `pnpm dev`、`pnpm dev:proxy` 和构建均通过同一个 Wrangler 环境读取入口加载公开配置；空占位不会覆盖 `.env.local` 中的实际值。
- 设置 `STRIPE_PRIVATE_KEY`、`STRIPE_PUBLIC_KEY`、`STRIPE_WEBHOOK_SECRET` 后才可发起 Stripe 结账。缺少配置会在创建订单和支付会话前返回提示。
- 不会自动切换到已关闭的支付方式。其他支付服务代码仍保留，之后可以显式启用。
- 克隆时更新站点域名、邮件、支付账户及产品价格。模板的演示文案和 launch.yaml 种子关键词也应替换为真实产品。

## 3. Hero 只挂载一次工具

首页中英文示例使用：

```json
{
  "modules": [{"id":"hero","type":"hero","source":"hero","tool":"primary"}],
  "hero": {
    "variant":"tool",
    "media_side":"left",
    "media_frame":{"desktopHeight":480,"mobileHeight":280,"fit":"contain"},
    "preview":{"assetId":"hero"}
  },
  "tools":{"primary":{"type":"video-generator","config":{"workbench":"meme-duo-video"}}}
}
```

这是相关字段示例，不应覆盖页面的其他模块。不要再增加绑定 `primary` 的独立 tool 模块，渲染器会拒绝重复挂载。

- 桌面：左侧固定高度示例，右侧自然高度表单；`media_side: "right"` 可交换位置。
- 手机：表单先显示，示例在后。
- 媒体不再跟随文案高度变化，也不拉伸图片或视频。
- 下方示例区支持 `media_frame`，默认桌面 260px、手机 220px；默认完整显示，`fit: "cover"` 可以裁切填满。
- 生成结果通过 `ToolResult` 显示在 Hero 两列下方，保留旁边的固定示例。自定义工具可以复用 `src/components/ai/tool-result-layout.tsx`；脱离 Hero 时仍支持普通行内结果。
- 视频工具内页使用 studio 工作台，图片工具内页使用图片示例；两者均已接入同一 Hero 布局。图片工具在 Hero 中只显示表单，生成中和结果显示在独立结果行。
- 工厂 YAML 的页面约定已同步为 Hero 内嵌工具，避免新站重新生成独立的第二份表单。

## 4. 新增工具主要改配置

`src/config/sites/shared/video-template.ts` 的 `createVideoTemplateVariant()` 现在可以独立配置：

- `modelId`：当前已注册的模型；标准版与 Fast 参考视频模型均可选择。
- `inputSlots`：角色数量、标签、描述、必填和可选。默认双人只是演示配置。
- `prompt`、`instruction`、`promptMode`：玩法文字及是否允许修改；不会被双人专用提示词覆盖。
- `output`：时长、画质、比例及允许选择的范围。
- `output.audio`：`template` 保留参考音轨、`generated` 使用模型声音、`off` 静音。
- `retailPricing`：站内积分，与供应商计费单位分开。

新增已有能力覆盖的玩法：放素材 → 新增预设和页面配置 → 注册 → 将落地页 `workbench` 指向新页面。新供应商或新的输入类型仍需要适配器，不能仅靠提示词模拟能力。

提交前会检查参考视频时长；选择模板原音时还会检查音轨。素材有问题会在预留积分前阻止生成。明确失败仍使用原有退款逻辑，结果不确定的任务不会自动重新付费生成。

默认不展示面向开发者的请求 JSON 预览按钮；需要排查接口时可在工作台页面配置中设置 `showRequestPreview: true`。

未登录时点击照片上传区会先提示登录，避免用户先选完文件再被要求登录、导致重选。

表单现在提示下一步：上传必填角色照片 → 输入必要提示词 → 确认许可 → 生成。小范围画质和时长使用可见按钮；锁定提示词不显示无效的编辑入口。

## 本地验收

`pnpm test`、`pnpm exec tsc --noEmit --incremental false`、`pnpm run check:template`。

测试包含单人和三人自定义工具，验证不同角色数、自定义提示词、输出和报价不需要修改共用组件。供应商和支付验证均为本地模拟，不生成付费任务。

如果本地 SQLite 测试依赖提示 Node ABI 不匹配，先在当前项目使用对应 Node 版本执行 `pnpm rebuild better-sqlite3`。这属于本地依赖环境修复，不影响部署的 D1 数据。

本次未提交、推送或部署，也未修改模板中已有的 `tmp/` 和 Wrangler 流量统计设置。

最终验证（2026-10-26）：50 项测试、TypeScript、素材/音轨/模型与报价预检、本地生产构建均通过。桌面和手机的中英文首页、图片工具与视频工具内页已检查；未调用付费模型或支付接口。
