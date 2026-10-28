# 模板预检与零模型费用诊断

公开 URL 能打开，不代表 Workers 内部能读到并解析同一份文件。生成前预检发生在积分预留和 KIE 提交之前。

- 本站启用的 `public/video/template/` 文件在构建时检查时长和音轨，并把实际宽高、时长、SHA-256 写入 `src/config/site-templates.json`。不把 Tiny Desk 的 15 秒或 9:16 写死成全站规则。
- 运行时只有字节和指纹都匹配的文件可以跳过二次解析。伪 MP4 文件头、时长不符、缺少所需音轨都会失败。
- `wrangler.jsonc` 的 `assets.binding` 为 `ASSETS`。本站 `/video/template/` 优先从部署资源读取，不经公网回源。
- 生成结果使用同一套检查。时长或音轨明确不合格会失败并释放预留积分。解析运行异常会保留供应商任务 ID，稍后重试交付，不会重新付费生成。
- `POST /api/ai/diagnostics/template/` 需要 `AI_MAINTENANCE_SECRET`。它只处理站长模板，不读用户照片，不调用 KIE。

更换模板后：

```sh
pnpm template:update
```

然后提交视频和 `site-templates.json`。部署后：

```sh
pnpm run diagnose:production
pnpm run diagnose:production --storage
```

`ok: true` 且 `paidGeneration: false` 才算链路通过。这不能代替真实人物生成的画质验收。

诊断现在逐一检查全部启用的参考视频变体，返回 `templateCount`，每项检查带 `templateId`。一个模板失败后会继续检查其余模板；静音或模型配音模式不强制模板含音轨，也不执行模板音轨合并。`--storage` 会为每个通过处理的模板分别检查存储并清理测试文件。

历史任务缺少 `referenceDurationSeconds` 时，从该任务实际源文件的指纹或元数据确认时长，不使用输出时长或现在的预设反推。明确填写但错误的源时长仍会被拒绝；交付重试仅读取原供应商任务，不重新付费生成。
