import type { PGlite, Transaction } from "@electric-sql/pglite";
import { emailForStatus, ORDER_STATUSES, ORDER_TRANSITIONS } from "@dropship/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestDatabase, ids, rowsAs, runAs, seedTwoStores, type Session } from "./testing";

let db: PGlite;
let variantA: string;
let variantB: string;

beforeAll(async () => {
  db = await createTestDatabase();
  await seedTwoStores(db);
  const rows = await db.query<{ id: string; sku: string }>(
    "select id, sku from public.variants where sku in ('A-BED-1', 'B-TREE-1')",
  );
  variantA = rows.rows.find((row) => row.sku === "A-BED-1")!.id;
  variantB = rows.rows.find((row) => row.sku === "B-TREE-1")!.id;
});

afterAll(async () => {
  await db.close();
});

const serverA: Session = { role: "storefront_server", storeId: ids.storeA };
const serverB: Session = { role: "storefront_server", storeId: ids.storeB };
const admin: Session = { role: "service_role" };

type Row = Record<string, unknown>;

const lineItem = (variantId: string, quantity = 1, unitPriceMinor = 2999) => ({
  variant_id: variantId,
  sku: "A-BED-1",
  title: "Dog bed",
  variant_title: "Medium",
  unit_price_minor: unitPriceMinor,
  quantity,
  line_total_minor: unitPriceMinor * quantity,
  image_path: null,
});

// A pending order for store A, made the way the storefront makes one.
const createOrder = async (
  tx: Transaction,
  overrides: Partial<{
    number: string;
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    items: unknown[];
  }> = {},
): Promise<string> => {
  const result = await tx.query<{ id: string }>(
    "select public.create_order($1, 'GBP', $2, $3, $4, $5, $6::jsonb) as id",
    [
      overrides.number ?? "AA-TEST-2222",
      overrides.subtotal ?? 2999,
      overrides.shipping ?? 399,
      overrides.tax ?? 0,
      overrides.total ?? 3398,
      JSON.stringify(overrides.items ?? [lineItem(variantA)]),
    ],
  );
  return result.rows[0]!.id;
};

type EventArgs = {
  eventId?: string;
  type?: string;
  orderId: string;
  sessionId?: string;
  paymentStatus?: string;
  amount?: number;
  currency?: string;
  email?: string;
};

const applyEvent = async (tx: Transaction, args: EventArgs): Promise<string> => {
  const customer = {
    email: args.email ?? "  Alex@Example.COM ",
    name: "Alex Example",
    phone: "07700 900123",
    shipping: {
      name: "Alex Example",
      line1: "1 Dog Lane",
      city: "Leeds",
      postcode: "LS1 1AA",
      country: "GB",
    },
  };
  const result = await tx.query<{ outcome: string }>(
    "select public.apply_checkout_event($1, $2, $3, $4, 'pi_test', $5, $6, $7, $8::jsonb) as outcome",
    [
      args.eventId ?? "evt_1",
      args.type ?? "checkout.session.completed",
      args.orderId,
      args.sessionId ?? "cs_test_1",
      args.paymentStatus ?? "paid",
      args.amount ?? 3398,
      args.currency ?? "gbp",
      JSON.stringify(customer),
    ],
  );
  return result.rows[0]!.outcome;
};

const rowsOf = async (tx: Transaction, sql: string, params: unknown[] = []): Promise<Row[]> =>
  (await tx.query<Row>(sql, params)).rows;

const auditOf = (tx: Transaction, orderId: string): Promise<Row[]> =>
  rowsOf(
    tx,
    `select kind, from_status, to_status, actor, stripe_event_id, detail
     from public.order_events where order_id = $1 order by created_at`,
    [orderId],
  );

const orderOf = async (tx: Transaction, orderId: string): Promise<Row> =>
  (await rowsOf(tx, "select * from public.orders where id = $1", [orderId]))[0]!;

// A statement that is expected to fail must not leave the transaction aborted for what follows.
const expectFailure = async (tx: Transaction, sql: string, pattern: RegExp): Promise<void> => {
  await tx.exec("savepoint attempt");
  await expect(tx.exec(sql)).rejects.toThrow(pattern);
  await tx.exec("rollback to savepoint attempt");
};

