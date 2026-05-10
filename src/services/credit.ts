import {
  findCreditByOrderNo,
  getUserValidCredits,
  insertCredit,
} from "@/models/credit";
import { credits as creditsTable } from "@/db/schema";
import { getIsoTimestr } from "@/lib/time";
import { getSnowId } from "@/lib/hash";
import { Order } from "@/types/order";
import { UserCredits } from "@/types/user";

export class InsufficientCreditsError extends Error {
  constructor(public available: number, public required: number) {
    super("insufficient credits");
    this.name = "InsufficientCreditsError";
  }
}
import { getFirstPaidOrderByUserUuid } from "@/models/order";

export enum CreditsTransType {
  NewUser = "new_user",
  OrderPay = "order_pay",
  SystemAdd = "system_add",
  Ping = "ping",
  ImageGen = "image_gen",
  SubscriptionRenew = "subscription_renew", // 订阅自动续费发放积分
  /** 管理员按目标余额调整（单条流水，delta 可正可负，允许余额为负） */
  AdminAdjust = "admin_adjust",
}

export enum CreditsAmount {
  NewUserGet = 10,
  PingCost = 1,
}

/** 未过期流水之和（不钳位，可为负） */
export async function getUserRawLeftCredits(user_uuid: string): Promise<number> {
  let sum = 0;
  const rows = await getUserValidCredits(user_uuid);
  if (rows) {
    for (const r of rows) {
      sum += r.credits ?? 0;
    }
  }
  return sum;
}

/**
 * 将用户「当前未过期积分之和」调整到 target（插入一条 admin_adjust 流水；允许结果为负）。
 */
export async function adminAdjustCreditsToTarget(
  user_uuid: string,
  target: number
): Promise<{ previous: number; delta: number; newBalance: number }> {
  const t = Math.round(Number(target));
  if (!Number.isFinite(t)) {
    throw new Error("invalid target");
  }
  const previous = await getUserRawLeftCredits(user_uuid);
  const delta = t - previous;
  if (delta === 0) {
    return { previous, delta: 0, newBalance: previous };
  }

  const new_credit: typeof creditsTable.$inferInsert = {
    trans_no: getSnowId(),
    created_at: new Date(getIsoTimestr()),
    user_uuid,
    trans_type: CreditsTransType.AdminAdjust,
    credits: delta,
    order_no: "",
    expired_at: null,
  };
  await insertCredit(new_credit);

  return { previous, delta, newBalance: previous + delta };
}

export async function getUserCredits(user_uuid: string): Promise<UserCredits> {
  let user_credits: UserCredits = {
    left_credits: 0,
  };

  try {
    const first_paid_order = await getFirstPaidOrderByUserUuid(user_uuid);
    if (first_paid_order) {
      user_credits.is_recharged = true;
    }

    const credits = await getUserValidCredits(user_uuid);
    if (credits) {
      credits.forEach((v) => {
        user_credits.left_credits += v.credits || 0;
      });
    }

    if (user_credits.left_credits < 0) {
      user_credits.left_credits = 0;
    }

    if (user_credits.left_credits > 0) {
      user_credits.is_pro = true;
    }

    return user_credits;
  } catch (e) {
    console.log("get user credits failed: ", e);
    return user_credits;
  }
}

export async function decreaseCredits({
  user_uuid,
  trans_type,
  credits,
}: {
  user_uuid: string;
  trans_type: CreditsTransType;
  credits: number;
}) {
  try {
    let order_no = "";
    let expired_at = "";
    let left_credits = 0;

    const userCredits = await getUserValidCredits(user_uuid);
    if (userCredits) {
      for (let i = 0, l = userCredits.length; i < l; i++) {
        const credit = userCredits[i];
        left_credits += credit.credits;

        // credit enough for cost
        if (left_credits >= credits) {
          order_no = credit.order_no || "";
          expired_at = credit.expired_at?.toISOString() || "";
          break;
        }

        // look for next credit
      }
    }

    if (left_credits < credits) {
      throw new InsufficientCreditsError(left_credits, credits);
    }

    const new_credit: typeof creditsTable.$inferInsert = {
      trans_no: getSnowId(),
      created_at: new Date(getIsoTimestr()),
      expired_at: expired_at ? new Date(expired_at) : null,
      user_uuid: user_uuid,
      trans_type: trans_type,
      credits: 0 - credits,
      order_no: order_no,
    };
    await insertCredit(new_credit);
  } catch (e) {
    console.log("decrease credits failed: ", e);
    throw e;
  }
}

export async function increaseCredits({
  user_uuid,
  trans_type,
  credits,
  expired_at,
  order_no,
}: {
  user_uuid: string;
  trans_type: string;
  credits: number;
  expired_at?: string;
  order_no?: string;
}) {
  try {
    const new_credit: typeof creditsTable.$inferInsert = {
      trans_no: getSnowId(),
      created_at: new Date(getIsoTimestr()),
      user_uuid: user_uuid,
      trans_type: trans_type,
      credits: credits,
      order_no: order_no || "",
      expired_at: expired_at ? new Date(expired_at) : null,
    };
    await insertCredit(new_credit);
  } catch (e) {
    console.log("increase credits failed: ", e);
    throw e;
  }
}

/**
 * 订阅续费时发放新周期积分
 * 旧积分通过 expired_at 自然过期，无需手动清零；
 * 本函数只需插入新一期的积分记录即可实现"重置"语义。
 */
export async function resetCreditsForRenewal({
  user_uuid,
  credits,
  expired_at,
  order_no,
}: {
  user_uuid: string;
  credits: number;
  expired_at: string;
  order_no: string;
}) {
  await increaseCredits({
    user_uuid,
    trans_type: CreditsTransType.SubscriptionRenew,
    credits,
    expired_at,
    order_no,
  });
}

export async function updateCreditForOrder(order: Order) {
  try {
    const credit = await findCreditByOrderNo(order.order_no);
    if (credit) {
      // order already increased credit
      return;
    }

    await increaseCredits({
      user_uuid: order.user_uuid,
      trans_type: CreditsTransType.OrderPay,
      credits: order.credits,
      expired_at: order.expired_at,
      order_no: order.order_no,
    });
  } catch (e) {
    console.log("update credit for order failed: ", e);
    throw e;
  }
}
