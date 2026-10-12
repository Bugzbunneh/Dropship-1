import { formatMoney } from "@/lib/money";
import type { OrderDetails } from "@/lib/orders/types";

type OrderDetailsCardProps = {
  details: OrderDetails;
  locale: string;
};

const productLabel = (title: string, variantTitle: string): string => {
  const plain =
    /^(default|default title)$/i.test(variantTitle.trim()) || variantTitle.trim() === "";
  return plain ? title : `${title} (${variantTitle})`;
};

// What was bought, what it cost, and where it is going. Server-rendered: no browser code needed.
export const OrderDetailsCard = ({ details, locale }: OrderDetailsCardProps) => {
  const { order, items } = details;
  const money = (minor: number): string => formatMoney(minor, order.currency, locale);
  const address = order.shippingAddress;
  const addressLines = address
    ? [address.name, address.line1, address.line2, address.city, address.county, address.postcode]
    : [];

  return (
    <div
      className="space-y-6 rounded-3xl border border-muted bg-surface/50 p-5 sm:p-6"
      data-testid="order-details"
    >
      <div>
        <h2 className="mb-3 font-heading text-xl font-bold">Your items</h2>
        <ul className="divide-y divide-muted">
          {items.map((item) => (
            <li key={item.sku} className="flex justify-between gap-4 py-3">
              <span>
                <span className="font-semibold">{productLabel(item.title, item.variantTitle)}</span>
                <span className="block text-sm text-foreground/75">
                  {money(item.unitPriceMinor)} each &times; {item.quantity}
                </span>
              </span>
              <span className="font-semibold">{money(item.lineTotalMinor)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-2 border-t border-muted pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="font-semibold">{money(order.subtotalMinor)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd className="font-semibold">
              {order.shippingMinor === 0 ? "Free" : money(order.shippingMinor)}
            </dd>
          </div>
          <div className="flex justify-between text-lg">
            <dt className="font-bold">Total</dt>
            <dd className="font-bold" data-testid="order-total">
              {money(order.totalMinor)}
            </dd>
          </div>
          {order.taxMinor > 0 ? (
            <p className="text-foreground/75">Includes VAT of {money(order.taxMinor)}</p>
          ) : null}
        </dl>
      </div>

      {address ? (
        <div>
          <h2 className="mb-2 font-heading text-xl font-bold">Delivering to</h2>
          <address className="not-italic leading-relaxed">
            {addressLines.filter(Boolean).map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </address>
        </div>
      ) : null}
    </div>
  );
};
