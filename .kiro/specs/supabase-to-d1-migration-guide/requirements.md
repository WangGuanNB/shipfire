# Requirements Document

## Introduction

本文档定义了从 Supabase PostgreSQL 迁移到 Cloudflare D1 (SQLite) 的完整迁移指南的需求。该指南旨在帮助使用相同 Next.js SaaS 模版的项目团队，能够系统化地完成数据库迁移工作，包括数据库配置、Schema 转换、数据访问层重构、部署配置以及数据迁移策略。

## Glossary

- **Migration_Guide**: 数据库迁移指南文档系统
- **D1_Database**: Cloudflare D1 数据库服务（基于 SQLite）
- **Supabase**: PostgreSQL 数据库托管服务
- **Drizzle_ORM**: TypeScript ORM 框架
- **Schema**: 数据库表结构定义
- **Workers_Binding**: Cloudflare Workers 环境变量绑定
- **REST_API**: Cloudflare D1 REST API（用于本地开发）
- **Data_Access_Layer**: 数据访问层（models 目录）
- **Wrangler**: Cloudflare Workers 命令行工具
- **OpenNext**: Next.js 到 Cloudflare Workers 的适配器

## Requirements

### Requirement 1: D1 数据库创建与配置

**User Story:** 作为开发者，我希望了解如何创建和配置 D1 数据库，以便能够在 Cloudflare 平台上建立数据库基础设施。

#### Acceptance Criteria

1. THE Migration_Guide SHALL 提供使用 Wrangler CLI 创建 D1 数据库的完整命令
2. THE Migration_Guide SHALL 说明如何获取 database_id 和 account_id
3. THE Migration_Guide SHALL 提供在 wrangler.jsonc 中配置 d1_databases binding 的示例
4. THE Migration_Guide SHALL 说明如何配置本地开发环境的 REST API 访问凭证（CLOUDFLARE_D1_TOKEN, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID）
5. THE Migration_Guide SHALL 提供生成 API Token 的步骤说明

### Requirement 2: Drizzle ORM 配置迁移

**User Story:** 作为开发者，我希望了解如何将 Drizzle ORM 从 PostgreSQL dialect 迁移到 SQLite dialect，以便 ORM 能够正确连接 D1 数据库。

#### Acceptance Criteria

1. THE Migration_Guide SHALL 提供 src/db/config.ts 的完整配置示例（使用 sqlite dialect）
2. THE Migration_Guide SHALL 说明 PostgreSQL 和 SQLite dialect 的关键差异
3. THE Migration_Guide SHALL 提供 package.json 中 Drizzle 相关依赖的版本要求
4. THE Migration_Guide SHALL 说明如何配置 migrations 输出目录

### Requirement 3: Schema 数据类型转换

**User Story:** 作为开发者，我希望了解如何将 PostgreSQL Schema 转换为 SQLite Schema，以便数据库表结构能够在 D1 中正确创建。

#### Acceptance Criteria

1. THE Migration_Guide SHALL 提供 PostgreSQL 到 SQLite 数据类型映射表（包括 uuid → text, timestamp → integer, boolean → integer, serial → integer autoincrement）
2. THE Migration_Guide SHALL 提供完整的 src/db/schema.ts 转换示例（包含至少 3 个表的对比）
3. THE Migration_Guide SHALL 说明 SQLite 中 timestamp 的 mode: "timestamp" 配置用法
4. THE Migration_Guide SHALL 说明 SQLite 中 boolean 的 mode: "boolean" 配置用法
5. THE Migration_Guide SHALL 说明如何处理 PostgreSQL 的 serial/bigserial 类型（转换为 integer primaryKey autoIncrement）
6. THE Migration_Guide SHALL 说明如何处理索引定义的差异

### Requirement 4: 数据库连接层实现

**User Story:** 作为开发者，我希望了解如何实现支持本地开发和生产环境的数据库连接层，以便在不同环境下都能正确访问 D1 数据库。

#### Acceptance Criteria