describe("the order rules match @dropship/core", () => {
  it("allows exactly the moves the code allows", async () => {
    const result = await db.query<{ from_status: string; to_status: string }>(
      "select from_status, to_status from app.order_status_transitions",
    );
    const inDatabase = result.rows.map((row) => `${row.from_status}>${row.to_status}`).sort();
    const inCode = Object.entries(ORDER_TRANSITIONS)
      .flatMap(([from, targets]) => targets.map((to) => `${from}>${to}`))
      .sort();

    expect(inDatabase).toEqual(inCode);
  });

  it("knows exactly the statuses the code knows", async () => {
    const result = await db.query<{ status: string }>("select status from app.order_statuses");

    expect(result.rows.map((row) => row.status).sort()).toEqual([...ORDER_STATUSES].sort());
  });

  it("queues the same email for each status as the code does", async () => {
    for (const status of ORDER_STATUSES) {
      const result = await db.query<{ kind: string | null }>(
        "select app.email_kind_for_status($1) as kind",
        [status],
      );

      expect(result.rows[0]!.kind, status).toBe(emailForStatus(status) ?? null);
    }
  });
});

describe("creating an order", () => {
  it("records the order and its lines, pending payment, with an audit row", async () => {
    await runAs(db, serverA, async (tx) => {
      const orderId = await createOrder(tx);

      const order = await orderOf(tx, orderId);
      expect(order["status"]).toBe("pending_payment");
      expect(order["store_id"]).toBe(ids.storeA);
      expect(order["customer_email"]).toBeNull();
      const items = await rowsOf(
        tx,
        "select sku, quantity from public.order_items where order_id = $1",
        [orderId],
      );
      expect(items).toEqual([{ sku: "A-BED-1", quantity: 1 }]);
      expect(await auditOf(tx, orderId)).toEqual([
        {
          kind: "status_changed",
          from_status: null,
          to_status: "pending_payment",
          actor: "system",
          stripe_event_id: null,
          detail: {},
        },
      ]);
    });
  });

  it("refuses lines that do not add up to the subtotal", async () => {
    await runAs(db, serverA, async (tx) => {
      await tx.exec("savepoint attempt");
      const attempt = createOrder(tx, { items: [lineItem(variantA, 1, 100)] });
      await expect(attempt).rejects.toThrow(/add up/);
      await tx.exec("rollback to savepoint attempt");
    });
  });

  it("refuses an order with no lines", async () => {
    await runAs(db, serverA, async (tx) => {
      await tx.exec("savepoint attempt");
      await expect(createOrder(tx, { items: [] })).rejects.toThrow(/at least one item/);
      await tx.exec("rollback to savepoint attempt");
    });
  });

  it("refuses a total that is not subtotal plus delivery", async () => {
    await runAs(db, serverA, async (tx) => {
      await tx.exec("savepoint attempt");
      await expect(createOrder(tx, { total: 1 })).rejects.toThrow(/check constraint/);
      await tx.exec("rollback to savepoint attempt");
    });
  });

  it("refuses a second order with the same number in a store", async () => {
    await runAs(db, serverA, async (tx) => {
      await createOrder(tx, { number: "AA-DUPE-2222" });
      await tx.exec("savepoint attempt");
      await expect(createOrder(tx, { number: "AA-DUPE-2222" })).rejects.toThrow(/duplicate key/);
      await tx.exec("rollback to savepoint attempt");
    });
  });

  it("refuses to buy another store's product", async () => {
    await runAs(db, serverA, async (tx) => {
      await tx.exec("savepoint attempt");
      const attempt = createOrder(tx, { items: [lineItem(variantB)] });
      await expect(attempt).rejects.toThrow(/foreign key/);
      await tx.exec("rollback to savepoint attempt");
    });
  });

  it("needs a store in the token", async () => {
    await runAs(db, { role: "storefront_server" }, async (tx) => {
      await expect(createOrder(tx)).rejects.toThrow(/does not name a store/);
    });
  });

  it("is not available to the public API roles", async () => {
    for (const session of [
      { role: "anon", storeId: ids.storeA },
      { role: "authenticated", userId: ids.ownerA },
    ] as Session[]) {
      await runAs(db, session, async (tx) => {
        await expect(createOrder(tx)).rejects.toThrow(/permission denied/);
      });
    }
  });
});

