> 模板默认已升级：固定素材从 `src/config/public-media.ts` 配置并放入 `public/`；Hero 默认嵌入工具，结果显示在独立行。新的接入流程、音轨策略和验收步骤见 [模板升级说明](template-upgrade.md)。下文外部 URL 仅为可选覆盖示例。

# 参考视频模式：交接与换站说明

示例墙上选中的视频只用于预览。真正发给模型的参考片来自玩法配置里的 `referenceVideo` 或工作台方案的 operator 素材，不会跟着示例切换。新的统一工作台见 [video-workbench-config.md](./video-workbench-config.md)。

## 本次改了什么

- 在现有视频工具中加入「参考视频生成」入口，也提供独立页面 `/tools/reference-video/`（中文 `/zh/tools/reference-video/`）。原有文生视频、图生视频和图片工具保留。
- 新表单独立实现；任务、积分预扣、失败释放、历史记录、登录和充值继续用已有流程。没有修改 Stripe 支付流程或数据库结构，也没有调整首页其他模块。
- 输入为「站长配置的参考视频 + 用户按角色上传的照片」。目前接入 KIE Seedance 2 的多模态参考模式，不是将右侧示例视频自动拿去换脸。
- 提示词、真实参考素材、角色顺序、时长和积分由服务端决定，用户不能通过修改请求自行覆盖。进行中的任务保留提交时的配置快照。

主要文件：`src/config/reference-video.ts`（玩法及价格）、`src/ai/reference-video.ts`（校验和参数）、`src/components/ai/reference-video-tool.tsx`（独立表单）、`src/components/ai/video-studio.tsx`（模式切换）。新适配器复用已有 KIE 任务查询及结果存储。

## 当前可用状态

已启用参考模式入口，但默认玩法是**待配置草稿，无法生成或扣积分**。没有填入任何第三方热门视频，也没有发起真实付费生成、数据库迁移或部署。

本次只在 `.env.local` 与 `wrangler.jsonc` 的 `AI_ENABLED_TOOLS` 中追加了 `reference-video`；未更改已有密钥。所有样式使用现有主题变量。

## 配置一个玩法

1. 在 `src/config/reference-video.ts` 设置标题、描述、角色列表、角色指令、提示词、输出时长、比例、画质和音频策略。默认两人，可改为一个或多个角色，当前模型最多 9 张照片。
2. 把文件放进 `public/video/`（推荐），默认 preset 使用：

   - 参考片（发给模型）：`public/video/template/reference-duo.mp4` → 配置项 `/video/template/reference-duo.mp4`（也可用 `/video/reference-duo.mp4`）
   - 展示示例（仅页面播放）：`public/video/hero.mp4` → `/video/hero.mp4`

   部署后参考片会变成 `https://你的域名/video/template/reference-duo.mp4` 供 KIE 拉取。可选环境变量：

   ```dotenv
   REFERENCE_VIDEO_URL=/video/template/reference-duo.mp4
   REFERENCE_VIDEO_EXAMPLE_URL=/video/hero.mp4
   REFERENCE_VIDEO_MODEL=standard
   ```

   `REFERENCE_VIDEO_MODEL` 只影响参考视频工作台（`standard` → Seedance 2，`fast` → Seedance 2 Fast）。与文生视频的 `KIE_VIDEO_MODEL` 无关。

   `EXAMPLE` 只用于右侧展示，不会提交给模型。参考片须能被 KIE 通过 HTTPS 公网访问（本地 localhost 无法通过 `ready` 校验，需部署或使用 HTTPS 隧道测试）。

