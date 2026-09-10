# Landing 模板配置

沿用 `src/i18n/pages/landing/en.json`、`zh.json` 和现有主题、组件体系。
首页入口只负责读取内容并调用渲染器，不再逐个写死模块。

## 两种页面

- 当前 landing：`page_type: "tool"`，8 个模块，使用现有图片生成器作为可替换示例。
- 介绍页完整示例：`src/i18n/pages/landing/presets/introduction/en.json` 和 `zh.json`，7 个模块。
- 独立工具页示例：`/image-generator` 读取 `src/i18n/pages/image-generator/`，同样通过 `LandingRenderer` 渲染。
- 导航栏、页脚继续通过 `header`、`footer` 配置，其 `disabled` 开关照常生效。
- 示例配置文件不会自动增加公开路由。将介绍页示例复制到对应的 landing 文件即可切换首页。
- 如需增加长尾路由，在新路由读取该页的本地化配置，并复用 `LandingRenderer`。页面应提供独立 metadata、canonical 和语言对应链接。

## 控制顺序、增减与开关

```json
{
  "page_type": "tool",
  "modules": [
    { "id": "hero", "type": "hero", "source": "hero", "tool": "primary" },
    { "id": "examples", "type": "examples", "source": "examples" },
    { "id": "usage", "type": "steps", "source": "usage" },
    { "id": "faq", "type": "faq", "source": "faq", "disabled": true }
  ]
}
```

- 数组顺序就是显示顺序。删除一项就不显示该模块；`modules: []` 表示不显示任何主体模块。
- `disabled: true` 可放在模块项或对应内容上，任一关闭即不渲染。
- `surface` 可选：`default` | `alt` | `emphasis`，对应 CSS 变量 `--section-surface*`；不写则按序号自动交替（`cta` 默认 `emphasis`）。
- `source` 先查找 `sections[source]`，再查找旧的顶层字段，例如 `feature`、`usage`。
- 缺少内容时不显示该模块，不会补出默认营销文案。独立 `tool` 模块不要求内容 source。
- `id` 是页面锚点，必须以字母开头，只含字母、数字、下划线或短横线，同页不可重复。
- 同一种组件可重复使用，指定不同 `id` 和 `source` 即可。
- 内容原有的 `name` 在渲染时由模块 `id` 覆盖，以免复用内容时出现重复锚点；配置对象本身不会被修改。
- 不写 `modules` 时，按 `page_type` 使用预设；两者都不写时，保留旧 landing 的 8 个模块顺序。
- 开关模块后，也要同步检查自行配置的导航、CTA 链接。介绍页自动目录和案例按钮会自动排除已关闭的目标。

## 可用组件

| type | 内容及用途 |
| --- | --- |
| `hero` | 原有 Hero；可通过 `tool` 嵌入操作区 |
| `tool` | 独立工具插槽，可放在正文任意位置 |
| `intro` | 原有交替图文介绍 |
| `features` | 原有功能网格 |
| `benefits` | 原有优势图文轮播，条目数可变 |
| `steps` | 原有步骤组件，条目数可变 |
| `examples` | 标题 + 横向最多 3 张效果图；支持 `action` 一键填入工具 |
| `content` | 段落、任意数量小标题、列表、图片和对比表；可用于正文、限制、场景、费用说明 |
| `toc` | 按当前启用模块的标题和顺序生成目录 |
| `related` | 相关工具、文章、资源链接卡片和收尾按钮 |
| `pricing` | 原有实际套餐组件，source 指向完整 Pricing 数据 |
| `testimonials` | 原有评价组件，可选；不再自动假定五星或绑定产品名 |
| `faq` | 原有 FAQ，内容可设 `layout: "stacked"` |
| `cta` | 原有独立收尾 CTA，可选 |
| `branding` / `stats` | 原有品牌标志与数据展示组件，可选 |

目录默认排除 hero、tool、toc、cta；其他模块可设 `include_in_toc: false`。
`pricing` 需要传入已经按产品规则处理的套餐数据；默认费用说明使用 `content`，避免复制一份结账价格。

## 接入与替换工具

```json
{
  "tools": {
    "primary": {
      "type": "image-generator",
      "config": {
        "promptLabel": "画面描述",
        "buttonText": "生成图片"
      }
    }
  }
}
```

`primary` 只是插槽名，可更名。`type` 对应 `src/components/landing/tools.tsx` 中的注册项。
新工具只需增加一个适配器，再更改 JSON 的工具类型；页面渲染器不需要了解图片、音频或文本业务。
未知组件或工具类型会明确报错，避免配置拼写错误后悄悄丢失功能。
关闭工具可设 `tools.primary.disabled: true`；关闭 Hero 会连同其中的工具一起关闭。
一个具名工具插槽同页只能挂载一次；多个实例使用不同插槽名。

适配器接收 `{ id, slot, locale, tool }`：`id` 是生成的操作区锚点（如 `hero-tool`），`slot` 是具名插槽。
注册函数可以异步读取服务器配置，返回实际工具组件。只有启用模块使用到的工具才会加载适配器和其数据依赖。
图片工具的积分费用仍由现有服务器配置读取，JSON 只负责文案，不控制扣费。

也可以向 `LandingRenderer` 传入 `tools` 和 `renderers`，扩展或覆盖默认工具、展示组件。
工具放在 Hero 中会使用现有 `tool` 版式；独立 `tool` 模块则允许保留单独的 compact/split 首屏。

## 案例与介绍正文

```json
{
  "sections": {
    "examples": {
      "title": "效果案例",
      "items": [{
        "title": "案例名称",
        "input": { "label": "输入", "text": "实际输入" },
        "output": {
          "label": "输出",
          "image": { "src": "/imgs/your-real-result.webp", "alt": "实际输出说明" }
        },
        "action": {
          "label": "使用此示例",
          "tool": "primary",
          "values": { "prompt": "实际输入", "aspect_ratio": "1:1", "resolution": "2K" }
        }
      }]
    },
    "answer": {
      "title": "问题的答案",
      "paragraphs": ["直接解释。", "补充说明。"],
      "items": [{ "title": "小标题", "description": "正文", "list": ["要点一", "要点二"] }],
      "table": { "columns": ["方案", "适用任务"], "rows": [["A", "任务一"], ["B", "任务二"]] }
    }
  }
}
```

上面的图片路径是写法示例，需要换成真实文件。当前首页只提供明确标注的提示词示例，没有将占位图冒充生成结果。
案例按钮仅填入参数并定位操作区，不会直接调用生成接口或消耗积分。
自定义工具可使用 `useToolSelection(slot)` 接收示例参数；新工具自行定义支持哪些 values。
正文使用普通文本渲染，支持换行，不接受任意 HTML。

## 评价与旧内容

旧 `introduce`、`benefit`、`branding`、`stats`、`testimonial` 等数据保留为关闭状态，便于迁移。
如需重新启用，先替换示例文案，再关闭内容的 `disabled` 标志并加入模块清单。
评价只有明确提供 `items[].rating` 才显示评分；只有显式配置 `review_schema.product_name` 才输出产品评分结构化数据，均值来自实际提供的评分。

## 验证

运行 `node --import tsx --test tests/landing.test.ts` 检查旧配置兼容、两种预设、开关、排序、重复实例、目录和本地锚点。
运行 `pnpm exec tsc --noEmit --incremental false` 检查类型。
