import { orders } from "@/db/schema";
import { db } from "@/db";
import { and, asc, desc, eq, gte, like, lte, or, count, type SQL } from "drizzle-orm";

export enum OrderStatus {
  Created = "created",
  Paid = "paid",
  Deleted = "deleted",
}

export async function insertOrder(data: typeof orders.$inferInsert) {
  // 🔥 D1 不支持 .returning()，需要先插入再查询
  const result = await db().insert(orders).values(data);

  // 使用 lastInsertRowid 查询刚插入的记录
  const [order] = await db()
    .select()
    .from(orders)
    .where(eq(orders.id, result.lastInsertRowid))
    .limit(1);

  return order;
}

export async function findOrderByOrderNo(
  order_no: string
): Promise<typeof orders.$inferSelect | undefined> {
  const [order] = await db()
    .select()
    .from(orders)
    .where(eq(orders.order_no, order_no))
    .limit(1);

  return order;
}

export async function getFirstPaidOrderByUserUuid(
  user_uuid: string
): Promise<typeof orders.$inferSelect | undefined> {
  const [order] = await db()
    .select()
    .from(orders)
    .where(
      and(eq(orders.user_uuid, user_uuid), eq(orders.status, OrderStatus.Paid))
    )
    .orderBy(asc(orders.created_at))
    .limit(1);

  return order;
}

export async function getFirstPaidOrderByUserEmail(
  user_email: string
): Promise<typeof orders.$inferSelect | undefined> {
  const [order] = await db()
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.user_email, user_email),
        eq(orders.status, OrderStatus.Paid)
      )
    )
    .orderBy(desc(orders.created_at))
    .limit(1);

  return order;
}

export async function updateOrderStatus(
  order_no: string,
  status: string,
  paid_at: string,
  paid_email: string,
  paid_detail: string
) {
  // 🔥 D1 不支持 .returning()，需要先更新再查询
  await db()
    .update(orders)
    .set({ status, paid_at: new Date(paid_at), paid_detail, paid_email })
    .where(eq(orders.order_no, order_no));

  // 用相同条件查询更新后的记录
  const [order] = await db()
    .select()
    .from(orders)
    .where(eq(orders.order_no, order_no))
    .limit(1);

  return order;
}

export async function updateOrderSession(
  order_no: string,
  stripe_session_id: string,
  order_detail: string
) {
  // 🔥 D1 不支持 .returning()，需要先更新再查询
  await db()
    .update(orders)
    .set({ stripe_session_id, order_detail })
    .where(eq(orders.order_no, order_no));

  // 用相同条件查询更新后的记录
  const [order] = await db()
    .select()
    .from(orders)
    .where(eq(orders.order_no, order_no))
    .limit(1);

  return order;
}

export async function updateOrderSubscription(
  order_no: string,
  sub_id: string,
  sub_interval_count: number,
  sub_cycle_anchor: number,
  sub_period_end: number,
  sub_period_start: number,
  status: string,
  paid_at: string,
  sub_times: number,
  paid_email: string,
  paid_detail: string
) {
  // 🔥 D1 不支持 .returning()，需要先更新再查询
  await db()
    .update(orders)
    .set({
      sub_id,
      sub_interval_count,
      sub_cycle_anchor,
      sub_period_end,
      sub_period_start,
      status,
      paid_at: new Date(paid_at),
      sub_times,
      paid_email,
      paid_detail,
    })
    .where(eq(orders.order_no, order_no));

  // 用相同条件查询更新后的记录
  const [order] = await db()
    .select()
    .from(orders)
    .where(eq(orders.order_no, order_no))
    .limit(1);

  return order;
}

export async function getOrdersByUserUuid(
  user_uuid: string
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(
      and(eq(orders.user_uuid, user_uuid), eq(orders.status, OrderStatus.Paid))
    )
    .orderBy(desc(orders.created_at));

  return data;
}

/**
 * 获取用户的所有订单（包括未支付的，用于调试）
 */
export async function getAllOrdersByUserUuid(
  user_uuid: string
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(eq(orders.user_uuid, user_uuid))
    .orderBy(desc(orders.created_at));

  return data;
}

export async function getOrdersByUserEmail(
  user_email: string
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.user_email, user_email),
        eq(orders.status, OrderStatus.Paid)
      )
    )
    .orderBy(desc(orders.created_at));

  return data;
}

export async function getOrdersByPaidEmail(
  paid_email: string
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.paid_email, paid_email),
        eq(orders.status, OrderStatus.Paid)
      )
    )
    .orderBy(desc(orders.created_at));

  return data;
}

/**
 * 获取通过邮箱支付的所有订单（包括未支付的，用于调试）
 */
export async function getAllOrdersByPaidEmail(
  paid_email: string
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(eq(orders.paid_email, paid_email))
    .orderBy(desc(orders.created_at));

  return data;
}

/**
 * 获取通过用户邮箱创建的所有订单（包括未支付的，用于调试）
 */
export async function getAllOrdersByUserEmail(
  user_email: string
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(eq(orders.user_email, user_email))
    .orderBy(desc(orders.created_at));

  return data;
}

export async function getPaiedOrders(
  page: number,
  limit: number
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  const data = await db()
    .select()
    .from(orders)
    .where(eq(orders.status, OrderStatus.Paid))
    .orderBy(desc(orders.created_at))
    .limit(limit)
    .offset((page - 1) * limit);

  return data;
}

export type AdminOrderFilters = {
  email?: string;
  status?: string;
  pay_type?: string;
  product_name?: string;
  /** Inclusive start, `YYYY-MM-DD` (UTC midnight). */
  created_from?: string;
  /** Inclusive end, `YYYY-MM-DD` (UTC end of day). */
  created_to?: string;
};

