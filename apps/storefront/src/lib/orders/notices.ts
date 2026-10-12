import type { OrderStatus } from "@dropship/core";

// The sentence at the top of an order page that says, in plain words, where things stand when the
// answer isn't just "moving along". Pure, so every state is tested.

export type OrderNotice = {
  tone: "info" | "good" | "warning";
  title: string;
  body: string;
};

export const noticeForStatus = (
  status: OrderStatus,
  deliveredOn: string | undefined,
): OrderNotice | null => {
  switch (status) {
    case "pending_payment":
      return {
        tone: "warning",
        title: "We haven’t received your payment yet",
        body: "If you’ve just paid, this page will update in a moment. If you left before finishing, you haven’t been charged.",
      };
    case "delivery_overdue":
      return {
        tone: "warning",
        title: "Your order is taking longer than we promised",
        body: "We’re sorry. We’re chasing the courier and will email you as soon as we have news. You can reply to any of our emails if you’d like to talk to us.",
      };
    case "supplier_failed":
    case "out_of_stock":
    case "address_issue":
      return {
        tone: "warning",
        title: "We’re sorting something out with your order",
        body: "There’s a small problem we need to fix. We’ll email you shortly with what happens next, and you won’t be charged for anything you don’t receive.",
      };
    case "refund_requested":
      return {
        tone: "info",
        title: "Your refund request is with us",
        body: "We’ll email you as soon as it has been looked at.",
      };
    case "disputed":
      return {
        tone: "info",
        title: "Your order is being reviewed",
        body: "We’re looking into a question about this payment and will be in touch if we need anything from you.",
      };
    case "refunded":
      return {
        tone: "info",
        title: "This order has been refunded",
        body: "The money goes back to the card you paid with. It can take 5 to 10 working days to show in your account.",
      };
    case "cancelled":
      return {
        tone: "info",
        title: "This order was cancelled",
        body: "You haven’t been charged. Your items are still in the shop if you’d like to try again.",
      };
    case "delivered":
      return {
        tone: "good",
        title: deliveredOn ? `Delivered on ${deliveredOn}` : "Delivered",
        body: "We hope they love it. If anything isn’t right, get in touch and we’ll put it right.",
      };
    case "paid":
    case "supplier_pending":
    case "supplier_ordered":
    case "shipped":
      return null;
  }
};
