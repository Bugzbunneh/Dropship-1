import "server-only";
import type { StoreConfig } from "@dropship/config";
import { estimateDelivery } from "../delivery/working-days";
import { formatMoney } from "../money";
import { mintOrderAccessToken } from "../orders/access";
import { orderStatusUrl } from "../orders/links";
import type { OrderDetails } from "../orders/types";
import { siteOrigin } from "../site";
import type { SupabaseEnv } from "../supabase/env";
import type { OrderEmailContext } from "./templates";

// Gathers what an order email needs: the store's look and contact details, a link that lets the
// customer open their order, and the delivery date counted from the day they paid.
export const buildOrderEmailContext = async (
  details: OrderDetails,
  config: StoreConfig,
  supabase: Pick<SupabaseEnv, "jwtSigningKey" | "storeId">,
): Promise<OrderEmailContext> => {
  const origin = siteOrigin(config);
  const { order } = details;
  const token = await mintOrderAccessToken({
    orderId: order.id,
    storeId: supabase.storeId,
    signingKey: supabase.jwtSigningKey,
  });
  const colours = config.theme.colours;
  const countedFrom = new Date(order.paidAt ?? order.createdAt);

  return {
    storeName: config.name,
    origin,
    supportEmail: config.business.email ?? config.email.replyTo ?? config.email.fromAddress,
    returnsWindowDays: config.policies.returnsWindowDays,
    locale: config.locale,
    colours: {
      primary: colours.primary,
      primaryForeground: colours.primaryForeground,
      emphasis: colours.emphasis,
      surface: colours.surface,
      foreground: colours.foreground,
      background: colours.background,
    },
    details,
    statusUrl: orderStatusUrl(origin, order.number, token),
    money: (minor) => formatMoney(minor, order.currency, config.locale),
    delivery: estimateDelivery(countedFrom, config.policies.deliveryMaxWorkingDays),
    deliveryMaxWorkingDays: config.policies.deliveryMaxWorkingDays,
  };
};