describe("the status rules", () => {
  it("only lets an order be created as pending", async () => {
    await expect(
      db.exec(`insert into public.orders (store_id, number, status, currency, subtotal_minor,
        shipping_minor, tax_minor, total_minor) values ('${ids.storeA}', 'AA-SKIP-2222', 'paid', 'GBP', 1, 0, 0, 1)`),
    ).rejects.toThrow(/must start as pending_payment/);
  });

  it("rejects a move the table does not allow, and says which", async () => {
    await runAs(db, admin, async (tx) => {
      await expectFailure(
        tx,
        `update public.orders set status = 'delivered' where id = '${ids.orderA}'`,
        /illegal order status change from paid to delivered/,
      );
    });
  });

  it("walks an order to delivery, writing an audit row and one email at each milestone", async () => {
    await runAs(db, admin, async (tx) => {
      for (const status of ["supplier_pending", "supplier_ordered", "shipped", "delivered"]) {
        await tx.exec(`update public.orders set status = '${status}' where id = '${ids.orderA}'`);
      }

      const audit = await auditOf(tx, ids.orderA);
      expect(audit.map((row) => row["to_status"])).toEqual([
        "pending_payment",
        "paid",
        "supplier_pending",
        "supplier_ordered",
        "shipped",
        "delivered",
      ]);
      const emails = await rowsOf(
        tx,
        "select kind, to_address, status from public.email_events where order_id = $1 order by kind",
        [ids.orderA],
      );
      expect(emails).toEqual([
        { kind: "order_confirmation", to_address: "alex@example.com", status: "queued" },
        { kind: "order_delivered", to_address: "alex@example.com", status: "queued" },
        { kind: "order_shipped", to_address: "alex@example.com", status: "queued" },
      ]);
    });
  });

  it("never queues the same email twice for an order", async () => {
    await runAs(db, admin, async (tx) => {
      await tx.exec(
        `update public.orders set status = 'refund_requested' where id = '${ids.orderA}'`,
      );
      await tx.exec(
        `update public.orders set status = 'supplier_pending' where id = '${ids.orderA}'`,
      );
      await tx.exec(
        `update public.orders set status = 'refund_requested' where id = '${ids.orderA}'`,
      );
      await tx.exec(`update public.orders set status = 'shipped' where id = '${ids.orderA}'`);
      await tx.exec(
        `update public.orders set status = 'refund_requested' where id = '${ids.orderA}'`,
      );
      await tx.exec(`update public.orders set status = 'shipped' where id = '${ids.orderA}'`);

      const shipped = await rowsOf(
        tx,
        "select 1 from public.email_events where order_id = $1 and kind = 'order_shipped'",
        [ids.orderA],
      );
      expect(shipped).toHaveLength(1);
    });
  });

  it("freezes an order's identity and amounts", async () => {
    await runAs(db, admin, async (tx) => {
      for (const change of [
        "total_minor = 1, subtotal_minor = 1, shipping_minor = 0",
        "tax_minor = 5",
        "number = 'ZZ-ZZZZ-ZZZZ'",
        "currency = 'EUR'",
        `store_id = '${ids.storeB}'`,
      ]) {
        await expectFailure(
          tx,
          `update public.orders set ${change} where id = '${ids.orderA}'`,
          /cannot be changed|foreign key|check constraint/,
        );
      }
    });
  });

  it("does not let a cancelled or refunded order come back", async () => {
    await runAs(db, serverA, async (tx) => {
      const orderId = await createOrder(tx);
      await tx.exec(`update public.orders set status = 'cancelled' where id = '${orderId}'`);

      await expectFailure(
        tx,
        `update public.orders set status = 'paid' where id = '${orderId}'`,
        /illegal order status change from cancelled to paid/,
      );
    });
  });
});

describe("the audit log", () => {
  it("cannot be edited, even by the service role", async () => {
    await runAs(db, admin, async (tx) => {
      await expectFailure(
        tx,
        "update public.order_events set actor = 'nobody'",
        /audit log cannot be edited/,
      );
    });
  });

  it("cannot be written to directly by the storefront", async () => {
    await runAs(db, serverA, async (tx) => {
      await expectFailure(
        tx,
        `insert into public.order_events (store_id, order_id, kind, actor)
         values ('${ids.storeA}', '${ids.orderA}', 'note', 'me')`,
        /permission denied/,
      );
    });
  });

  it("records who made a change when a signed-in user does it", async () => {
    await runAs(db, admin, async (tx) => {
      await tx.exec("select set_config('app.actor', 'user:operator-1', true)");
      await tx.exec(
        `update public.orders set status = 'supplier_pending' where id = '${ids.orderA}'`,
      );

      const audit = await auditOf(tx, ids.orderA);
      expect(audit.at(-1)?.["actor"]).toBe("user:operator-1");
    });
  });
});

