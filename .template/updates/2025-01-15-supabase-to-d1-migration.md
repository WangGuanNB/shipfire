# 更新说明：Supabase PostgreSQL 迁移到 Cloudflare D1

## 元数据
- **更新日期**：2025-01-15
- **更新类型**：数据库迁移
- **影响范围**：数据库层、数据访问层、配置文件、部署配置
- **优先级**：高（架构变更）
- **兼容性**：破坏性更新（需要数据迁移）
- **预计工作量**：大（8-16小时，含数据迁移）

## 更新摘要

将项目数据库从 Supabase PostgreSQL 迁移到 Cloudflare D1 (SQLite)，实现：
- 更低的数据库成本（D1 免费额度更高）
- 更好的 Cloudflare Workers 集成
- 更快的边缘计算响应速度
- 统一的 Cloudflare 生态系统

## 背景说明

Supabase PostgreSQL 虽然功能强大，但在 Cloudflare Workers 环境下存在以下问题：
1. 需要通过 HTTP 连接，增加延迟
2. 免费额度有限，成本较高
3. 与 Cloudflare 生态集成不够紧密

Cloudflare D1 作为边缘 SQLite 数据库，提供：
- 原生 Workers binding，零延迟
- 更高的免费额度
- 更好的边缘计算性能

## 影响的文件

### 新增文件
- `src/db/config.ts` - Drizzle Kit 配置（SQLite dialect）
- `src/db/index.ts` - 数据库连接层（支持本地开发 REST API + 生产 binding）
- `src/db/migrations/0000_*.sql` - 初始迁移文件
- `scripts/load-wrangler-env.js` - 环境变量加载脚本
- `open-next.config.ts` - OpenNext Cloudflare 适配器配置

### 修改文件
- `src/db/schema.ts` - 数据类型从 PostgreSQL 转为 SQLite
- `src/models/*.ts` - 所有 model 文件（查询语法从 Supabase 转为 Drizzle ORM）
- `package.json` - 依赖更新，新增构建脚本
- `wrangler.jsonc` - D1 数据库配置
- `next.config.mjs` - 集成 Cloudflare 适配器
- `.env.local` - 环境变量配置

### 删除文件
- `src/lib/supabase.ts` - Supabase 客户端（如果存在）
- 所有 Supabase 相关的工具函数

## 依赖变更

### 新增依赖
```json
{
  "drizzle-orm": "^0.44.2",
  "@opennextjs/cloudflare": "^1.19.0",
  "better-sqlite3": "^12.8.0"
}
```

### 新增开发依赖
```json
{
  "drizzle-kit": "^0.31.1",
  "wrangler": "^4.83.0",
  "@types/better-sqlite3": "^7.6.13"
}
```

### 删除依赖
```json
{
  "@supabase/supabase-js": "^2.x.x"
}
```

## 配置变更

### 环境变量

#### 新增（.env.local）
```env
# Cloudflare D1 远端数据库（本地开发直连远端 D1，无需 wrangler dev）
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_D1_DATABASE_ID=your-database-id
CLOUDFLARE_D1_TOKEN=your-api-token
```

#### 删除
```env
# 删除以下 Supabase 变量
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
```

### wrangler.jsonc 配置

在 `wrangler.jsonc` 中添加 D1 数据库绑定：

```jsonc
{
  "name": "your-project-name",
  "compatibility_date": "2025-01-10",
  "compatibility_flags": ["nodejs_compat", "enable_nodejs_http_modules"],
  
  // D1 数据库绑定
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "your-project-db",
      "database_id": "your-database-id"
    }
  ]
}
```

### next.config.mjs 配置

在文件顶部添加：

```javascript
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// 本地 `next dev` 时启用 Cloudflare 平台代理（让 getCloudflareContext 能访问 D1）
initOpenNextCloudflareForDev();
```

## 迁移步骤

### 步骤 1：创建 Cloudflare D1 数据库

**操作：**
```bash
# 登录 Cloudflare（如果还没登录）
npx wrangler login

# 创建 D1 数据库
npx wrangler d1 create your-project-db
```

**说明：**
- 执行后会输出 `database_id`，复制保存
- 在 Cloudflare Dashboard 可以看到新创建的数据库