export function hasAdminOrderFilters(f: AdminOrderFilters): boolean {
  return !!(
    f.email?.trim() ||
    f.status?.trim() ||
    f.pay_type?.trim() ||
    f.product_name?.trim() ||
    f.created_from?.trim() ||
    f.created_to?.trim()
  );
}

/**
 * Admin: orders matching all provided filters (AND). Caller should only invoke when
 * {@link hasAdminOrderFilters} is true; otherwise returns [] without querying.
 */
export async function getAdminOrdersFiltered(
  page: number,
  limit: number,
  filters: AdminOrderFilters
): Promise<(typeof orders.$inferSelect)[] | undefined> {
  if (!hasAdminOrderFilters(filters)) {
    return [];
  }

  const offset = (page - 1) * limit;
  const conds: SQL[] = [];

  const email = filters.email?.trim();
  if (email) {
    const emailCond = or(
      like(orders.user_email, `%${email}%`),
      like(orders.paid_email, `%${email}%`)
    );
    if (emailCond) {
      conds.push(emailCond);
    }
  }

  const status = filters.status?.trim();
  if (status) {
    conds.push(eq(orders.status, status));
  }

  const payType = filters.pay_type?.trim();
  if (payType) {
    conds.push(like(orders.pay_type, `%${payType}%`));
  }

  const productName = filters.product_name?.trim();
  if (productName) {
    conds.push(like(orders.product_name, `%${productName}%`));
  }

  const createdFrom = filters.created_from?.trim();
  if (createdFrom) {
    const from = new Date(`${createdFrom}T00:00:00.000Z`);
    if (!Number.isNaN(from.getTime())) {
      conds.push(gte(orders.created_at, from));
    }
  }

  const createdTo = filters.created_to?.trim();
  if (createdTo) {
    const to = new Date(`${createdTo}T23:59:59.999Z`);
    if (!Number.isNaN(to.getTime())) {
      conds.push(lte(orders.created_at, to));
    }
  }

  if (conds.length === 0) {
    return [];
  }

  const data = await db()
    .select()
    .from(orders)
    .where(and(...conds))
    .orderBy(desc(orders.created_at))
    .limit(limit)
    .offset(offset);

  return data;
}

export async function getPaidOrdersTotal(): Promise<number | undefined> {
  try {
    // 🔥 使用 count() 函数替代查询所有数据，性能提升 100+ 倍
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

export async function getOrderCountByDate(
  startTime: string,
  status?: string
): Promise<Map<string, number> | undefined> {
  try {
    const conditions = [gte(orders.created_at, new Date(startTime))];
    if (status) {
      conditions.push(eq(orders.status, status));
    }

    const data = await db()
      .select({ created_at: orders.created_at })
      .from(orders)
      .where(and(...conditions));

    data.sort((a, b) => a.created_at!.getTime() - b.created_at!.getTime());

    const dateCountMap = new Map<string, number>();
    data.forEach((item) => {
      const date = item.created_at!.toISOString().split("T")[0];
      dateCountMap.set(date, (dateCountMap.get(date) || 0) + 1);
    });

    return dateCountMap;
  } catch (e) {
    console.log("getOrderCountByDate failed: ", e);
    return undefined;
  }
}

/**
 * 通过 sub_id 查找订阅订单（用于续费时匹配原始订单）
 */
export async function findOrderBySubId(
  sub_id: string
): Promise<typeof orders.$inferSelect | undefined> {
  const [order] = await db()
    .select()
    .from(orders)
    .where(eq(orders.sub_id, sub_id))
    .limit(1);
  return order;
}

/**
 * 订阅续费：延长 expired_at 并更新周期信息
 */
export async function renewSubscriptionOrder(
  order_no: string,
  new_expired_at: Date,
  sub_period_end: number,
  sub_period_start: number,
  sub_times: number,
  paid_detail: string
) {
  // 🔥 D1 不支持 .returning()，需要先更新再查询
  await db()
    .update(orders)
    .set({
      expired_at: new_expired_at,
      sub_period_end,
      sub_period_start,
      sub_times,
      paid_detail,
    })
    .where(eq(orders.order_no, order_no));

  // 用相同条件查询更新后的记录
  const [order] = await db()
    .select()
    .from(orders)
    .where(eq(orders.order_no, order_no))
    .limit(1);

  return order;
}

/**
 * 通过邮箱和金额查找未支付的订单（用于 Creem 支付匹配）
 * @param user_email 用户邮箱（可能是 user_email 或 paid_email）
 * @param amount 订单金额（单位：分）
 */
export async function findOrderByEmailAndAmount(
  user_email: string,
  amount: number
): Promise<typeof orders.$inferSelect | undefined> {
  try {
    // 🔥 扩大时间窗口到 24 小时，因为用户可能不会立即支付
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // 🔥 允许金额有 ±1 的容差（处理可能的舍入误差）
    const amountMin = amount - 1;
    const amountMax = amount + 1;
    
    // 🔥 尝试匹配 user_email 或 paid_email
    const [order] = await db()
      .select()
      .from(orders)
      .where(
        and(
          // 邮箱匹配：user_email 或 paid_email
          or(
            eq(orders.user_email, user_email),
            eq(orders.paid_email, user_email)
          ),
          // 金额匹配：允许 ±1 的容差
          and(
            gte(orders.amount, amountMin),
            lte(orders.amount, amountMax)
          ),
          // 状态必须是 Created（未支付）
          eq(orders.status, OrderStatus.Created),
          // 订单创建时间在 24 小时内
          gte(orders.created_at, twentyFourHoursAgo)
        )
      )
      .orderBy(desc(orders.created_at))
      .limit(1);

    return order;
  } catch (e) {
    console.log("findOrderByEmailAndAmount failed: ", e);
    return undefined;
  }
}
