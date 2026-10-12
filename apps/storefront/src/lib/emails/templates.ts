import type { EmailKind } from "@dropship/core";
import { formatShortDate, type DeliveryEstimate } from "../delivery/working-days";
import type { OrderDetails, ShippingAddress } from "../orders/types";

// The emails a customer gets about an order. Pure functions from an order to subject, HTML and
// plain text, so every email is tested without sending anything. HTML emails are rendered by a
// hundred different mail apps that ignore most CSS, so the layout is a single column of tables
// with inline styles and system fonts, and the plain-text version carries the same information.

export type EmailColours = {
  primary: string;
  primaryForeground: string;
  emphasis: string;
  surface: string;
  foreground: string;
  background: string;
};

export type OrderEmailContext = {
  storeName: string;
  // the store's public address, no trailing slash
  origin: string;
  supportEmail: string;
  returnsWindowDays: number;
  locale: string;
  colours: EmailColours;
  details: OrderDetails;
  // where "View your order" goes; carries the customer's access token
  statusUrl: string;
  money: (minor: number) => string;
  // when the order should arrive, worked out from the day it was paid
  delivery: DeliveryEstimate | undefined;
  deliveryMaxWorkingDays: number;
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

// Every piece of text that came from a customer or the database goes through this before it is put
// in HTML, so a name like `<script>` or a product title with an ampersand can't break the page.
export const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const firstName = (name: string | null): string => {
  const first = name?.trim().split(/\s+/)[0];
  return first ? first : "there";
};

const productLabel = (title: string, variantTitle: string): string => {
  const plain =
    /^(default|default title)$/i.test(variantTitle.trim()) || variantTitle.trim() === "";
  return plain ? title : `${title} (${variantTitle})`;
};

const addressLines = (address: ShippingAddress): string[] =>
  [
    address.name,
    address.line1,
    address.line2,
    address.city,
    address.county,
    address.postcode,
    address.country,
  ].filter((line): line is string => Boolean(line));

const deliverySentence = (ctx: OrderEmailContext): string => {
  if (ctx.delivery?.kind === "date") {
    return `We expect it to reach you by ${formatShortDate(ctx.delivery.latest, ctx.locale)}.`;
  }
  return `We expect it to reach you within ${ctx.deliveryMaxWorkingDays} working days.`;
};

// Layout --------------------------------------------------------------------------------------------

const button = (label: string, href: string, colours: EmailColours): string =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0">
    <tr><td style="background:${colours.primary};border-radius:8px">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-weight:700;font-size:16px;color:${colours.primaryForeground};text-decoration:none">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;

const paragraph = (html: string): string =>
  `<p style="margin:0 0 16px;font-size:16px;line-height:1.5">${html}</p>`;

const frame = (
  ctx: OrderEmailContext,
  preheader: string,
  heading: string,
  bodyHtml: string,
): string => `<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${ctx.colours.surface};color:${ctx.colours.foreground};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${ctx.colours.surface}">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:${ctx.colours.background};border-radius:12px">
    <tr><td style="padding:24px 28px;border-bottom:4px solid ${ctx.colours.primary}">
      <a href="${escapeHtml(ctx.origin)}" style="font-size:20px;font-weight:800;color:${ctx.colours.emphasis};text-decoration:none">${escapeHtml(ctx.storeName)}</a>
    </td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:${ctx.colours.emphasis}">${escapeHtml(heading)}</h1>
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:20px 28px;border-top:1px solid ${ctx.colours.surface};font-size:13px;line-height:1.5;color:${ctx.colours.foreground}">
      Questions? Reply to this email or write to <a href="mailto:${escapeHtml(ctx.supportEmail)}" style="color:${ctx.colours.emphasis}">${escapeHtml(ctx.supportEmail)}</a>.
      You can send anything back within ${ctx.returnsWindowDays} days: see our <a href="${escapeHtml(ctx.origin)}/returns" style="color:${ctx.colours.emphasis}">returns policy</a>.
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

// Pieces of an order ----------------------------------------------------------------------------------

const itemsTable = (ctx: OrderEmailContext): string => {
  const { order, items } = ctx.details;
  const row = (left: string, right: string, bold = false): string =>
    `<tr><td style="padding:6px 0;font-size:15px;${bold ? "font-weight:700;" : ""}">${left}</td><td align="right" style="padding:6px 0;font-size:15px;white-space:nowrap;${bold ? "font-weight:700;" : ""}">${right}</td></tr>`;

  const lines = items
    .map((item) =>
      row(
        `${item.quantity} &times; ${escapeHtml(productLabel(item.title, item.variantTitle))}`,
        escapeHtml(ctx.money(item.lineTotalMinor)),
      ),
    )
    .join("");
  const delivery = row(
    "Delivery",
    order.shippingMinor === 0 ? "Free" : escapeHtml(ctx.money(order.shippingMinor)),
  );
  const total = `<tr><td colspan="2" style="border-top:1px solid ${ctx.colours.surface}"></td></tr>${row("Total", escapeHtml(ctx.money(order.totalMinor)), true)}`;
  const vat =
    order.taxMinor > 0
      ? `<tr><td colspan="2" style="padding:0 0 6px;font-size:13px;color:${ctx.colours.foreground}">Includes VAT of ${escapeHtml(ctx.money(order.taxMinor))}</td></tr>`
      : "";

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 20px">${lines}${delivery}${total}${vat}</table>`;
};