**获取必要信息：**
1. **Account ID**: 访问 Cloudflare Dashboard → 右侧栏可以看到
2. **Database ID**: 上一步命令输出的 `database_id`
3. **API Token**: Cloudflare Dashboard → My Profile → API Tokens → Create Token
   - 使用模版 "Edit Cloudflare Workers"
   - 或自定义权限：Account.D1 = Edit

### 步骤 2：安装新依赖

**操作：**
```bash
# 删除旧依赖
pnpm remove @supabase/supabase-js

# 安装新依赖
pnpm add drizzle-orm @opennextjs/cloudflare better-sqlite3
pnpm add -D drizzle-kit wrangler @types/better-sqlite3
```

### 步骤 3：配置环境变量

**操作：**
在 `.env.local` 中添加：

```env
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_D1_DATABASE_ID=your-database-id
CLOUDFLARE_D1_TOKEN=your-api-token
```

在 `wrangler.jsonc` 中配置 D1 binding（见上面配置变更部分）

### 步骤 4：创建数据库配置文件

**操作：**
创建 `src/db/config.ts`：

```typescript
import "dotenv/config";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });
config({ path: ".env.development" });
config({ path: ".env.local" });

export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
});
```

### 步骤 5：创建数据库连接层

**操作：**
创建 `src/db/index.ts`（完整代码见代码示例部分）

**说明：**
- 本地开发：通过 REST API 连接远端 D1
- 生产环境：通过 Workers binding 访问 D1

### 步骤 6：转换 Schema 定义

**操作：**
修改 `src/db/schema.ts`，将 PostgreSQL 类型转换为 SQLite 类型（见代码示例部分）

**关键转换：**
- `uuid()` → `text()`
- `timestamp()` → `integer({ mode: "timestamp" })`
- `boolean()` → `integer({ mode: "boolean" })`
- `serial()` → `integer().primaryKey({ autoIncrement: true })`
- `integer().generatedAlwaysAsIdentity()` → `integer().primaryKey({ autoIncrement: true })`

### 步骤 6.5：批量替换 .returning() 调用

⚠️ **关键步骤：SQLite/D1 不支持 `.returning()` 方法**

**操作：**
使用全局搜索，找到所有 `.returning()` 调用并替换。

**搜索模式：**
```
.returning()
```

**影响的文件（预计）：**
- `src/models/user.ts` (约 6 处)
- `src/models/order.ts` (约 3 处)
- `src/models/credit.ts` (约 1 处)
- `src/models/apikey.ts`
- `src/models/post.ts`
- `src/models/affiliate.ts`
- `src/models/feedback.ts`

**替换策略：**

1. **对于 INSERT 操作：**
   - 使用 `result.lastInsertRowid` 获取插入的 ID，然后查询
   - 或使用唯一字段（如 uuid）直接查询

2. **对于 UPDATE 操作：**
   - 先更新，再用 WHERE 条件查询

3. **对于 DELETE 操作：**
   - 通常不需要返回值，直接删除即可
   - 如需返回，先查询再删除

**详细示例见"代码示例 → 示例 4"**

### 步骤 7：更新数据访问层

**操作：**
修改所有 `src/models/*.ts` 文件，将 Supabase 查询改为 Drizzle ORM 语法（见代码示例部分）

**特别注意：**
- 将 `$count()` 改为 `count()` 函数（需要从 `drizzle-orm` 导入）
- 优化所有计数查询，避免查询全部数据再计数（见"代码示例 → 示例 5"）

### 步骤 8：生成并执行迁移

**操作：**
```bash
# 生成迁移文件
pnpm run db:generate

# 检查生成的 SQL 文件
cat src/db/migrations/0000_*.sql

# 执行迁移到远端 D1
npx wrangler d1 migrations apply your-project-db --remote
```

### 步骤 9：配置构建脚本

**操作：**
在 `package.json` 的 `scripts` 中添加：

```json
{
  "scripts": {
    "cf:build": "node scripts/load-wrangler-env.js next build && npx @opennextjs/cloudflare@latest build",
    "cf:deploy": "pnpm run cf:build && npx wrangler deploy",
    "db:generate": "npx drizzle-kit generate --config=src/db/config.ts",
    "db:migrate": "npx drizzle-kit migrate --config=src/db/config.ts",
    "db:studio": "npx drizzle-kit studio --config=src/db/config.ts",
    "db:push": "npx drizzle-kit push --config=src/db/config.ts"
  }
}
```

