import {
  AffiliateRewardAmount,
  AffiliateRewardPercent,
  AffiliateStatus,
} from "@/services/constant";
import {
  findUserByInviteCode,
  findUserByUuid,
  updateUserInvitedBy,
} from "@/models/user";
import { respData, respErr } from "@/lib/resp";

import { getIsoTimestr } from "@/lib/time";
import { insertAffiliate } from "@/models/affiliate";
import { getUserUuid } from "@/services/user";

export async function POST(req: Request) {
  try {
    const { invite_code } = await req.json();
    if (!invite_code) {
      return respErr("invalid params");
    }

    // 🔒 获取当前登录用户的 UUID
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("no auth");
    }

    // check invite user
    const inviteUser = await findUserByInviteCode(invite_code);
    if (!inviteUser) {
      return respErr("invite user not found");
    }

    // check current user
    const user = await findUserByUuid(user_uuid);
    if (!user) {
      return respErr("user not found");
    }

    if (user.uuid === inviteUser.uuid || user.email === inviteUser.email) {
      return respErr("can't invite yourself");
    }

    if (user.invited_by) {
      return respErr("user already has invite user");
    }

    user.invited_by = inviteUser.uuid;

    // update invite user uuid
    await updateUserInvitedBy(user_uuid, inviteUser.uuid);

    await insertAffiliate({
      user_uuid: user_uuid,
      invited_by: inviteUser.uuid,
      created_at: new Date(),
      status: AffiliateStatus.Pending,
      paid_order_no: "",
      paid_amount: 0,
      reward_percent: AffiliateRewardPercent.Invited,
      reward_amount: AffiliateRewardAmount.Invited,
    });

    // 🔒 只返回必要的用户字段，避免泄露敏感信息
    const safeUser = {
      uuid: user.uuid,
      email: user.email,
      nickname: user.nickname,
      avatar_url: user.avatar_url,
      locale: user.locale,
      invite_code: user.invite_code,
      invited_by: user.invited_by,
      is_affiliate: user.is_affiliate,
    };

    return respData(safeUser);
  } catch (e) {
    console.error("update invited by failed: ", e);
    return respErr("update invited by failed");
  }
}
