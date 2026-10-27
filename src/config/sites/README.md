> 模板默认已升级：固定素材从 `src/config/public-media.ts` 配置并放入 `public/`；Hero 默认嵌入工具，结果显示在独立行。新的接入流程、音轨策略和验收步骤见 [模板升级说明](../../../docs/template-upgrade.md)。下文外部 URL 仅为可选覆盖示例。

# Site workbench presets

Each cloned meme site should edit files under this folder instead of scattering config across the repo.

## Scenario A (one meme, multiple motion templates)

1. Copy `meme-duo-video/` to a new folder, e.g. `kemu-san/`.
2. Edit `preset.ts`:
   - Change `id`, `version`, titles.
   - Add/remove `createVideoTemplateVariant(...)` entries (one per motion clip).
3. Edit `pages.ts`:
   - Set `id` (referenced by landing `tools.config.workbench`).
   - List `variantIds` and `defaultVariantId`.
   - Keep `variantPicker: "modal"` for the compact row + gallery dialog (`"cards"` keeps inline tiles).
4. Register the preset and page in `registry.ts`.
5. Point the landing tool config to your page id:

```json
"workbench": "meme-duo-video"
```

## Shared helpers

| File | Purpose |
|------|---------|
| `shared/pricing.ts` | Retail credit tables |
| `shared/slots.ts` | Reusable upload slots |
| `shared/video-template.ts` | `createVideoTemplateVariant()` factory |
| `shared/scene-asset.ts` | Optional scene image from env |

## Studio presets

`studio/` keeps the template demo (`free-create`, `duo-performance`) for the main ShipFire site. New meme-only sites can remove `studio/` entries from `registry.ts`.