### 步骤 10：创建环境变量加载脚本

**操作：**
创建 `scripts/load-wrangler-env.js`（完整代码见代码示例部分）

**说明：**
这个脚本从 `wrangler.jsonc` 读取环境变量并在构建时设置，解决 Next.js 构建时需要 `NEXT_PUBLIC_*` 变量的问题。

### 步骤 11：创建 OpenNext 配置

**操作：**
创建 `open-next.config.ts`（完整代码见代码示例部分）

### 步骤 12：数据迁移（如果有现有数据）

**操作：**
参见"数据迁移"部分

## 代码示例

### 示例 1：数据库连接层 (src/db/index.ts)

#### After (D1 + Drizzle ORM)
```typescript
import { drizzle } from "drizzle-orm/d1";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * 用 Cloudflare D1 REST API 构造一个兼容 D1Database binding 接口的对象
 * 允许在 next dev 本地环境中直接连接远端 D1，无需 wrangler dev
 */
function createD1HttpClient(
  accountId: string,
  databaseId: string,
  token: string
): D1Database {
  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  async function query(sql: string, params?: unknown[]) {
    const res = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sql, params: params ?? [] }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`D1 HTTP error ${res.status}: ${err}`);
    }
    const json = (await res.json()) as any;
    if (!json.success) {
      throw new Error(`D1 query failed: ${JSON.stringify(json.errors)}`);
    }
    return json.result[0];
  }

  function makeStatement(sql: string, params: unknown[] = []): D1PreparedStatement {
    return {
      bind(...args: unknown[]) {
        return makeStatement(sql, args);
      },
      async first<T = unknown>(col?: string): Promise<T | null> {
        const result = await query(sql, params);
        const row = result?.results?.[0] ?? null;
        if (row === null) return null;
        return (col ? row[col] : row) as T;
      },
      async run<T = Record<string, unknown>>(): Promise<D1Result<T>> {
        const result = await query(sql, params);
        return {
          results: result?.results ?? [],
          success: result?.success ?? true,
          meta: result?.meta ?? {},
        };
      },
      async all<T = unknown>(): Promise<D1Result<T>> {
        const result = await query(sql, params);
        return {
          results: (result?.results ?? []) as T[],
          success: result?.success ?? true,
          meta: result?.meta ?? {},
        };
      },
      async raw<T = unknown[]>(): Promise<T[]> {
        const result = await query(sql, params);
        const rows = (result?.results ?? []) as Record<string, unknown>[];
        return rows.map((row) => Object.values(row)) as T[];
      },
    };
  }

  return {
    prepare(sql: string) {
      return makeStatement(sql);
    },
    async dump(): Promise<ArrayBuffer> {
      throw new Error("dump() is not supported via HTTP API");
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      return Promise.all(statements.map((s) => s.all<T>()));
    },
    async exec(query: string): Promise<D1ExecResult> {
      const result = await makeStatement(query).run();
      return {
        count: 1,
        duration: (result.meta?.duration as number) ?? 0,
      };
    },
  };
}

/**
 * 获取 Drizzle D1 数据库实例
 * - 本地开发（next dev）：检测到 CLOUDFLARE_D1_TOKEN 时，通过 REST API 直连远端 D1
 * - 生产环境（Cloudflare Workers）：直接通过 binding 访问 D1
 */
export function db() {
  const token = process.env.CLOUDFLARE_D1_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;

  if (token && accountId && databaseId) {
    // 本地开发：通过 REST API 连接远端 D1
    return drizzle(createD1HttpClient(accountId, databaseId, token));
  }

  // 生产环境：通过 Workers binding 访问 D1
  const { env } = getCloudflareContext();
  return drizzle(env.DB);
}
```

### 示例 2：Schema 定义 (src/db/schema.ts)

#### Before (PostgreSQL)
```typescript
import { pgTable, uuid, varchar, timestamp, boolean, serial } from "drizzle-orm/pg-core";

export const users = pgTable("users_shipfire", {
  id: serial("id").primaryKey(),
  uuid: uuid("uuid").notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }),
  is_affiliate: boolean("is_affiliate").notNull().default(false),
});
```

