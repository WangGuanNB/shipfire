# ShipFire 模版更新日志

记录所有重要更新。

## [2.10.0] - 2025-01-20

### 🔧 图像生成 API Provider 升级
- 实现统一 Provider 接口（ImageProvider）
- 三重容错机制（kie.ai + fal.ai + replicate）
- 自动 fallback 和智能重试策略
- 多语言错误处理（中英文）
- 优化积分扣费逻辑（仅在成功后扣费）
- 添加 kie.ai provider（$0.09/张）
- 添加 fal.ai provider（$0.039/张，最便宜）
- 升级 replicate provider（实现统一接口）
- 统计监控功能（成功率、容错率）
- 📄 [完整更新文档](./updates/2025-01-20-api-provider-upgrade.md)

## [2.9.0] - 2025-01-20

### 🎨 图片生成器完整升级
- 将 `/image-generator` 从模拟调用升级为真实 API 调用
- 集成 `/api/generate-image` 后端 API（kie.ai、fal.ai、replicate）
- 自动容错机制（主力失败时自动切换备用）
- 新增实时进度条（0-100% 进度显示 + 进度消息）
- 新增下载和分享功能
- 显示 provider 信息和容错状态
- UI 优化：宽高比从按钮网格改为下拉选择
- 配置 Cloudflare R2 存储
- 📄 [完整更新文档](./updates/2025-01-20-image-generator-upgrade.md)

## [2.8.0] - 2025-01-20

### 🚨 紧急安全修复
- 删除无认证保护的 Demo API（防止 API Key 被滥用）
- 修复图片上传 API 认证检查
- 修复 Update Invite API 权限验证
- 修复 Get User Info API 信息泄露
- 加强 Track Share API 输入验证
- 📄 [修复报告](./SECURITY-FIXES-APPLIED.md)

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