3. 复用现有 `KIE_API_KEY`、D1、图片上传和 R2 存储配置。用户图片必须来自本站配置的存储域名。上传仍沿用原有公开 URL 存储方式，本次没有增加私有文件授权或自动删除策略；商业上线前需要核对隐私与保留期限。
4. 核对积分价。默认 `480p / 720p / 1080p` 为每秒 `6 / 7 / 14` 积分，最低 35 积分，属于**示例零售价，不是供应商报价**。公式与文生/图生视频一致：`max(最低积分, 向上取整(输出秒数 × 画质单价))`。例如 preset 里 `duration: 15`、720p，费用为 105 积分；若低于 35 则仍扣 35。结合供应商实际价格和自己的套餐再定价。
5. 配置完成后重新构建部署；在测试环境用已授权素材验证生成效果，再发布。

以后换同类梗，复制或修改一个 preset，替换素材、文案、角色和提示词即可。修改输入、素材或指令时同步增加 `version`，防止用户从旧页面误提交。**超出当前模型的能力（精确口型、原曲拼接、特殊动作控制等）不能只换提示词完成，需要另外接入处理流程。**

## 只展示参考视频模式

- 整站只启用参考视频：`AI_ENABLED_TOOLS=reference-video`。
- 同时保留图片工具：`AI_ENABLED_TOOLS=image-generator,reference-video`。
- 三种视频模式共存：`AI_ENABLED_TOOLS=video-generator,reference-video`；如还需要图片工具，再加 `image-generator`。
- 只限制普通视频模式：`AI_VIDEO_MODES=text,image`（默认）；设为 `image` 可禁用文生视频。服务器也会拒绝被禁用模式的请求。
- 只改变某个落地页的展示：在该页面视频工具的 `config` 内设置 `inputModes: "reference"`、`defaultInputMode: "reference"`，可加 `presetId: "duo-performance"` 绑定玩法。此项只控制该页 UI，**不禁用其他页面或接口**。

现有首页的 `video-generator` 工具槽也能只显示参考模式，无需重做首页。使用独立工具槽时可选择 `reference-video`。换站时仍应同步导航、标题、SEO 文案、示例和计费套餐，避免留下指向已禁用工具的链接。停用模式不删除旧任务，历史记录仍可查看。

## 音乐、口型与审核边界

- `audio: "off"` 不请求模型生成音频；`"generated"` 请求模型生成音频。都不是复制参考片原曲，也不保证精准对口型。当前没有原曲拼接、配音或单独口型同步模块。
- 上传需要用户确认照片使用权，但勾选不等于已证明授权；技术上使用参考视频也不自动保证合规。
- 复用已有内容审核，并扩展为检查每张角色图片。本次没有更改原有默认审核策略。正式运营前应配置 `CONTENT_MODERATION_MODE=enforce`、`CONTENT_MODERATION_ON_ERROR=block` 及有效的 `SEEAPI_API_KEY`，并验证故障时会阻断生成。
- 现有输入审核不能验证人物授权、参考视频版权或所有成片风险。站长需审核参考素材和成片，并准备举报及下架流程。本次未新增视频逐帧审核。

## 最小验收清单

1. 未配置素材：参考模式展示「待配置」，不能上传或提交；原有文生、图生可以正常切换。
2. 使用测试账号和已授权素材：填写照片、勾选授权；确认服务端报价与按钮一致。真实生成会产生供应商费用。
3. 生成成功后：页面能播放，历史记录能查看、下载，积分只扣一次。
4. 用模拟接口测试重复请求、供应商拒绝和其他账号读取：不重复扣款、明确失败只释放一次、跨账号访问被拒绝。不要在生产站故意制造付费失败。
5. 配成 reference-only 后：首页仅参考表单，其他工具接口被禁用；已有任务历史仍保留。重启本地服务或重新构建部署后再验收。

自动测试（全程使用本地 SQLite/模拟接口，不调用供应商或远程数据库）：

```sh
node --import tsx --test tests/ai-foundation.test.ts tests/ai-services.test.ts tests/moderation.test.ts tests/landing.test.ts tests/reference-video.test.ts
pnpm exec tsc --noEmit --incremental false
```

供应商参数参考：[KIE Seedance 2 官方文档](https://docs.kie.ai/market/bytedance/seedance-2)。供应商能力、价格与政策可能变化，上线时应重新核对。