describe("applying a Stripe checkout event", () => {
  it("marks a pending order paid, stores the customer, and queues the confirmation", async () => {
    await runAs(db, serverA, async (tx) => {
      const orderId = await createOrder(tx);

      expect(await applyEvent(tx, { orderId })).toBe("paid");

      const order = await orderOf(tx, orderId);
      expect(order["status"]).toBe("paid");
      expect(order["customer_email"]).toBe("alex@example.com");
      expect(order["customer_name"]).toBe("Alex Example");
      expect(order["stripe_session_id"]).toBe("cs_test_1");
      expect(order["paid_at"]).not.toBeNull();
      expect((order["shipping_address"] as Row)["postcode"]).toBe("LS1 1AA");

      const audit = await auditOf(tx, orderId);
      expect(audit.at(-1)).toMatchObject({
        to_status: "paid",
        actor: "stripe",
        stripe_event_id: "evt_1",
      });
      const email = await rowsOf(
        tx,
        "select kind, to_address from public.email_events where order_id = $1",
        [orderId],
      );
      expect(email).toEqual([{ kind: "order_confirmation", to_address: "alex@example.com" }]);
    });
  });

  it("does nothing the second time the same event arrives", async () => {
    await runAs(db, serverA, async (tx) => {
      const orderId = await createOrder(tx);
      await applyEvent(tx, { orderId });
      const auditBefore = await auditOf(tx, orderId);

      expect(await applyEvent(tx, { orderId })).toBe("duplicate");
      expect(await applyEvent(tx, { orderId })).toBe("duplicate");

      expect(await auditOf(tx, orderId)).toEqual(auditBefore);
      const events = await rowsOf(tx, "select 1 from public.stripe_events where id = 'evt_1'");
      expect(events).toHaveLength(1);
      const emails = await rowsOf(tx, "select 1 from public.email_events where order_id = $1", [
        orderId,
      ]);
      expect(emails).toHaveLength(1);
    });
  });

  it("treats a second event for an already paid order as nothing to do", async () => {
    await runAs(db, serverA, async (tx) => {
      const orderId = await createOrder(tx);
      await applyEvent(tx, { orderId });

      const outcome = await applyEvent(tx, {
        orderId,
        eventId: "evt_2",
        type: "checkout.session.async_payment_succeeded",
      });

      expect(outcome).toBe("already_paid");
      const audit = await auditOf(tx, orderId);
      expect(audit.map((row) => row["to_status"])).toEqual(["pending_payment", "paid"]);
    });
  });

  it("waits when the checkout finished but the money has not arrived", async () => {
    await runAs(db, serverA, async (tx) => {
      const orderId = await createOrder(tx);

      expect(await applyEvent(tx, { orderId, paymentStatus: "unpaid" })).toBe("awaiting_payment");

      expect((await orderOf(tx, orderId))["status"]).toBe("pending_payment");
      // the later event, with the same checkout, still pays it
      expect(
        await applyEvent(tx, {
          orderId,
          eventId: "evt_2",
          type: "checkout.session.async_payment_succeeded",
        }),
      ).toBe("paid");
    });
  });

  it("refuses to mark an order paid when Stripe took a different amount", async () => {
    await runAs(db, serverA, async (tx) => {
      const orderId = await createOrder(tx);

      expect(await applyEvent(tx, { orderId, amount: 100 })).toBe("amount_mismatch");

      expect((await orderOf(tx, orderId))["status"]).toBe("pending_payment");
      const audit = await auditOf(tx, orderId);
      expect(audit.at(-1)).toMatchObject({
        kind: "amount_mismatch",
        detail: { expected_minor: 3398, received_minor: 100 },
      });
    });
  });

  it("refuses to mark an order paid in the wrong currency", async () => {
    await runAs(db, serverA, async (tx) => {
      const orderId = await createOrder(tx);

      expect(await applyEvent(tx, { orderId, currency: "eur" })).toBe("amount_mismatch");
    });
  });

  it("cancels a pending order when its checkout expires", async () => {
    await runAs(db, serverA, async (tx) => {
      const orderId = await createOrder(tx);

      const outcome = await applyEvent(tx, { orderId, type: "checkout.session.expired" });

      expect(outcome).toBe("cancelled");
      expect((await orderOf(tx, orderId))["status"]).toBe("cancelled");
    });
  });

  it("flags money arriving for a cancelled order instead of quietly reviving it", async () => {
    await runAs(db, serverA, async (tx) => {
      const orderId = await createOrder(tx);
      await applyEvent(tx, { orderId, eventId: "evt_expired", type: "checkout.session.expired" });

      const outcome = await applyEvent(tx, { orderId, eventId: "evt_late" });

      expect(outcome).toBe("payment_after_cancel");
      expect((await orderOf(tx, orderId))["status"]).toBe("cancelled");
      expect((await auditOf(tx, orderId)).at(-1)).toMatchObject({ kind: "payment_after_cancel" });
    });
  });

  it("refuses an event from a different checkout session than the order's", async () => {
    await runAs(db, serverA, async (tx) => {
      const orderId = await createOrder(tx);
      await tx.exec(
        `update public.orders set stripe_session_id = 'cs_real' where id = '${orderId}'`,
      );

      expect(await applyEvent(tx, { orderId, sessionId: "cs_other" })).toBe("session_mismatch");

      expect((await orderOf(tx, orderId))["status"]).toBe("pending_payment");
    });
  });

  it("answers unknown_order for an order that does not exist", async () => {
    await runAs(db, serverA, async (tx) => {
      const outcome = await applyEvent(tx, { orderId: "00000000-0000-4000-8000-000000000999" });

      expect(outcome).toBe("unknown_order");
    });
  });

  it("ignores event types it has no use for", async () => {
    await runAs(db, serverA, async (tx) => {
      const orderId = await createOrder(tx);

      expect(await applyEvent(tx, { orderId, type: "charge.succeeded" })).toBe("ignored");
      expect((await orderOf(tx, orderId))["status"]).toBe("pending_payment");
    });
  });

  it("will not touch another store's order, even knowing its id", async () => {
    await runAs(db, serverA, async (tx) => {
      expect(await applyEvent(tx, { orderId: ids.orderB, eventId: "evt_cross" })).toBe(
        "unknown_order",
      );
    });
    const [other] = await rowsAs(
      db,
      admin,
      `select status from public.orders where id = '${ids.orderB}'`,
    );
    expect(other).toEqual({ status: "paid" });
  });
});

