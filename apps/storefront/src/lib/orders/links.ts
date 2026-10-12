// The address of an order's status page. The token proves the visitor was given the link (by the
// receipt email or the page right after paying), so it is part of the address.
export const orderStatusUrl = (origin: string, orderNumber: string, token: string): string =>
  `${origin}/orders/${encodeURIComponent(orderNumber)}?t=${encodeURIComponent(token)}`;
