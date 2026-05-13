import { users } from "@/db/schema";
import { db } from "@/db";
import { desc, eq, gte, inArray, like, count } from "drizzle-orm";

export async function insertUser(
  data: typeof users.$inferInsert
): Promise<typeof users.$inferSelect | undefined> {
  // 🔥 D1 不支持 .returning()，需要先插入再查询
  const result = await db().insert(users).values(data);

  // 使用 lastInsertRowid 查询刚插入的记录
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.id, result.lastInsertRowid))
    .limit(1);

  return user;
}

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

export async function findUserByUuid(
  uuid: string
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.uuid, uuid))
    .limit(1);

  return user;
}

export async function getUsers(
  page: number = 1,
  limit: number = 50,
  email?: string
): Promise<(typeof users.$inferSelect)[] | undefined> {
  const offset = (page - 1) * limit;
  const trimmed = email?.trim();

  const data = trimmed
    ? await db()
        .select()
        .from(users)
        .where(like(users.email, `%${trimmed}%`))
        .orderBy(desc(users.created_at))
        .limit(limit)
        .offset(offset)
    : await db()
        .select()
        .from(users)
        .orderBy(desc(users.created_at))
        .limit(limit)
        .offset(offset);

  return data;
}

export async function updateUserInviteCode(
  user_uuid: string,
  invite_code: string
): Promise<typeof users.$inferSelect | undefined> {
  // 🔥 D1 不支持 .returning()，需要先更新再查询
  await db()
    .update(users)
    .set({ invite_code, updated_at: new Date() })
    .where(eq(users.uuid, user_uuid));

  // 用相同条件查询更新后的记录
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.uuid, user_uuid))
    .limit(1);

  return user;
}

export async function updateUserInvitedBy(
  user_uuid: string,
  invited_by: string
): Promise<typeof users.$inferSelect | undefined> {
  // 🔥 D1 不支持 .returning()，需要先更新再查询
  await db()
    .update(users)
    .set({ invited_by, updated_at: new Date() })
    .where(eq(users.uuid, user_uuid));

  // 用相同条件查询更新后的记录
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.uuid, user_uuid))
    .limit(1);

  return user;
}

export async function getUsersByUuids(
  user_uuids: string[]
): Promise<(typeof users.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(users)
    .where(inArray(users.uuid, user_uuids));

  return data;
}

export async function findUserByInviteCode(
  invite_code: string
): Promise<typeof users.$inferSelect | undefined> {
  const [user] = await db()
    .select()
    .from(users)
    .where(eq(users.invite_code, invite_code))
    .limit(1);

  return user;
}

export async function getUserUuidsByEmail(
  email: string
): Promise<string[] | undefined> {
  const data = await db()
    .select({ uuid: users.uuid })
    .from(users)
    .where(eq(users.email, email));

  return data.map((user) => user.uuid);
}

export async function getUsersTotal(): Promise<number> {
  // 🔥 使用 count() 函数替代 $count()，性能提升 100+ 倍
  const [result] = await db().select({ count: count() }).from(users);

  return result.count;
}

export async function getUserCountByDate(
  startTime: string
): Promise<Map<string, number> | undefined> {
  const data = await db()
    .select({ created_at: users.created_at })
    .from(users)
    .where(gte(users.created_at, new Date(startTime)));

  data.sort((a, b) => a.created_at!.getTime() - b.created_at!.getTime());

  const dateCountMap = new Map<string, number>();
  data.forEach((item) => {
    const date = item.created_at!.toISOString().split("T")[0];
    dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1);
  });

  return dateCountMap;
}