describe("what the storefront's role can reach", () => {
  it("sees only its own store's orders, lines, events and shipments", async () => {
    for (const table of [
      "orders",
      "order_items",
      "order_events",
      "stripe_events",
      "email_events",
      "shipments",
    ]) {
      const rows = await rowsAs(db, serverA, `select distinct store_id from public.${table}`);

      expect(
        rows.map((row) => row["store_id"]),
        table,
      ).toEqual([ids.storeA]);
    }
  });

  it("sees nothing at all when the token names no store", async () => {
    const rows = await rowsAs(db, { role: "storefront_server" }, "select id from public.orders");

    expect(rows).toEqual([]);
  });

  it("cannot move an order to another store, or edit another store's order", async () => {
    await runAs(db, serverA, async (tx) => {
      await expectFailure(
        tx,
        `update public.orders set store_id = '${ids.storeB}' where id = '${ids.orderA}'`,
        /permission denied/,
      );
      const result = await tx.query(
        `update public.orders set customer_name = 'Hijacked' where id = '${ids.orderB}' returning id`,
      );
      expect(result.rows).toEqual([]);
    });
  });

  it("cannot read the catalog's tables or anything it was not granted", async () => {
    for (const table of ["products", "variants", "operators", "stores"]) {
      await runAs(db, serverB, async (tx) => {
        await expectFailure(tx, `select * from public.${table}`, /permission denied/);
      });
    }
  });

  it("cannot change amounts, delete orders or touch the audit log", async () => {
    await runAs(db, serverA, async (tx) => {
      await expectFailure(
        tx,
        `update public.orders set total_minor = 1 where id = '${ids.orderA}'`,
        /permission denied/,
      );
      await expectFailure(
        tx,
        `delete from public.orders where id = '${ids.orderA}'`,
        /permission denied/,
      );
      await expectFailure(tx, "delete from public.order_events", /permission denied/);
      await expectFailure(tx, "update public.stripe_events set outcome = 'x'", /permission denied/);
    });
  });

  it("is closed to the anonymous storefront role", async () => {
    for (const table of ["orders", "order_items", "email_events"]) {
      await runAs(db, { role: "anon", storeId: ids.storeA }, async (tx) => {
        await expectFailure(tx, `select * from public.${table}`, /permission denied/);
      });
    }
  });

  it("shows a signed-in customer who is not an operator no orders at all", async () => {
    const customer: Session = { role: "authenticated", userId: ids.nobody, storeId: ids.storeA };
    for (const table of ["orders", "order_items", "email_events"]) {
      expect(await rowsAs(db, customer, `select * from public.${table}`), table).toEqual([]);
    }
  });

  it("shows an operator their own store's orders and nobody else's", async () => {
    const rows = await rowsAs(
      db,
      { role: "authenticated", userId: ids.ownerA },
      "select number from public.orders",
    );

    expect(rows).toEqual([{ number: "AA-AAAA-2222" }]);
  });
});
