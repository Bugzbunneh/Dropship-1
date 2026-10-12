import "server-only";
import { normaliseOrderNumber } from "@dropship/core";
import { catalogSource } from "../catalog";
import { readSupabaseEnv } from "../supabase/env";
import { createServerClient } from "../supabase/server-client";
import { verifyOrderAccessToken } from "./access";
import { findOrderByNumber } from "./repository";
import type { OrderDetails } from "./types";

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
};

// An order for a visitor who holds a link to it. Returns nothing at all unless the link's token is
// valid for that order, and gives the same nothing for a wrong number, a missing order and a bad
// token, so a visitor can't tell which order numbers exist.
export const loadOrderForVisitor = async (
  rawNumber: string,
  token: string | undefined,
): Promise<OrderDetails | null> => {
  const number = normaliseOrderNumber(safeDecode(rawNumber));
  // the offline demo catalog has no database, so it has no orders
  if (!number || !token || catalogSource() === "fixtures") {
    return null;
  }

  const supabase = readSupabaseEnv();
  const client = await createServerClient(supabase);
  const details = await findOrderByNumber(client, number);
  if (!details) {
    return null;
  }

  const allowed = await verifyOrderAccessToken(token, {
    orderId: details.order.id,
    storeId: supabase.storeId,
    signingKey: supabase.jwtSigningKey,
  });
  return allowed ? details : null;
};