#### After (SQLite)
```typescript
import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users_shipfire",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    uuid: text().notNull().unique(),
    email: text().notNull(),
    created_at: integer({ mode: "timestamp" }),
    is_affiliate: integer({ mode: "boolean" }).notNull().default(false),
  },
  (table) => [
    uniqueIndex("email_shipfire_provider_unique_idx").on(
      table.email,
      table.signin_provider
    ),
  ]
);
```

**关键变化：**
- `pgTable` → `sqliteTable`
- `uuid()` → `text()`（SQLite 没有 UUID 类型）
- `varchar()` → `text()`
- `timestamp()` → `integer({ mode: "timestamp" })`（存储 Unix 时间戳）
- `boolean()` → `integer({ mode: "boolean" })`（SQLite 没有 Boolean 类型）
- `serial()` → `integer().primaryKey({ autoIncrement: true })`
- 索引定义移到第二个参数的回调函数中

### 示例 3：数据访问层 (src/models/user.ts)

#### Before (Supabase)
```typescript
import { createClient } from '@/lib/supabase';

export async function findUserByEmail(email: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('users_shipfire')
    .select('*')
    .eq('email', email)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getUsers(page: number = 1, limit: number = 50) {
  const supabase = createClient();
  const offset = (page - 1) * limit;
  
  const { data, error } = await supabase
    .from('users_shipfire')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) throw error;
  return data;
}
```

#### After (Drizzle ORM)
```typescript
import { users } from "@/db/schema";
import { db } from "@/db";
import { desc, eq } from "drizzle-orm";

export async function findUserByEmail(
  email: string
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user;
}

export async function getUsers(
  page: number = 1,
  limit: number = 50
): Promise<(typeof users.$inferSelect)[] | undefined> {
  const offset = (page - 1) * limit;

  const data = await db()
    .select()
    .from(users)
    .orderBy(desc(users.created_at))
    .limit(limit)
    .offset(offset);

  return data;
}
```

**关键变化：**
- 不再使用 Supabase 客户端
- 使用 Drizzle ORM 的查询构建器
- `eq`, `desc`, `like` 等过滤条件从 `drizzle-orm` 导入
- 返回类型使用 `typeof users.$inferSelect` 自动推断
- 不需要手动处理错误（Drizzle 会抛出异常）

### 示例 4：处理 .returning() 不支持的问题

⚠️ **重要：SQLite/D1 不支持 `.returning()` 方法**

PostgreSQL 支持 `RETURNING` 子句，可以在 INSERT/UPDATE/DELETE 后直接返回受影响的行。但 SQLite 不支持此特性，需要使用替代方案。

#### Before (PostgreSQL with .returning())
```typescript
// ❌ 这在 D1 中会失败
export async function insertUser(
  data: typeof users.$inferInsert
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db().insert(users).values(data).returning();
  return user;
}

// ❌ 更新操作也会失败
export async function updateUserInviteCode(
  user_uuid: string,
  invite_code: string
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db()
    .update(users)
    .set({ invite_code, updated_at: new Date() })
    .where(eq(users.uuid, user_uuid))
    .returning();
  return user;
}
```

#### After (SQLite without .returning())

**方案 1：使用 lastInsertRowid（推荐用于 INSERT）**
```typescript
// ✅ 插入后使用 lastInsertRowid 查询
export async function insertUser(
  data: typeof users.$inferInsert
): Promise<typeof users.$inferSelect | undefined> {
  const result = await db().insert(users).values(data);
  
  // D1 返回的 result 包含 lastInsertRowid
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.id, result.lastInsertRowid))
    .limit(1);
  
  return user;
}
```

**方案 2：使用唯一字段查询（推荐用于有 UUID 的情况）**
```typescript
// ✅ 如果有唯一字段（如 uuid），直接用该字段查询
export async function insertUser(
  data: typeof users.$inferInsert
): Promise<typeof users.$inferSelect | undefined> {
  await db().insert(users).values(data);
  
  // 用 uuid 查询刚插入的记录
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.uuid, data.uuid))
    .limit(1);
  
  return user;
}
```

