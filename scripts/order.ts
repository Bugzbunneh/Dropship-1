// Looks at an order and moves it along, until the admin app exists (Phase 4). It works on the linked
// Supabase project, the same way `pnpm store:seed` does.
//
//   pnpm order:show PP-7K3M-9Q2X
//   pnpm order:advance PP-7K3M-9Q2X supplier_pending
//   pnpm order:advance PP-7K3M-9Q2X shipped --carrier "Royal Mail" --tracking AB123456789GB \
//       --url https://www.royalmail.com/track-your-item
//   pnpm order:advance PP-7K3M-9Q2X delivered --send-emails http://localhost:3100
//
// Moves are checked against the same rules the database enforces (@dropship/core), and the database
// writes the audit row and queues the customer's email. Queued emails are sent by the storefront:
// `--send-emails <site address>` asks a running storefront to send them now (it needs
// REVALIDATE_SECRET), otherwise they go out the next time the storefront's sweep runs.
//
// `--store <slug>` picks the store (default: the STORE environment variable, or pet-pilot).

import {
  canTransition,
  isOrderStatus,
  normaliseOrderNumber,
  ORDER_TRANSITIONS,
  type OrderStatus,
} from "@dropship/core";
import { storeSlugs } from "@dropship/stores";
import { runLinkedSql } from "./lib/linked-sql";

type Row = Record<string, unknown>;

const USAGE = `Usage:
  order show <number> [--store <slug>]
  order advance <number> <status> [--carrier <name> --tracking <number> --url <https address>]
                [--send-emails <site address>] [--store <slug>]`;

const quote = (value: string): string => `'${value.replaceAll("'", "''")}'`;

const query = (sql: string): Row[] => {
  const output = runLinkedSql(sql);
  const parsed = JSON.parse(output) as { rows?: Row[] };
  return parsed.rows ?? [];
};

// The part of an argument list that is `--name value` pairs and flags with no value.
const flagsFrom = (args: string[]): Map<string, string> => {
  const flags = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index] ?? "";
    if (arg.startsWith("--")) {
      const next = args[index + 1];
      const hasValue = next !== undefined && !next.startsWith("--");
      flags.set(arg.slice(2), hasValue ? next : "");
      if (hasValue) {
        index += 1;
      }
    }
  }
  return flags;
};

const storeSlugFrom = (flags: Map<string, string>): string => {
  const slug = flags.get("store") || process.env["STORE"] || "pet-pilot";
  if (!storeSlugs.includes(slug)) {
    throw new Error(`Unknown store "${slug}". Stores: ${storeSlugs.join(", ")}`);
  }
  return slug;
};

const money = (minor: unknown, currency: unknown): string =>
  `${String(currency)} ${(Number(minor) / 100).toFixed(2)}`;

type OrderRow = {
  id: string;
  number: string;
  status: string;
  total_minor: number;
  currency: string;
};

const findOrder = (slug: string, number: string): OrderRow => {
  const rows = query(
    `select o.id, o.number, o.status, o.total_minor, o.currency
     from public.orders o join public.stores s on s.id = o.store_id
     where s.slug = ${quote(slug)} and o.number = ${quote(number)}`,
  );
  const order = rows[0] as OrderRow | undefined;
  if (!order) {
    throw new Error(`No order ${number} in "${slug}".`);
  }
  return order;
};

const show = (slug: string, number: string): void => {
  const order = findOrder(slug, number);
  const [details] = query(
    `select customer_email, customer_name, created_at, paid_at, stripe_session_id
     from public.orders where id = ${quote(order.id)}`,
  );
  const items = query(
    `select title, variant_title, quantity, line_total_minor from public.order_items
     where order_id = ${quote(order.id)} order by created_at`,
  );
  const events = query(
    `select created_at, kind, from_status, to_status, actor from public.order_events
     where order_id = ${quote(order.id)} order by created_at`,
  );
  const emails = query(
    `select kind, status, attempts from public.email_events
     where order_id = ${quote(order.id)} order by created_at`,
  );
  const shipments = query(
    `select carrier, tracking_number, shipped_at, delivered_at from public.shipments
     where order_id = ${quote(order.id)}`,
  );

  console.log(
    `Order ${order.number}  [${order.status}]  ${money(order.total_minor, order.currency)}`,
  );
  console.log(
    `  customer: ${String(details?.["customer_name"] ?? "-")} <${String(details?.["customer_email"] ?? "-")}>`,
  );
  console.log(
    `  placed:   ${String(details?.["created_at"])}   paid: ${String(details?.["paid_at"] ?? "-")}`,
  );
  console.log("  items:");
  for (const item of items) {
    console.log(
      `    ${String(item["quantity"])} x ${String(item["title"])} (${String(item["variant_title"])})`,
    );
  }
  for (const shipment of shipments) {
    console.log(
      `  shipment: ${String(shipment["carrier"])} ${String(shipment["tracking_number"] ?? "")}`,
    );
  }
  console.log("  history:");
  for (const event of events) {
    console.log(
      `    ${String(event["created_at"])}  ${String(event["from_status"] ?? "-")} -> ${String(event["to_status"] ?? "-")}  (${String(event["actor"])})`,
    );
  }
  console.log(
    "  emails:  " +
      (emails.map((e) => `${String(e["kind"])}=${String(e["status"])}`).join(", ") || "none"),
  );
  const next = ORDER_TRANSITIONS[order.status as OrderStatus] ?? [];
  console.log(`  can move to: ${next.join(", ") || "(nothing: this order is finished)"}`);
};

