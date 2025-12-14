import bundleAnalyzer from "@next/bundle-analyzer";
import createNextIntlPlugin from "next-intl/plugin";
import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ❌ 已移除 output: "standalone" - Cloudflare Workers 不需要此配置
  reactStrictMode: false,
  trailingSlash: true, // 确保URL都带尾部斜杠，与canonical保持一致
  pageExtensions: ["ts", "tsx", "js", "jsx", "md", "mdx"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*",
      },
    ],
  },
  // Webpack 优化配置（用于 Cloudflare Workers 环境）
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        minimize: true,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      };
    }
    return config;
  },
  // 压缩和优化
  compress: true,
  swcMinify: true,
  async redirects() {
    return [
      {
        source: "/undefined",
        destination: "/",
        permanent: true,
      },
      // ✅ 删除所有UTM参数的重定向规则
      // 让robots.txt处理SEO，保留UTM追踪功能
    ];
  },
};

// Make sure experimental mdx flag is enabled
const configWithMDX = {
  ...nextConfig,
  experimental: {
    mdxRs: true,
    // 优化包导入（减少 bundle 大小）
    optimizePackageImports: [
      "@radix-ui/react-accordion",
      "@radix-ui/react-avatar",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "lucide-react",
      "framer-motion",
      // 根据项目添加其他大型 UI 库
    ],
  },
};

export default withBundleAnalyzer(withNextIntl(withMDX(configWithMDX)));