**方案 3：UPDATE 操作的替代方案**
```typescript
// ✅ 更新后用 WHERE 条件查询
export async function updateUserInviteCode(
  user_uuid: string,
  invite_code: string
): Promise<typeof users.$inferSelect | undefined> {
  // 先更新
  await db()
    .update(users)
    .set({ invite_code, updated_at: new Date() })
    .where(eq(users.uuid, user_uuid));
  
  // 再用相同条件查询
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.uuid, user_uuid))
    .limit(1);
  
  return user;
}
```

**方案 4：如果不需要返回值**
```typescript
// ✅ 如果不需要返回完整对象，直接执行即可
export async function updateUserInviteCode(
  user_uuid: string,
  invite_code: string
): Promise<void> {
  await db()
    .update(users)
    .set({ invite_code, updated_at: new Date() })
    .where(eq(users.uuid, user_uuid));
}
```

**性能对比：**
- 方案 1（lastInsertRowid）：2 次数据库操作，但使用主键查询，性能最好
- 方案 2（唯一字段）：2 次数据库操作，使用索引查询，性能良好
- 方案 3（UPDATE + SELECT）：2 次数据库操作，适用于更新场景
- 方案 4（不返回）：1 次数据库操作，性能最佳

### 示例 5：优化计数查询

#### Before (低效的计数方式)
```typescript
// ❌ 查询所有记录再计数，效率低
export async function getPaidOrdersTotal(): Promise<number | undefined> {
  try {
    const total = await db()
      .select()
      .from(orders)
      .where(eq(orders.status, OrderStatus.Paid));
    return total.length; // 查询了所有数据，只为了计数
  } catch (e) {
    console.log("getPaidOrdersTotal failed: ", e);
    return 0;
  }
}

// ❌ $count() 方法在 D1 中可能不可用
export async function getUsersTotal(): Promise<number> {
  const total = await db().$count(users);
  return total;
}
```

#### After (使用 count() 函数)
```typescript
import { count } from "drizzle-orm";

// ✅ 使用 SQL COUNT() 函数，只返回计数
export async function getPaidOrdersTotal(): Promise<number | undefined> {
  try {
    const [result] = await db()
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.status, OrderStatus.Paid));
    return result.count;
  } catch (e) {
    console.log("getPaidOrdersTotal failed: ", e);
    return 0;
  }
}

// ✅ 使用 count() 函数替代 $count()
export async function getUsersTotal(): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(users);
  return result.count;
}

// ✅ 带条件的计数
export async function getActiveUsersCount(): Promise<number> {
  const [result] = await db()
    .select({ count: count() })
    .from(users)
    .where(eq(users.is_active, true));
  return result.count;
}
```

**性能提升：**
- 旧方式：查询所有记录 → 传输所有数据 → 在应用层计数
- 新方式：数据库层计数 → 只传输一个数字
- 对于大表，性能提升可达 **100-1000 倍**

## 数据类型映射表

| PostgreSQL | SQLite (Drizzle) | 说明 | ⚠️ 特别注意 |
|------------|------------------|------|------------|
| `uuid()` | `text()` | UUID 存储为文本 | - |
| `varchar(n)` | `text()` | SQLite 的 TEXT 无长度限制 | - |
| `text()` | `text()` | 相同 | - |
| `integer()` | `integer()` | 相同 | - |
| `bigint()` | `integer()` | SQLite 的 INTEGER 是 64 位 | - |
| `serial()` | `integer().primaryKey({ autoIncrement: true })` | 自增主键 | **必须修改** |
| `integer().generatedAlwaysAsIdentity()` | `integer().primaryKey({ autoIncrement: true })` | 自增主键（新语法） | **必须修改** |
| `timestamp()` | `integer({ mode: "timestamp" })` | 存储 Unix 时间戳 | 自动转换为 Date |
| `boolean()` | `integer({ mode: "boolean" })` | 0/1 表示 false/true | 自动转换为 boolean |
| `json()` | `text()` | JSON 存储为文本 | 需要手动 parse |
| `.returning()` | **不支持** | 插入/更新后返回数据 | **需要额外查询** |
| `$count()` | `count()` from drizzle-orm | 计数查询 | **导入方式不同** |

## 数据迁移

### 方案 1：从 Supabase 导出数据