1. THE Migration_Guide SHALL 提供 src/db/index.ts 的完整实现代码
2. THE Migration_Guide SHALL 说明 createD1HttpClient 函数的实现原理（REST API 方式）
3. THE Migration_Guide SHALL 说明如何通过环境变量检测本地开发环境
4. THE Migration_Guide SHALL 说明如何在生产环境使用 Workers binding（getCloudflareContext）
5. THE Migration_Guide SHALL 说明 D1Database 接口的关键方法（prepare, batch, exec）

### Requirement 5: 数据访问层查询语法迁移

**User Story:** 作为开发者，我希望了解如何将数据访问层从 Supabase 客户端迁移到 Drizzle ORM 查询语法，以便所有数据库操作都能正确执行。

#### Acceptance Criteria

1. THE Migration_Guide SHALL 提供至少 5 种常见查询模式的对比示例（SELECT, INSERT, UPDATE, DELETE, JOIN）
2. THE Migration_Guide SHALL 说明 Drizzle ORM 的查询构建器用法（select, from, where, orderBy, limit, offset）
3. THE Migration_Guide SHALL 说明如何使用 eq, like, and, or, gte, lte 等过滤条件
4. THE Migration_Guide SHALL 说明如何处理 returning 子句（获取插入/更新后的数据）
5. THE Migration_Guide SHALL 提供分页查询的实现示例
6. THE Migration_Guide SHALL 说明如何处理日期时间查询（timestamp 模式）

### Requirement 6: Cloudflare Workers 部署配置

**User Story:** 作为开发者，我希望了解如何配置 Cloudflare Workers 部署环境，以便 Next.js 应用能够在 Cloudflare 平台上正确运行。

#### Acceptance Criteria

1. THE Migration_Guide SHALL 提供 wrangler.jsonc 的完整配置示例（包含 compatibility_flags, d1_databases, vars）
2. THE Migration_Guide SHALL 说明 nodejs_compat 和 enable_nodejs_http_modules 标志的作用
3. THE Migration_Guide SHALL 提供 open-next.config.ts 的配置示例
4. THE Migration_Guide SHALL 说明如何配置 next.config.mjs 集成 @opennextjs/cloudflare
5. THE Migration_Guide SHALL 说明 initOpenNextCloudflareForDev 的作用（本地开发支持）

### Requirement 7: 构建和部署脚本配置

**User Story:** 作为开发者，我希望了解如何配置构建和部署脚本，以便能够自动化完成应用的构建和发布流程。

#### Acceptance Criteria

1. THE Migration_Guide SHALL 提供 package.json 中所有必需的 scripts 配置（dev, build, cf:build, cf:deploy, db:generate, db:migrate, db:push）
2. THE Migration_Guide SHALL 说明 scripts/load-wrangler-env.js 的实现原理和作用
3. THE Migration_Guide SHALL 说明如何使用 Drizzle Kit 生成和执行迁移（db:generate, db:migrate）
4. THE Migration_Guide SHALL 说明本地开发、远程开发和生产部署的命令差异

### Requirement 8: 环境变量管理

**User Story:** 作为开发者，我希望了解如何管理不同环境的配置变量，以便应用能够在本地开发和生产环境中使用正确的配置。

#### Acceptance Criteria

1. THE Migration_Guide SHALL 说明 .env.local 中需要配置的 D1 相关变量（CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_D1_TOKEN）
2. THE Migration_Guide SHALL 说明 wrangler.jsonc 中 vars 的作用和配置方法
3. THE Migration_Guide SHALL 说明如何在构建时从 wrangler.jsonc 加载环境变量
4. THE Migration_Guide SHALL 说明 NEXT_PUBLIC_* 变量的特殊处理

### Requirement 9: 数据库迁移执行流程

**User Story:** 作为开发者，我希望了解如何执行数据库 Schema 迁移，以便能够在 D1 数据库中创建所有必需的表结构。

#### Acceptance Criteria

1. THE Migration_Guide SHALL 提供生成迁移文件的完整命令（pnpm run db:generate）
2. THE Migration_Guide SHALL 说明如何检查生成的迁移 SQL 文件
3. THE Migration_Guide SHALL 提供执行迁移的命令（pnpm run db:migrate 或 wrangler d1 migrations apply）
4. THE Migration_Guide SHALL 说明如何验证迁移是否成功执行
5. THE Migration_Guide SHALL 说明如何使用 Drizzle Studio 查看数据库结构