const addressBlock = (address: ShippingAddress | null, ctx: OrderEmailContext): string => {
  if (!address) {
    return "";
  }
  const lines = addressLines(address).map(escapeHtml).join("<br>");
  return `<p style="margin:0 0 4px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:${ctx.colours.emphasis}">Delivering to</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5">${lines}</p>`;
};

const itemsText = (ctx: OrderEmailContext): string => {
  const { order, items } = ctx.details;
  const lines = items.map(
    (item) =>
      `  ${item.quantity} x ${productLabel(item.title, item.variantTitle)}  ${ctx.money(item.lineTotalMinor)}`,
  );
  return [
    ...lines,
    `  Delivery  ${order.shippingMinor === 0 ? "Free" : ctx.money(order.shippingMinor)}`,
    `  Total  ${ctx.money(order.totalMinor)}`,
    ...(order.taxMinor > 0 ? [`  (includes VAT of ${ctx.money(order.taxMinor)})`] : []),
  ].join("\n");
};

const footerText = (ctx: OrderEmailContext): string =>
  [
    `View your order: ${ctx.statusUrl}`,
    "",
    `Questions? Reply to this email or write to ${ctx.supportEmail}.`,
    `You can send anything back within ${ctx.returnsWindowDays} days: ${ctx.origin}/returns`,
    "",
    ctx.storeName,
  ].join("\n");

// The three emails ---------------------------------------------------------------------------------------

const confirmation = (ctx: OrderEmailContext): RenderedEmail => {
  const { order } = ctx.details;
  const name = firstName(order.customerName);
  const arrival = deliverySentence(ctx);
  const subject = `Thanks, we've got your order ${order.number}`;

  const html = frame(
    ctx,
    `Order ${order.number}: ${arrival}`,
    `Thanks, ${name}. Your order is in.`,
    [
      paragraph(
        `We've got your payment and your order <strong>${escapeHtml(order.number)}</strong> is being prepared. ${escapeHtml(arrival)}`,
      ),
      itemsTable(ctx),
      addressBlock(order.shippingAddress, ctx),
      paragraph("We'll email you again as soon as it's on its way, with tracking."),
      button("View your order", ctx.statusUrl, ctx.colours),
    ].join(""),
  );

  const text = [
    `Thanks, ${name}. Your order is in.`,
    "",
    `We've got your payment and your order ${order.number} is being prepared. ${arrival}`,
    "",
    itemsText(ctx),
    "",
    ...(order.shippingAddress
      ? ["Delivering to:", ...addressLines(order.shippingAddress).map((line) => `  ${line}`), ""]
      : []),
    "We'll email you again as soon as it's on its way, with tracking.",
    "",
    footerText(ctx),
  ].join("\n");

  return { subject, html, text };
};

