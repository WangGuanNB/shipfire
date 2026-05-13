# ShipFire 模版更新日志

记录所有重要更新。

## [2.7.0] - 2025-01-20

### 技术 SEO 架构优化
- 动态 sitemap、robots.txt、OG 图片生成
- 结构化数据（JSON-LD Schema）架构
- SEO 工具库和可复用组件
- 性能优化（字体加载、图片优化）
- 📄 [更新文档](./updates/2025-01-20-technical-seo-architecture-optimization.md)

## [2.6.0] - 2025-01-20

### 订阅支付系统
- 支持月订阅、年订阅、一次性购买
- 支持 Creem、PayPal、Stripe 三种支付渠道
- 自动续费和积分重置
- 📄 [更新文档](./updates/2025-01-20-subscription-payment.md)

## [2.5.0] - 2025-01-15

### Supabase 迁移到 D1 + 数据库安全修复
- 从 PostgreSQL 迁移到 Cloudflare D1 (SQLite)
- 修复连接池耗尽问题（单例模式）
- 替换 `.returning()` 为 `lastInsertRowid`（SQLite 兼容）
- 添加 26 个数据库索引提升性能
- 添加查询超时和健康检查
- 📄 [更新文档](./updates/2025-01-15-supabase-to-d1-migration.md)

---

**维护者**：banner