**步骤 1：导出数据**
```bash
# 使用 Supabase CLI 导出
supabase db dump -f dump.sql

# 或使用 pg_dump
pg_dump -h your-host -U your-user -d your-db > dump.sql
```

**步骤 2：转换为 SQLite 格式**

由于 PostgreSQL 和 SQLite 的 SQL 语法差异较大，建议：
1. 导出为 CSV 格式
2. 编写 TypeScript 脚本读取 CSV 并插入到 D1

**示例脚本：**
```typescript
// scripts/migrate-data.ts
import { db } from '../src/db';
import { users } from '../src/db/schema';
import * as fs from 'fs';
import * as csv from 'csv-parser';

async function migrateUsers() {
  const results: any[] = [];
  
  fs.createReadStream('users.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      for (const row of results) {
        await db().insert(users).values({
          uuid: row.uuid,
          email: row.email,
          created_at: new Date(row.created_at),
          // ... 其他字段
        });
      }
      console.log('Migration completed');
    });
}

migrateUsers();
```

### 方案 2：双写策略（推荐用于生产环境）

如果项目已上线，建议使用双写策略：
1. 同时写入 Supabase 和 D1
2. 验证 D1 数据正确性
3. 切换读取到 D1
4. 停止写入 Supabase

## 注意事项

⚠️ **重要警告**
- 这是破坏性更新，需要完整的数据迁移
- SQLite 不支持某些 PostgreSQL 特性（如数组类型、JSON 操作符）
- 本地开发需要配置 D1 REST API 访问凭证
- 生产环境必须部署到 Cloudflare Workers

💡 **最佳实践**
- 先在测试环境完整验证迁移流程
- 备份 Supabase 数据
- 使用 Drizzle Studio 查看和调试数据库
- 保留 Supabase 一段时间作为备份

✅ **兼容性说明**
- 需要 Node.js 18+
- 需要 Cloudflare Workers 付费计划（免费计划有限制）
- 本地开发需要稳定的网络连接（访问 Cloudflare API）

## 验证清单

完成更新后，请逐项检查：

- [ ] D1 数据库已创建
- [ ] 环境变量已配置（CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_D1_TOKEN）
- [ ] wrangler.jsonc 中 D1 binding 已配置
- [ ] 依赖安装成功（`pnpm install`）
- [ ] Schema 迁移文件已生成（`pnpm run db:generate`）
- [ ] 迁移已执行到远端 D1（`npx wrangler d1 migrations apply`）
- [ ] 本地开发环境正常（`pnpm dev`）
  - [ ] 数据库连接成功
  - [ ] 用户登录功能正常
  - [ ] 订单创建和查询正常
- [ ] 代码编译无错误（`pnpm run cf:build`）
- [ ] 生产环境部署成功（`pnpm run cf:deploy`）
- [ ] 数据已迁移（如果有现有数据）
- [ ] 所有核心功能测试通过

## 回滚方案

如果迁移出现严重问题，可以回滚到 Supabase：

1. **代码回滚**
   ```bash
   git revert <commit-hash>
   pnpm install
   ```

2. **恢复 Supabase 配置**
   ```env
   DATABASE_URL=postgresql://...
   ```

3. **重新部署**
   ```bash
   pnpm build
   pnpm deploy
   ```

## 常见问题

### Q1: 本地开发时提示 "D1 HTTP error 401"
**A:** 检查 `CLOUDFLARE_D1_TOKEN` 是否正确，确保 API Token 有 D1 编辑权限。

### Q2: 生产环境提示 "env.DB is undefined"
**A:** 检查 `wrangler.jsonc` 中的 D1 binding 配置是否正确，确保 `binding: "DB"` 与代码中的 `env.DB` 一致。

### Q3: SQLite 不支持我的 PostgreSQL 查询
**A:** SQLite 功能相对简单，某些复杂查询需要重写。常见问题：
- 不支持 `ARRAY` 类型 → 使用 JSON 存储
- 不支持 `JSONB` 操作符 → 使用 `json_extract()` 函数
- 不支持 `FULL OUTER JOIN` → 改用 `LEFT JOIN` + `UNION`

### Q4: 如何查看 D1 数据库内容？
**A:** 使用 Drizzle Studio：
```bash
pnpm run db:studio
```
或使用 Wrangler CLI：
```bash
npx wrangler d1 execute your-project-db --command "SELECT * FROM users_shipfire LIMIT 10"
```

