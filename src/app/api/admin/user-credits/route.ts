import { respData, respErr } from "@/lib/resp";
import {
  adminAdjustCreditsToTarget,
  getUserRawLeftCredits,
} from "@/services/credit";
import { getUserInfo } from "@/services/user";
import { findUserByUuid } from "@/models/user";

function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const list =
    process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim()) ?? [];
  return list.includes(email);
}

export async function POST(req: Request) {
  try {
    const actor = await getUserInfo();
    if (!actor?.email || !isAdminEmail(actor.email)) {
      return respErr("forbidden");
    }

    const body = await req.json();
    const user_uuid = typeof body.user_uuid === "string" ? body.user_uuid.trim() : "";
    if (!user_uuid) {
      return respErr("user_uuid required");
    }

    const user = await findUserByUuid(user_uuid);
    if (!user) {
      return respErr("user not found");
    }

    const action = body.action === "set" ? "set" : "get";

    if (action === "get") {
      const raw_left_credits = await getUserRawLeftCredits(user_uuid);
      return respData({ raw_left_credits });
    }

    const target = body.target;
    if (target === undefined || target === null) {
      return respErr("target required");
    }

    const result = await adminAdjustCreditsToTarget(user_uuid, target);
    return respData({
      raw_left_credits: result.newBalance,
      previous: result.previous,
      delta: result.delta,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "failed";
    console.log("admin user-credits failed: ", e);
    return respErr(msg);
  }
}
