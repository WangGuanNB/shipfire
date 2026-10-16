# 统一视频工作台：开发实施与 AI 交接

日期：2026-10-15。状态：实施方案，尚未改业务代码。

项目：`/Users/wangguan/Desktop/Banner/Code/shipfire`

先阅读 [产品需求](/Users/wangguan/Desktop/Banner/Code/shipfire/docs/video-workbench-requirements.md)，再实施本文件。以下结构名为建议，允许按代码风格调整，但必须保持玩法、方案、模型和后端生成策略的分离。

## 1. 开工约束与已核对现状

先读适用的 AGENTS.md、检查工作区及当前代码。本次核对时已有大量修改和未跟踪文件，不得 reset、覆盖其他 AI 的工作或按旧文档恢复代码。

已核对的现状：

- [VideoStudio](/Users/wangguan/Desktop/Banner/Code/shipfire/src/components/ai/video-studio.tsx) 已是统一外壳，通过三标签切换 VideoTool 和 ReferenceVideoTool，不需要从零新建视频平台。
- [普通表单](/Users/wangguan/Desktop/Banner/Code/shipfire/src/components/ai/video-tool.tsx) 使用单个 imageUrl；[现有映射](/Users/wangguan/Desktop/Banner/Code/shipfire/src/ai/adapters/kie-mappers.ts) 中 Seedance 2 的图片模式发送 first_frame_url。
- [参考表单](/Users/wangguan/Desktop/Banner/Code/shipfire/src/components/ai/reference-video-tool.tsx) 支持多角色，但当前提交写死 consent: true，需要真实用户确认。
- [参考配置](/Users/wangguan/Desktop/Banner/Code/shipfire/src/config/reference-video.ts) 目前每个 preset 只有一个模型及一套价格，并强制要求参考视频。
- [参考业务逻辑](/Users/wangguan/Desktop/Banner/Code/shipfire/src/ai/reference-video.ts) 固定拼入参考视频指令、每次发送视频字段，并将选中 examples[].src 当成实际参考片。类型注释与实际行为不一致。
- [工具目录](/Users/wangguan/Desktop/Banner/Code/shipfire/src/config/ai.ts) 区分 video-generator 和 reference-video，并有服务端启用开关。
- [任务引擎](/Users/wangguan/Desktop/Banner/Code/shipfire/src/ai/tasks.ts) 已有输入／模型快照、幂等、积分预占和结果状态处理，应继续复用。
- [前端任务钩子](/Users/wangguan/Desktop/Banner/Code/shipfire/src/hooks/use-ai-tasks.ts) 按 toolId 拉取与提交，统一表单跨方案切换时须处理该边界，不能把参考视频任务丢出结果区。
- [旧说明](/Users/wangguan/Desktop/Banner/Code/shipfire/docs/reference-video.md) 有与当前实现不一致的描述，不能当作代码现状；开发结束后应同步更新。

## 2. 最小架构与兼容策略

扩展现有 VideoStudio 作为统一入口，使用可复用的素材槽位、提示词区、参数区、报价按钮和预览区。方案切换驱动这些组件，不维护三套互相复制的完整表单，也不把所有判断堆在一个巨型组件中。

后端保留明确策略：text、first-frame、image-reference、video-reference。以上是内部建议名称，不要求修改旧任务中既有的 mode 值。旧接口由兼容层处理。

优先保持现有任务归属：

- text、first-frame、新增 image-reference → video-generator。
- video-reference → reference-video。

统一 UI 不要求统一数据库 tool_id。使用显式服务端映射及适配器验证：图片方案在 reference-video 关闭时仍可使用；视频方案不能借其他工具入口绕过禁用。现有 AI_VIDEO_MODES 的 text/image 限制也要在服务端有明确语义，新增多图参考可归入 image 能力检查，不能仅前端限制。

保留旧模型 ID、适配器注册键和已有路由。旧请求继续走旧兼容入口；新方案使用专用模型配置／适配器，避免被普通单图校验器删掉字段。新增的模型目录项应区分适用表单或策略，不能误出现在不支持它的旧模型选择器中。

先通过配置让现有工具页支持新版工作台，不为合并 UI 迁移任务表、修改 Stripe 或重建队列。首页其他区块和环境密钥不变；新版落地页接入使用显式配置。

## 3. 配置契约

先实现集中式 TypeScript 配置和纯函数校验，不开发可视化后台。建议组织为以下概念：

### 3.1 WorkbenchPageConfig（页面）