### Q5: 数据迁移太慢怎么办？
**A:** 
- 使用批量插入（`db().insert().values([...])` 支持数组）
- 分批迁移，每批 1000 条
- 考虑使用 Wrangler CLI 的 `d1 execute` 直接执行 SQL

### Q6: 为什么 .returning() 报错？

**A:** SQLite 不支持 `RETURNING` 子句，这是 PostgreSQL 特有的功能。

**错误示例：**
```typescript
// ❌ 会报错：SQLite does not support RETURNING clause
const [user] = await db().insert(users).values(data).returning();
```

**解决方案：**

**方案 1：使用 `lastInsertRowid`（推荐用于 INSERT）**
```typescript
const result = await db().insert(users).values(data);
const [user] = await db()
  .select()
  .from(users)
  .where(eq(users.id, result.lastInsertRowid))
  .limit(1);
```

**方案 2：使用唯一字段查询（如果有 uuid）**
```typescript
await db().insert(users).values(data);
const [user] = await db()
  .select()
  .from(users)
  .where(eq(users.uuid, data.uuid))
  .limit(1);
```

**方案 3：UPDATE 后查询**
```typescript
await db().update(users).set({ name: "New Name" }).where(eq(users.id, userId));
const [user] = await db()
  .select()
  .from(users)
  .where(eq(users.id, userId))
  .limit(1);
```

详细示例见"代码示例 → 示例 4"。

### Q7: $count() 方法找不到？

**A:** Drizzle ORM 的 `$count()` 方法在某些情况下不可用，应该改用 `count()` 函数。

**错误示例：**
```typescript
// ❌ 可能报错：$count is not a function
const total = await db().$count(users);
```

**正确做法：**
```typescript
import { count } from "drizzle-orm";

const [result] = await db()
  .select({ count: count() })
  .from(users);
const total = result.count;
```

**带条件的计数：**
```typescript
import { count, eq } from "drizzle-orm";

const [result] = await db()
  .select({ count: count() })
  .from(orders)
  .where(eq(orders.status, "paid"));
const paidCount = result.count;
```

**性能优势：**
- 使用 `count()` 函数在数据库层计数，只返回一个数字
- 避免查询所有数据再在应用层计数，性能提升 100-1000 倍

详细示例见"代码示例 → 示例 5"。

### Q8: 时间戳查询结果是数字而不是 Date 对象？

**A:** 确保 schema 中使用了 `{ mode: "timestamp" }` 选项。

**错误示例：**
```typescript
// ❌ 没有指定 mode，返回的是 Unix 时间戳（数字）
created_at: integer()
```

**正确做法：**
```typescript
// ✅ 指定 mode: "timestamp"，Drizzle 会自动转换为 Date 对象
created_at: integer({ mode: "timestamp" })
```

**使用示例：**
```typescript
// Schema 定义
export const users = sqliteTable("users_shipfire", {
  id: integer().primaryKey({ autoIncrement: true }),
  created_at: integer({ mode: "timestamp" }),
  updated_at: integer({ mode: "timestamp" }),
});

// 插入时直接传 Date 对象
await db().insert(users).values({
  created_at: new Date(),
  updated_at: new Date(),
});

// 查询时自动转换为 Date 对象
const [user] = await db().select().from(users).limit(1);
console.log(user.created_at); // Date 对象，不是数字
console.log(user.created_at.toISOString()); // 可以直接调用 Date 方法
```

**其他 mode 选项：**
- `{ mode: "boolean" }` - 将 0/1 转换为 false/true
- `{ mode: "timestamp" }` - 将 Unix 时间戳转换为 Date 对象
- `{ mode: "timestamp_ms" }` - 将毫秒时间戳转换为 Date 对象

## 相关文档

- [Cloudflare D1 文档](https://developers.cloudflare.com/d1/)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [OpenNext Cloudflare 文档](https://opennext.js.org/cloudflare)
- [Wrangler CLI 文档](https://developers.cloudflare.com/workers/wrangler/)

## 更新日志

- **2025-01-15**: 初始版本
- **2025-01-16**: 补充数据迁移方案
- **2025-01-17**: 添加常见问题解答