const trackingHtml = (ctx: OrderEmailContext): string => {
  const shipment = ctx.details.shipment;
  if (!shipment) {
    return "";
  }
  const number = shipment.trackingNumber ? escapeHtml(shipment.trackingNumber) : "";
  const link = shipment.trackingUrl
    ? `<a href="${escapeHtml(shipment.trackingUrl)}" style="color:${ctx.colours.emphasis};font-weight:700">Track your parcel</a>`
    : "";
  return paragraph(
    `Carrier: <strong>${escapeHtml(shipment.carrier)}</strong>${number ? `<br>Tracking number: <strong>${number}</strong>` : ""}${link ? `<br>${link}` : ""}`,
  );
};

const trackingText = (ctx: OrderEmailContext): string[] => {
  const shipment = ctx.details.shipment;
  if (!shipment) {
    return [];
  }
  return [
    `Carrier: ${shipment.carrier}`,
    ...(shipment.trackingNumber ? [`Tracking number: ${shipment.trackingNumber}`] : []),
    ...(shipment.trackingUrl ? [`Track your parcel: ${shipment.trackingUrl}`] : []),
    "",
  ];
};

const shipped = (ctx: OrderEmailContext): RenderedEmail => {
  const { order } = ctx.details;
  const name = firstName(order.customerName);
  const arrival = deliverySentence(ctx);
  const subject = `Your order ${order.number} is on its way`;

  const html = frame(
    ctx,
    `Order ${order.number} has been sent. ${arrival}`,
    `Good news, ${name}: it's on its way.`,
    [
      paragraph(
        `Your order <strong>${escapeHtml(order.number)}</strong> has been sent. ${escapeHtml(arrival)}`,
      ),
      trackingHtml(ctx),
      itemsTable(ctx),
      addressBlock(order.shippingAddress, ctx),
      button("View your order", ctx.statusUrl, ctx.colours),
    ].join(""),
  );

  const text = [
    `Good news, ${name}: it's on its way.`,
    "",
    `Your order ${order.number} has been sent. ${arrival}`,
    "",
    ...trackingText(ctx),
    itemsText(ctx),
    "",
    footerText(ctx),
  ].join("\n");

  return { subject, html, text };
};

const delivered = (ctx: OrderEmailContext): RenderedEmail => {
  const { order } = ctx.details;
  const name = firstName(order.customerName);
  const subject = `Your order ${order.number} has been delivered`;

  const html = frame(
    ctx,
    `Order ${order.number} has arrived`,
    `Delivered! We hope they love it, ${name}.`,
    [
      paragraph(`Your order <strong>${escapeHtml(order.number)}</strong> has been delivered.`),
      paragraph(
        `If anything isn't right, just reply to this email and we'll sort it out. You have ${ctx.returnsWindowDays} days to send anything back.`,
      ),
      button("View your order", ctx.statusUrl, ctx.colours),
    ].join(""),
  );

  const text = [
    `Delivered! We hope they love it, ${name}.`,
    "",
    `Your order ${order.number} has been delivered.`,
    `If anything isn't right, just reply to this email and we'll sort it out. You have ${ctx.returnsWindowDays} days to send anything back.`,
    "",
    footerText(ctx),
  ].join("\n");

  return { subject, html, text };
};

export const renderOrderEmail = (kind: EmailKind, ctx: OrderEmailContext): RenderedEmail => {
  switch (kind) {
    case "order_confirmation":
      return confirmation(ctx);
    case "order_shipped":
      return shipped(ctx);
    case "order_delivered":
      return delivered(ctx);
  }
};