绑定哪些 preset、默认 preset/variant、允许展示的方案、是否显示选择器／高级参数／预设素材预览、文案和示例布局。开发页可展示全部已配置能力，热词页可只绑定一个玩法的一到两个方案。页面隐藏不是服务端授权。

### 3.2 VideoPreset（玩法）

包含 id、version、enabled、中英文名称与描述、defaultVariantId、variants。一个 variant 属于且只能按其所属 preset 解析。

### 3.3 VideoVariant（生成方案）

- id、enabled、中英文名称／限制说明、strategy、modelId。
- inputSlots：稳定 slotId、用途、标签、必填状态、类型和数量上限。本期用户素材沿用图片上传，普通图生使用 first-frame 用途，人物照片使用 identity 用途。
- operatorAssets：站长配置的参考图片／视频，包含稳定 ID、URL、用途及说明；视频带核实过的 durationSeconds。允许无参考素材。
- promptPolicy：editable（自由输入）、append（后台固定指令＋用户补充）、locked（固定指令）。后台系统指令不接受客户端覆盖；固定内容可展示与否单独配置。
- output：默认参数与允许值，包括 duration、resolution、aspectRatio、audio。每个方案与模型能力求交集，不能配置后静默回退到别的模型或规格。
- retailPricing、pricingVersion：该方案的站内积分规则；具体公式集中实现。
- costEstimate：可选的供应商成本参数，独立于积分价，不是实际账单。
- examples：该方案的展示素材；不得当作 operatorAssets 使用。

generation、素材、角色或提示词变化递增 preset version；价格变化还须更新报价版本，或使用包含完整影响项的配置摘要。新增多套并行版本机制前先选一种简单一致的方案。

### 3.4 模型能力

复用并扩展现有 ToolModel，明确支持哪些 strategy、最大总图片数、是否支持视频／音频，以及参数范围。不要把“支持图生视频”当成“支持多人物参考”。站长参考图与用户照片合并计算限制。

