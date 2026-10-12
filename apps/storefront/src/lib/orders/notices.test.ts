import { ORDER_STATUSES } from "@dropship/core";
import { describe, expect, it } from "vitest";
import { noticeForStatus } from "./notices";

describe("noticeForStatus", () => {
  it("has a deliberate answer for every status", () => {
    for (const status of ORDER_STATUSES) {
      // null (nothing to say) is an answer; undefined would mean a status was forgotten
      expect(noticeForStatus(status, undefined), status).not.toBeUndefined();
    }
  });

  it("says nothing while an order is simply moving along", () => {
    for (const status of ["paid", "supplier_pending", "supplier_ordered", "shipped"] as const) {
      expect(noticeForStatus(status, undefined), status).toBeNull();
    }
  });

  it("apologises when an order is late", () => {
    expect(noticeForStatus("delivery_overdue", undefined)).toMatchObject({
      tone: "warning",
      title: expect.stringContaining("longer than we promised"),
    });
  });

  it("explains problems without exposing supplier detail", () => {
    for (const status of ["supplier_failed", "out_of_stock", "address_issue"] as const) {
      const notice = noticeForStatus(status, undefined);

      expect(notice?.tone).toBe("warning");
      expect(JSON.stringify(notice).toLowerCase()).not.toContain("supplier");
    }
  });

  it("tells the customer when they were not charged", () => {
    expect(noticeForStatus("cancelled", undefined)?.body).toContain("haven’t been charged");
    expect(noticeForStatus("pending_payment", undefined)?.body).toContain("haven’t been charged");
  });

  it("gives the delivery date when there is one", () => {
    expect(noticeForStatus("delivered", "Mon 19 Oct")?.title).toBe("Delivered on Mon 19 Oct");
    expect(noticeForStatus("delivered", undefined)?.title).toBe("Delivered");
  });

  it("says refunds take a few days to show", () => {
    expect(noticeForStatus("refunded", undefined)?.body).toContain("5 to 10 working days");
  });
});
