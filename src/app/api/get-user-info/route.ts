import { respData, respErr, respJson } from "@/lib/resp";

import { findUserByUuid } from "@/models/user";
import { getUserUuid } from "@/services/user";
import { getUserCredits } from "@/services/credit";
import { User } from "@/types/user";

export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respJson(-2, "no auth");
    }

    const dbUser = await findUserByUuid(user_uuid);
    if (!dbUser) {
      return respErr("user not exist");
    }

    const userCredits = await getUserCredits(user_uuid);

    // 🔒 只返回必要的用户字段，避免泄露敏感信息
    const user = {
      uuid: dbUser.uuid,
      email: dbUser.email,
      nickname: dbUser.nickname,
      avatar_url: dbUser.avatar_url,
      locale: dbUser.locale,
      invite_code: dbUser.invite_code,
      created_at: dbUser.created_at,
      is_affiliate: dbUser.is_affiliate,
      credits: userCredits,
    };

    return respData(user);
  } catch (e) {
    console.log("get user info failed: ", e);
    return respErr("get user info failed");
  }
}
