// The life of an order. This table is the single description of which moves are allowed; the
// database enforces the same table (order_status_transitions), and a test compares the two so they
// cannot drift apart.

export const ORDER_STATUSES = [
  "pending_payment",
  "paid",
  "supplier_pending",
  "supplier_ordered",
  "shipped",
  "delivered",
  "cancelled",
  // exception states: each raises an alert and appears in the exceptions inbox (Phase 4)
  "supplier_failed",
  "out_of_stock",
  "address_issue",
  "refund_requested",
  "refunded",
  "disputed",
  "delivery_overdue",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["supplier_pending", "address_issue", "refund_requested", "refunded"],
  supplier_pending: [
    "supplier_ordered",
    "supplier_failed",
    "out_of_stock",
    "address_issue",
    "refund_requested",
  ],
  supplier_ordered: ["shipped", "supplier_failed", "out_of_stock", "refund_requested"],
  shipped: ["delivered", "delivery_overdue", "refund_requested", "disputed"],
  delivery_overdue: ["delivered", "refund_requested", "disputed"],
  delivered: ["refund_requested", "disputed"],
  supplier_failed: ["supplier_pending", "refund_requested", "refunded"],
  out_of_stock: ["supplier_pending", "refund_requested", "refunded"],
  address_issue: ["supplier_pending", "refund_requested", "refunded"],
  // a request that is declined or withdrawn goes back to where the order was
  refund_requested: [
    "refunded",
    "supplier_pending",
    "supplier_ordered",
    "shipped",
    "delivery_overdue",
    "delivered",
  ],
  disputed: ["refunded", "delivered"],
  refunded: [],
  cancelled: [],
};

export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean =>
  ORDER_TRANSITIONS[from].includes(to);

// A status after which nothing more can happen to the order.
export const isFinalStatus = (status: OrderStatus): boolean =>
  ORDER_TRANSITIONS[status].length === 0;

// What a customer sees. The internal states are finer than a customer needs: anything that is
// going wrong becomes "attention", and the email or status page explains next steps in words.
export type CustomerStage =
  | "awaiting_payment"
  | "preparing"
  | "on_its_way"
  | "delivered"
  | "attention"
  | "refunded"
  | "cancelled";

const CUSTOMER_STAGES: Readonly<Record<OrderStatus, CustomerStage>> = {
  pending_payment: "awaiting_payment",
  paid: "preparing",
  supplier_pending: "preparing",
  supplier_ordered: "preparing",
  shipped: "on_its_way",
  delivery_overdue: "on_its_way",
  delivered: "delivered",
  supplier_failed: "attention",
  out_of_stock: "attention",
  address_issue: "attention",
  refund_requested: "attention",
  disputed: "attention",
  refunded: "refunded",
  cancelled: "cancelled",
};

export const customerStageOf = (status: OrderStatus): CustomerStage => CUSTOMER_STAGES[status];

// The emails that follow from a change of status. The database queues them in the same
// transaction as the change, so an order can never be paid without its confirmation being queued.
export const EMAIL_KINDS = ["order_confirmation", "order_shipped", "order_delivered"] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

export const isEmailKind = (value: unknown): value is EmailKind =>
  typeof value === "string" && (EMAIL_KINDS as readonly string[]).includes(value);

export const emailForStatus = (status: OrderStatus): EmailKind | undefined => {
  if (status === "paid") {
    return "order_confirmation";
  }
  if (status === "shipped") {
    return "order_shipped";
  }
  if (status === "delivered") {
    return "order_delivered";
  }
  return undefined;
};
