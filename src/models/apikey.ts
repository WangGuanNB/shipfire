import { apikeys } from "@/db/schema";
import { db } from "@/db";
import { and, eq, ne } from "drizzle-orm";
import { desc } from "drizzle-orm";

export enum ApikeyStatus {
  Created = "created",
  Deleted = "deleted",
}

export async function insertApikey(
  data: typeof apikeys.$inferInsert
): Promise<typeof apikeys.$inferSelect | undefined> {
  // 🔥 D1 不支持 .returning()，需要先插入再查询
  const result = await db().insert(apikeys).values(data);

  // 使用 lastInsertRowid 查询刚插入的记录
  const [apikey] = await db()
    .select()
    .from(apikeys)
    .where(eq(apikeys.id, result.lastInsertRowid))
    .limit(1);

  return apikey;
}

export async function getUserApikeys(
  user_uuid: string,
  page: number = 1,
  limit: number = 50
): Promise<(typeof apikeys.$inferSelect)[] | undefined> {
  const offset = (page - 1) * limit;

  const data = await db()
    .select()
    .from(apikeys)
    .where(
      and(
        eq(apikeys.user_uuid, user_uuid),
        ne(apikeys.status, ApikeyStatus.Deleted)
      )
    )
    .orderBy(desc(apikeys.created_at))
    .limit(limit)
    .offset(offset);

  return data;
}

export async function getUserUuidByApiKey(
  apiKey: string
): Promise<string | undefined> {
  const [apikey] = await db()
    .select()
    .from(apikeys)
    .where(
      and(eq(apikeys.api_key, apiKey), eq(apikeys.status, ApikeyStatus.Created))
    )
    .limit(1);

  return apikey?.user_uuid;
}
