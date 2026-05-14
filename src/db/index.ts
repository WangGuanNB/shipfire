import { drizzle } from "drizzle-orm/d1";
import { sql } from "drizzle-orm";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// 🔥 使用单例模式缓存数据库实例，避免重复创建连接
let cachedDb: ReturnType<typeof drizzle> | null = null;
let cachedD1Client: D1Database | null = null;

/**
 * 用 Cloudflare D1 REST API 构造一个兼容 D1Database binding 接口的对象
 * 允许在 next dev 本地环境中直接连接远端 D1，无需 wrangler dev
 */
function createD1HttpClient(
  accountId: string,
  databaseId: string,
  token: string
): D1Database {
  // 🔥 如果已经创建过，直接返回缓存的实例
  if (cachedD1Client) {
    return cachedD1Client;
  }

  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  async function query(sql: string, params?: unknown[]) {
    // 🔥 添加 10 秒超时控制，防止慢查询堆积
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sql, params: params ?? [] }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`D1 HTTP error ${res.status}: ${err}`);
      }
      const json = (await res.json()) as any;
      if (!json.success) {
        throw new Error(`D1 query failed: ${JSON.stringify(json.errors)}`);
      }
      return json.result[0];
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === "AbortError") {
        throw new Error("Database query timeout (10s)");
      }
      throw error;
    }
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

  const client: D1Database = {
    prepare(sql: string) {
      return makeStatement(sql);
    },
    async dump(): Promise<ArrayBuffer> {
      throw new Error("dump() is not supported via HTTP API");
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      // D1 REST API 支持批量查询，但这里简化为逐个执行
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

  // 🔥 缓存客户端实例，避免重复创建
  cachedD1Client = client;
  return client;
}

/**
 * 获取 Drizzle D1 数据库实例（单例模式）
 * - 本地开发（next dev）：检测到 CLOUDFLARE_D1_TOKEN 时，通过 REST API 直连远端 D1
 * - 生产环境（Cloudflare Workers）：直接通过 binding 访问 D1
 */
export function db() {
  // 🔥 如果已经创建过，直接返回缓存的实例
  if (cachedDb) {
    return cachedDb;
  }

  const token = process.env.CLOUDFLARE_D1_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;

  if (token && accountId && databaseId) {
    // 本地开发：通过 REST API 连接远端 D1
    cachedDb = drizzle(createD1HttpClient(accountId, databaseId, token));
    return cachedDb;
  }

  // 生产环境：通过 Workers binding 访问 D1
  const { env } = getCloudflareContext();
  cachedDb = drizzle(env.DB);
  return cachedDb;
}

/**
 * 🔥 清除缓存（仅用于测试或热重载）
 */
export function clearDbCache() {
  cachedDb = null;
  cachedD1Client = null;
}

/**
 * 🔥 数据库健康检查
 */
export async function healthCheck(): Promise<boolean> {
  try {
    // 使用 SQL 语句进行简单的健康检查
    const result = await db().run(sql`SELECT 1 as health_check`);
    return true;
  } catch (e) {
    console.error("Database health check failed:", e);
    return false;
  }
}