### Requirement 10: 数据迁移策略

**User Story:** 作为开发者，我希望了解如何将现有 Supabase 数据迁移到 D1，以便保留用户数据和业务数据。

#### Acceptance Criteria

1. THE Migration_Guide SHALL 提供从 Supabase 导出数据的方法（SQL dump 或 CSV）
2. THE Migration_Guide SHALL 说明如何转换 PostgreSQL dump 为 SQLite 兼容格式
3. THE Migration_Guide SHALL 提供使用 Wrangler CLI 导入数据的命令示例
4. THE Migration_Guide SHALL 说明如何编写自定义数据迁移脚本（TypeScript）
5. THE Migration_Guide SHALL 说明数据迁移的验证方法（数据完整性检查）
6. THE Migration_Guide SHALL 提供处理大数据量迁移的分批策略

### Requirement 11: 常见问题和故障排除

**User Story:** 作为开发者，我希望了解迁移过程中可能遇到的常见问题和解决方案，以便能够快速解决问题。

#### Acceptance Criteria

1. THE Migration_Guide SHALL 列出至少 5 个常见错误及其解决方案
2. THE Migration_Guide SHALL 说明如何调试本地开发环境的 D1 连接问题
3. THE Migration_Guide SHALL 说明如何处理 SQLite 的数据类型限制
4. THE Migration_Guide SHALL 说明如何处理 Workers binding 未找到的错误
5. THE Migration_Guide SHALL 提供性能优化建议（索引、查询优化）

### Requirement 12: 迁移检查清单

**User Story:** 作为开发者，我希望有一个完整的迁移检查清单，以便确保所有迁移步骤都已正确完成。

#### Acceptance Criteria

1. THE Migration_Guide SHALL 提供迁移前的准备检查清单（至少 5 项）
2. THE Migration_Guide SHALL 提供迁移过程中的验证检查清单（至少 8 项）
3. THE Migration_Guide SHALL 提供迁移后的测试检查清单（至少 5 项）
4. THE Migration_Guide SHALL 说明如何验证应用功能完整性
5. THE Migration_Guide SHALL 提供回滚计划建议

### Requirement 13: 代码示例和参考

**User Story:** 作为开发者，我希望文档中包含完整的代码示例，以便能够直接参考和复制使用。

#### Acceptance Criteria

1. THE Migration_Guide SHALL 提供所有关键文件的完整代码示例（至少 8 个文件）
2. THE Migration_Guide SHALL 为每个代码示例提供详细注释
3. THE Migration_Guide SHALL 使用代码块语法高亮显示代码
4. THE Migration_Guide SHALL 标注代码示例中的关键修改点
5. THE Migration_Guide SHALL 提供前后对比示例（PostgreSQL vs SQLite）

### Requirement 14: 文档结构和导航

**User Story:** 作为开发者，我希望文档结构清晰、易于导航，以便能够快速找到所需信息。

#### Acceptance Criteria

1. THE Migration_Guide SHALL 使用清晰的标题层级结构（H1-H4）
2. THE Migration_Guide SHALL 在文档开头提供目录
3. THE Migration_Guide SHALL 使用编号列表组织步骤说明
4. THE Migration_Guide SHALL 使用表格展示对比信息（数据类型映射等）
5. THE Migration_Guide SHALL 使用提示框标注重要信息（⚠️ 注意、💡 提示、✅ 最佳实践）

### Requirement 15: 多语言支持

**User Story:** 作为中文开发者，我希望文档使用中文编写，以便更容易理解和使用。

#### Acceptance Criteria

1. THE Migration_Guide SHALL 使用简体中文作为主要语言
2. THE Migration_Guide SHALL 保留技术术语的英文原文（如 D1, Drizzle ORM, Workers）
3. THE Migration_Guide SHALL 为关键技术术语提供中英文对照
4. THE Migration_Guide SHALL 使用清晰、专业的技术写作风格
