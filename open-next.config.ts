// OpenNext 配置（Cloudflare 适配器）
// 目的：避免构建时的交互式提示（CI 环境会卡住）
// 注意：这里不用引入任何类型，避免 Next 类型检查时找不到包的声明导致失败。

const config = {
  // 输出目录保持与 wrangler.jsonc 一致
  outDir: ".open-next",
};

export default config;


