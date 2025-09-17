// OpenNext 配置（Cloudflare 适配器）
// 目的：避免构建时的交互式提示（CI 环境会卡住）
import type { OpenNextConfig } from "@opennextjs/cloudflare";

export default {
  // 输出目录保持与 wrangler.jsonc 一致
  outDir: ".open-next",
  // 其余使用默认配置即可；如需按需绑定 D1/KV/R2 等，可后续在此扩展
} satisfies OpenNextConfig;


