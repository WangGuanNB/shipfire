# 统一视频工作台：换玩法配置

价格都是站内示例零售积分，不是供应商账单。改提示词、素材、角色或模型后，把对应玩法的 `version` 加一。只改价格时，把该方案的 `pricingVersion` 加一。

站级热梗配置在 `src/config/sites/`（`registry.ts` 汇总）。`src/config/video-workbench.ts` 只是导出层。

## 页面

- `studio`：自由文生、单图首帧，加上双人玩法的图片参考和视频参考。首页和 `/tools/video-generator` 用这一页。
- `duo`：同一个双人玩法的图片参考和视频参考。
- `duo-image`：只开放图片参考。

落地页工具配置里写 `"workbench": "duo"` 就会换成对应页面。不写 `workbench` 时，首页仍走旧的三个标签。

## 场景 A：一梗多模板（推荐）

1. 复制 `src/config/sites/meme-duo-video/`，改文件夹名和 `preset.ts`。
2. 每个模板视频调用一次 `createVideoTemplateVariant(...)`。
3. 在 `pages.ts` 里列出 `variantIds`，设置 `variantPicker: "modal"`（或 `"cards"` 用内联卡片）。
4. 在 `registry.ts` 注册，落地页 `workbench` 指向新 page id。

## 改一个热梗（studio 演示）

1. 复制 `studio/duo-performance.ts` 里的 preset，改 id、文案、`version`。
2. 角色数量改 `inputSlots`。人物槽位用途是 `identity`。普通单图用途是 `first-frame`，不要混进人物参考。
3. 图片方案的场景图放在 `operatorAssets`，或设置 `WORKBENCH_SCENE_IMAGE_URL`。不设置就是零张场景图，仍然可以生成。
4. 视频方案的参考片放在 `operatorAssets`，地址用 `REFERENCE_VIDEO_URL`。示例墙的 `examples` 只负责预览。
5. 两个方案各自写 `modelId`、输出规格和 `retailPricing`。
6. 图片方案的固定提示词不要写“跟随参考视频”。

模型能力不够时，要加适配器，不能只改提示词。图片参考模型是 `seedance-2-image-reference`，只出现在工作台，不出现在旧的模型列表。

## 回退

去掉落地页配置里的 `workbench`，首页回到原来的文生、图生、参考视频标签。已创建的任务继续用提交时的快照，不要删任务表。