const shipmentSql = (orderId: string, storeId: string, flags: Map<string, string>): string => {
  const carrier = flags.get("carrier");
  if (!carrier) {
    throw new Error(
      "Moving an order to shipped needs --carrier (and usually --tracking and --url).",
    );
  }
  const url = flags.get("url");
  if (url && !/^https:\/\/\S+$/.test(url)) {
    throw new Error("--url must be an https address");
  }
  const tracking = flags.get("tracking");
  return `insert into public.shipments (store_id, order_id, carrier, tracking_number, tracking_url, shipped_at)
    values (${quote(storeId)}, ${quote(orderId)}, ${quote(carrier)},
            ${tracking ? quote(tracking) : "null"}, ${url ? quote(url) : "null"}, now())
    on conflict (order_id) do update set carrier = excluded.carrier,
      tracking_number = excluded.tracking_number, tracking_url = excluded.tracking_url,
      shipped_at = coalesce(public.shipments.shipped_at, now());`;
};

const advance = async (
  slug: string,
  number: string,
  target: string,
  flags: Map<string, string>,
) => {
  if (!isOrderStatus(target)) {
    throw new Error(
      `"${target}" is not an order status. Statuses: ${Object.keys(ORDER_TRANSITIONS).join(", ")}`,
    );
  }
  const order = findOrder(slug, number);
  const current = order.status as OrderStatus;
  if (!canTransition(current, target)) {
    const allowed = ORDER_TRANSITIONS[current].join(", ") || "nothing";
    throw new Error(
      `An order that is ${current} cannot become ${target}. It can become: ${allowed}.`,
    );
  }

  const [store] = query(`select id from public.stores where slug = ${quote(slug)}`);
  const storeId = String(store?.["id"]);
  const steps = [
    "select set_config('app.actor', 'operator-cli', false);",
    ...(target === "shipped" ? [shipmentSql(order.id, storeId, flags)] : []),
    `update public.orders set status = ${quote(target)} where id = ${quote(order.id)};`,
    ...(target === "delivered"
      ? [
          `update public.shipments set delivered_at = coalesce(delivered_at, now()) where order_id = ${quote(order.id)};`,
        ]
      : []),
  ];
  runLinkedSql(steps.join("\n"));
  console.log(`Order ${order.number}: ${current} -> ${target}`);

  const site = flags.get("send-emails");
  if (site) {
    const secret = process.env["REVALIDATE_SECRET"];
    if (!secret) {
      throw new Error("--send-emails needs REVALIDATE_SECRET in the environment.");
    }
    const response = await fetch(`${site.replace(/\/+$/, "")}/api/emails/send`, {
      method: "POST",
      headers: { "x-revalidate-secret": secret },
    });
    console.log(`Email sweep: ${response.status} ${await response.text()}`);
  } else {
    console.log("Any email for this change is queued and goes out on the storefront's next sweep.");
  }
};

const main = async (): Promise<void> => {
  const [command, rawNumber, ...rest] = process.argv.slice(2);
  const number = rawNumber ? normaliseOrderNumber(rawNumber) : undefined;
  if (!command || !number) {
    throw new Error(USAGE);
  }

  if (command === "show") {
    show(storeSlugFrom(flagsFrom(rest)), number);
    return;
  }
  if (command === "advance") {
    const [target, ...flagArgs] = rest;
    if (!target) {
      throw new Error(USAGE);
    }
    const flags = flagsFrom(flagArgs);
    await advance(storeSlugFrom(flags), number, target, flags);
    return;
  }
  throw new Error(USAGE);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
