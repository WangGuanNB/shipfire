import { credits, users } from "@/db/schema";
import { db } from "@/db";
import { desc, eq, and, gte, asc, or, isNull, like } from "drizzle-orm";

/** Admin credits ledger row (matches DB columns + joined email). */
export type AdminCreditLedgerRow = {
  id: number;
  trans_no: string;
  created_at: Date | null;
  trans_type: string;
  credits: number;
  order_no: string | null;
  user_uuid: string;
  user_email: string | null;
  expired_at: Date | null;
};

export async function insertCredit(
  data: typeof credits.$inferInsert
): Promise<typeof credits.$inferSelect | undefined> {
  const [credit] = await db().insert(credits).values(data).returning();

  return credit;
}

export async function findCreditByTransNo(
  trans_no: string
): Promise<typeof credits.$inferSelect | undefined> {
  const [credit] = await db()
    .select()
    .from(credits)
    .where(eq(credits.trans_no, trans_no))
    .limit(1);

  return credit;
}

export async function findCreditByOrderNo(
  order_no: string
): Promise<typeof credits.$inferSelect | undefined> {
  const [credit] = await db()
    .select()
    .from(credits)
    .where(eq(credits.order_no, order_no))
    .limit(1);

  return credit;
}

export async function getUserValidCredits(
  user_uuid: string
): Promise<(typeof credits.$inferSelect)[] | undefined> {
  const now = new Date();
  const data = await db()
    .select()
    .from(credits)
    .where(
      and(
        // 包含未过期的积分：expired_at 为 null（永不过期）或 expired_at >= 当前时间
        or(isNull(credits.expired_at), gte(credits.expired_at, now)),
        eq(credits.user_uuid, user_uuid)
      )
    )
    .orderBy(asc(credits.expired_at));

  return data;
}

export async function getCreditsByUserUuid(
  user_uuid: string,
  page: number = 1,
  limit: number = 50
): Promise<(typeof credits.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(credits)
    .where(eq(credits.user_uuid, user_uuid))
    .orderBy(desc(credits.created_at))
    .limit(limit)
    .offset((page - 1) * limit);

  return data;
}

/**
 * Admin: full credits ledger for Studio-like listing (all trans types, any sign).
 * Requires non-empty email (substring match on users.email); caller should skip when empty.
 */
export async function getAdminCreditLedgerByEmail(
  page: number = 1,
  limit: number = 500,
  email: string
): Promise<AdminCreditLedgerRow[] | undefined> {
  const trimmed = email.trim();
  if (!trimmed) {
    return [];
  }

  const offset = (page - 1) * limit;

  const data = await db()
    .select({
      id: credits.id,
      trans_no: credits.trans_no,
      created_at: credits.created_at,
      trans_type: credits.trans_type,
      credits: credits.credits,
      order_no: credits.order_no,
      user_uuid: credits.user_uuid,
      user_email: users.email,
      expired_at: credits.expired_at,
    })
    .from(credits)
    .leftJoin(users, eq(credits.user_uuid, users.uuid))
    .where(like(users.email, `%${trimmed}%`))
    .orderBy(desc(credits.created_at))
    .limit(limit)
    .offset(offset);

  return data;
}
