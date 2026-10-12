import { describe, expect, it } from "vitest";
import {
  canTransition,
  customerStageOf,
  emailForStatus,
  isEmailKind,
  isFinalStatus,
  isOrderStatus,
  ORDER_STATUSES,
  ORDER_TRANSITIONS,
} from "./order-status";

describe("order transitions", () => {
  it("describes every status, and only real ones", () => {
    expect(Object.keys(ORDER_TRANSITIONS).sort()).toEqual([...ORDER_STATUSES].sort());
    for (const targets of Object.values(ORDER_TRANSITIONS)) {
      for (const target of targets) {
        expect(ORDER_STATUSES).toContain(target);
      }
    }
  });

  it("follows the happy path from payment to delivery", () => {
    const path = [
      "pending_payment",
      "paid",
      "supplier_pending",
      "supplier_ordered",
      "shipped",
      "delivered",
    ] as const;
    for (let index = 0; index < path.length - 1; index += 1) {
      expect(canTransition(path[index]!, path[index + 1]!)).toBe(true);
    }
  });

  it("does not allow skipping steps or going backwards", () => {
    expect(canTransition("pending_payment", "shipped")).toBe(false);
    expect(canTransition("paid", "shipped")).toBe(false);
    expect(canTransition("paid", "delivered")).toBe(false);
    expect(canTransition("delivered", "paid")).toBe(false);
    expect(canTransition("shipped", "supplier_pending")).toBe(false);
  });

  it("never moves to itself, so replaying a change is a no-op for the caller to handle", () => {
    for (const status of ORDER_STATUSES) {
      expect(canTransition(status, status)).toBe(false);
    }
  });

  it("ends at refunded and cancelled", () => {
    expect(isFinalStatus("refunded")).toBe(true);
    expect(isFinalStatus("cancelled")).toBe(true);
    expect(isFinalStatus("delivered")).toBe(false);
  });

  it("lets every status other than the final ones reach a refund", () => {
    const stuck = ORDER_STATUSES.filter((status) => {
      if (isFinalStatus(status) || status === "pending_payment") {
        return false;
      }
      const targets = ORDER_TRANSITIONS[status];
      return !targets.includes("refunded") && !targets.includes("refund_requested");
    });
    // disputed resolves through the dispute outcome instead
    expect(stuck).toEqual([]);
  });

  it("recognises status names", () => {
    expect(isOrderStatus("paid")).toBe(true);
    expect(isOrderStatus("PAID")).toBe(false);
    expect(isOrderStatus(undefined)).toBe(false);
  });
});

describe("what customers see", () => {
  it("maps every status to a stage", () => {
    for (const status of ORDER_STATUSES) {
      expect(customerStageOf(status)).toBeTruthy();
    }
  });

  it("keeps supplier-side detail out of sight", () => {
    expect(customerStageOf("supplier_pending")).toBe("preparing");
    expect(customerStageOf("supplier_ordered")).toBe("preparing");
    expect(customerStageOf("supplier_failed")).toBe("attention");
    expect(customerStageOf("delivery_overdue")).toBe("on_its_way");
  });
});

describe("emails", () => {
  it("recognises email kinds", () => {
    expect(isEmailKind("order_shipped")).toBe(true);
    expect(isEmailKind("order_refunded")).toBe(false);
    expect(isEmailKind(undefined)).toBe(false);
  });

  it("sends one email for each milestone and none for the rest", () => {
    expect(emailForStatus("paid")).toBe("order_confirmation");
    expect(emailForStatus("shipped")).toBe("order_shipped");
    expect(emailForStatus("delivered")).toBe("order_delivered");
    expect(emailForStatus("supplier_pending")).toBeUndefined();
    expect(emailForStatus("pending_payment")).toBeUndefined();
  });
});