可增加 Seedance 2 Mini 作为候选适配，但它不是全站唯一模型，也不是已实测合格的默认替代。模型 ID、接口能力和价格在开发时查供应商文档并验证。参考：[KIE Seedance 2 Mini 文档](https://docs.kie.ai/market/bytedance/seedance-2-mini)。不要把本地配置字段直接当供应商 API 参数发送。

## 4. 输入编译与安全边界

新增小型公共玩法服务，负责解析、校验、生成标准输入及报价；从现有参考视频逻辑提取共用部分。不要侵入通用任务状态机来处理热梗细节。

客户端新方案只提交 presetId、presetVersion、variantId、报价版本、按 slotId 组织的用户上传、允许的用户文本／参数及授权确认。若沿用原接口还提交 toolId/modelId，服务端必须校验它们与方案解析结果完全匹配。

服务端执行顺序：

1. 解析已启用的玩法和方案，校验所属关系、版本、工具开关、模型能力和账户权限。
2. 校验槽位、数量、类型、来源及已有机制可验证的上传归属；禁止接收客户端替换站长素材 URL、固定提示词、strategy 或价格。
3. 加入 operatorAssets，生成稳定的图片顺序及用途索引。比如用户角色 A/B 与场景图分别占几个索引，要与最终提示词中的引用完全一致。
4. 按 promptPolicy 合成文本。图片参考方案不能残留“跟随参考视频”指令；切换方案不能携带上一方案的隐式素材。
5. 检查总图片数、视频时长、输出规格，完成审核，再进入既有积分预占和提交流程。
6. 使用现有 JSON input/model_snapshot 保存实际策略、preset/variant 及版本、素材顺序、提示词、参数与定价依据。后续轮询不得从最新配置重新构造这些输入。

供应商映射分别处理：

- text：不发送图／视频引用字段。
- first-frame：保持原有单图语义，不混入人物参考数组。
- image-reference：发送人物和场景图片的参考数组；完全省略 reference_video_urls，不发送空视频数组、空地址或 first_frame_url。
- video-reference：发送已配置的真实视频与适用的图片参考，参考片不是示例播放器选中的视频。

对于不支持混用首帧与多模态参考的接口，必须在提交前拒绝无效组合。场景图的用途靠受控提示词说明，不能虚构供应商并不支持的图片权重／角色参数。

公共配置只返回 UI 需要的白名单字段、合法选择及报价信息，不泄漏内部提示词、成本参数或密钥。运营素材预览只在配置明确允许时返回对应地址；用户可编辑的文字不应和后台固定指令共用可覆盖字段。

## 5. 报价与任务链路

建立同一个服务端 quoteVariant() 供页面报价及创建任务使用。固定且有限的参数组合可预计算公开报价；动态组合可新增只读报价接口。二选一按最小实现确定，不要求两套都做。

报价至少绑定 preset/variant、配置／价格版本、输出规格及最终积分。提交时重新验证绑定关系与金额；陈旧报价返回明确的刷新／重新确认错误，不能默默扣新价。客户端任何期望金额只能用于比较，不能作为扣费依据。

供应商估算与零售分开：按模型规则配置是否计入参考视频时长及单价，避免只按输出秒数估算所有方案；不通过本次改造擅自调整旧方案售价。

继续使用 [现有任务接口](/Users/wangguan/Desktop/Banner/Code/shipfire/src/app/api/ai/tasks/route.ts)。保留事务／触发器和已实现的幂等语义。已有任务重试或查询应能返回原任务，不因配置变化产生第二次付费提交；身份与 request key 的冲突检查不能放松。

沿用 [KIE 适配器](/Users/wangguan/Desktop/Banner/Code/shipfire/src/ai/adapters/kie-video.ts) 与 [适配器注册](/Users/wangguan/Desktop/Banner/Code/shipfire/src/ai/adapters/index.ts)。明确拒绝／失败走失败释放；网络超时且供应商可能已受理时保留待核查，不自动重新生成。结果拉取可恢复，不等于再次调用生成接口。

统一工作台需要跟踪所选方案实际的 toolId 和 activeTaskId。旧结果的展示参数使用任务快照或安全摘要，不使用当前新方案的比例／时长。历史中可增加可选的玩法与方案安全摘要，旧记录没有这些字段也可正常显示；不返回完整内部输入。

若实现跨工具聚合查询，继续限定当前用户，不增加一条全局任务池。现有 [维护入口](/Users/wangguan/Desktop/Banner/Code/shipfire/src/app/api/ai/maintenance/route.ts) 已存在，但外部调度是否运行尚未核实；不能仅因有接口就承诺关闭页面后一定完成结果归档。

## 6. 前端接入与兼容迁移

改造重点：

- [服务端入口](/Users/wangguan/Desktop/Banner/Code/shipfire/src/components/ai/video-studio-entry.tsx)：输出安全的工作台配置。
- [落地页工具槽](/Users/wangguan/Desktop/Banner/Code/shipfire/src/components/landing/tools/video-generator.tsx) 与 [工具注册](/Users/wangguan/Desktop/Banner/Code/shipfire/src/components/landing/tools.tsx)：同一工作台用于通用页和热词页。
- [示例交互](/Users/wangguan/Desktop/Banner/Code/shipfire/src/components/landing/interactions.tsx)：不能继续固定发送 inputMode: reference；显式传 presetId、variantId、exampleId。
- [示例区](/Users/wangguan/Desktop/Banner/Code/shipfire/src/components/landing/sections.tsx)：展示素材只读，不决定生成素材。
- [历史列表](/Users/wangguan/Desktop/Banner/Code/shipfire/src/components/ai/history-list.tsx)：两类旧 toolId 都归为视频，保留旧记录显示。

新统一表单可逐步复用原组件；旧导出和旧工具路由保留兼容包装。旧预设可映射成包含一个 video-reference 方案的玩法。若旧样例实际上代表不同参考动作，应明确配置各自玩法／方案映射，不能把全部样例静默改成同一个生成输入。

不要直接复用旧样例选择作为视频输入的隐式行为。迁移新提交契约时递增版本，对旧页面给出刷新提示；已入库任务继续使用原快照。

图片／参数/报价异步加载须处理竞态：以当前 preset/variant 和请求版本比对响应，忽略已切走方案的上传、报价或结果回写。保留同 slotId 且用途一致的照片可以，但不自动把上一角色的照片换成另一角色。

## 7. 审核、音频与性能

复用 [内容审核入口](/Users/wangguan/Desktop/Banner/Code/shipfire/src/services/moderation/moderate-input.ts)，让最终文本和所有应审核图片进入检查。注意现有 enforce 缺少审核密钥的阻断逻辑按 reference-video 特判；新增图片方案不能因归属 video-generator 就绕过应执行的审核。不要通过关闭审核实现“提速”。

用户授权使用真实交互状态，不固定传 true。站长素材预览、公开上传地址及保留期限应如实说明，不能声称当前存储已经是私有或已具备输出视频完整审核。

音频本期仅 off/generated，按模型能力开放；不将预设 BGM 配置成没有执行器的假功能。Cloudflare 部署下媒体后处理的运行环境另行评估，不在普通请求内强加 FFmpeg 长任务。

记录轻量结构化事件：taskId、方案、提交起止、首次观测到供应商完成、下载／存储耗时。没有供应商数据时不拆出虚假的排队／推理时长。不记录照片内容、密钥或签名 URL；不靠高频轮询声称模型变快。

## 8. 实施顺序

1. 记录工作区和测试基线，确认当前入口及账户／数据库边界；不更改无关文件。
2. 定义集中配置、类型、纯函数解析、能力验证和报价，并补单元测试。
3. 新增图片参考适配，接入站长参考图；保留视频参考与旧策略，补请求映射测试。
4. 构建统一表单、方案选择、预览和报价联动；接入通用测试页及单玩法双方案配置。
5. 验证历史、幂等、失败、开关、主题和移动端；更新旧说明与新配置指南。
6. 汇报完成项和未验证项，再取得真实生成预算，用同一批照片比较费用、耗时和可用率。

没有素材或模型能力未确认的方案应为草稿／不可提交，不伪造演示结果。代码通过不等于生成效果通过。未经单独授权，不部署、不调用生产支付、不迁移远程数据库、不发起真实付费生成。

## 9. 验收测试清单

- [ ] 同一玩法的图片／视频方案使用各自模型、提示词、素材、输出规格及积分。
- [ ] text、first-frame、image-reference、video-reference 请求映射互不混淆。
- [ ] 用户照片＋零／一／多张站长参考图均按能力校验，总数超限在提交前拒绝。
- [ ] 角色乱序仍正确映射；重复／缺失槽位、伪造素材、未授权、非法策略和版本拒绝。
- [ ] 示例切换不改变输入；不同玩法／方案更新表单、示例与价格，旧异步响应不能覆盖新选择。
- [ ] 禁用 reference-video 不影响允许的图片方案；伪造 toolId/modelId 不能绕过开关或方案价。
- [ ] 报价与扣费共用规则，旧价确认不被新价静默替换，不同模型／方案同一请求键产生冲突而非混用。
- [ ] 双击、网络重试和重复状态更新不重复生成、扣费或释放积分；并发不超支，余额不足不调用模型。
- [ ] 供应商明确失败与提交状态未知分开处理；下载重试不会重新生成，旧快照不被新配置覆盖。
- [ ] 历史、授权边界和跨账号隔离正常；两类 toolId 在统一结果／历史中可见。
- [ ] 旧自由输入、普通图生、参考视频、图片工具、登录及 Stripe 相关回归通过。
- [ ] 中文／英文、移动端、键盘操作、主题颜色和单／多方案页面正常。

扩展 [参考视频测试](/Users/wangguan/Desktop/Banner/Code/shipfire/tests/reference-video.test.ts)，并新增针对公共玩法配置、双方案及前端联动的测试。旧测试中“选择示例就改变参考片”的断言应按新契约调整，同时补旧任务兼容覆盖，不为保留错误行为而保留旧断言。

在项目目录运行相关本地模拟测试和类型检查；以下为已存在的测试入口，新增文件也要纳入执行：

```sh
node --import tsx --test tests/ai-foundation.test.ts tests/ai-services.test.ts tests/moderation.test.ts tests/landing.test.ts tests/reference-video.test.ts
pnpm exec tsc --noEmit --incremental false
```

测试不得依赖真实生成服务或生产数据库。类型／测试原有失败单独报告，不顺手修改无关业务。真实样本测试先小规模筛选，再增加不同照片和重复生成验证稳定性；设置预算与停止条件，记录每条可用成片的总成本，不只看单次 API 标价。

## 10. 最终交付与回退

交付修改清单、测试命令／结果、未验证项、兼容说明，以及以下配置示例：

1. 综合工作台，包含原有自由文字／单图能力与预设方案。
2. 同一玩法提供图片参考与视频参考两条方案、各自示例和不同价格；示例价格注明非正式定价。
3. 单玩法单方案热词页，不显示无关操作。
4. 修改角色数量、后台参考图、提示词、模型和积分的操作说明，说明何时必须增加适配能力。

使用明确的配置开关回退 UI 或停用新方案，不删除新旧任务。新模型／适配器保留到进行中的任务完成；回退不能留下找不到适配器的活跃任务。不要通过恢复整仓库文件撤销其他人的改动。
