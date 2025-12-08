import {
  CreditsTransType,
  increaseCredits,
  updateCreditForOrder,
} from "./credit";
import {
  findOrderByOrderNo,
  OrderStatus,
  updateOrderStatus,
} from "@/models/order";
import { getIsoTimestr } from "@/lib/time";

import Stripe from "stripe";
import { updateAffiliateForOrder } from "./affiliate";
import { Order } from "@/types/order";
import { sendOrderConfirmationEmail } from "./email";

export async function handleOrderSession(session: Stripe.Checkout.Session) {
  try {
    if (
      !session ||
      !session.metadata ||
      !session.metadata.order_no ||
      session.payment_status !== "paid"
    ) {
      throw new Error("invalid session");
    }

    const order_no = session.metadata.order_no;
    const paid_email =
      session.customer_details?.email || session.customer_email || "";
    const paid_detail = JSON.stringify(session);

    const order = await findOrderByOrderNo(order_no);
    if (!order || order.status !== OrderStatus.Created) {
      throw new Error("invalid order");
    }

    const paid_at = getIsoTimestr();
    await updateOrderStatus(
      order_no,
      OrderStatus.Paid,
      paid_at,
      paid_email,
      paid_detail
    );

    if (order.user_uuid) {
      if (order.credits > 0) {
        // increase credits for paied order
        await updateCreditForOrder(order as unknown as Order);
      }

      // update affiliate for paied order
      await updateAffiliateForOrder(order as unknown as Order);
    }

    // 发送订单确认邮件（不影响主流程）
    if (paid_email) {
      try {
        await sendOrderConfirmationEmail({
          order: order as unknown as Order,
          customerEmail: paid_email,
        });
      } catch (e) {
        console.log("send order confirmation email failed: ", e);
      }
    }

    console.log(
      "handle order session successed: ",
      order_no,
      paid_at,
      paid_email,
      paid_detail
    );
  } catch (e) {
    console.log("handle order session failed: ", e);
    throw e;
  }
}
