"use server";

import { normaliseOrderNumber } from "@dropship/core";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clientAddress } from "@/lib/client-address";
import { catalogSource } from "@/lib/catalog";
import { emailsMatch, mintOrderAccessToken } from "@/lib/orders/access";
import { findOrderByNumber } from "@/lib/orders/repository";
import { createRateLimiter } from "@/lib/rate-limit";
import { readSupabaseEnv } from "@/lib/supabase/env";
import { createServerClient } from "@/lib/supabase/server-client";

export type LookupState = {
  error?: string;
  // what they typed, so the form is not wiped by a mistake
  order?: string;
  email?: string;
};

// An order is found only by its number AND the email it was placed with. The number is random
// (about 800 billion possibilities) and both must match, so guessing is hopeless; the limits below
// stop anyone trying anyway, per visitor and per order number.
const byVisitor = createRateLimiter({ limit: 10, windowMs: 15 * 60 * 1000 });
const byOrder = createRateLimiter({ limit: 6, windowMs: 60 * 60 * 1000 });

// The same answer whether the number is wrong, the email is wrong, or the order does not exist, so
// the form can't be used to find out which order numbers are real.
const NOT_FOUND =
  "We couldn’t find an order with those details. Check the order number and the email address you used at checkout.";

export const lookupOrder = async (
  _previous: LookupState,
  formData: FormData,
): Promise<LookupState> => {
  const typedOrder = String(formData.get("order") ?? "").slice(0, 40);
  const typedEmail = String(formData.get("email") ?? "").slice(0, 254);
  const echo = { order: typedOrder, email: typedEmail };

  if (!byVisitor.take(clientAddress(await headers())).allowed) {
    return { ...echo, error: "That’s a lot of attempts. Please wait a few minutes and try again." };
  }

  const number = normaliseOrderNumber(typedOrder);
  if (!number || !typedEmail.includes("@") || catalogSource() === "fixtures") {
    return { ...echo, error: NOT_FOUND };
  }
  if (!byOrder.take(number).allowed) {
    return { ...echo, error: "Too many attempts for that order. Please try again later." };
  }

  const supabase = readSupabaseEnv();
  const client = await createServerClient(supabase);
  const details = await findOrderByNumber(client, number);
  if (!details || !emailsMatch(typedEmail, details.order.customerEmail)) {
    return { ...echo, error: NOT_FOUND };
  }

  const token = await mintOrderAccessToken({
    orderId: details.order.id,
    storeId: supabase.storeId,
    signingKey: supabase.jwtSigningKey,
  });
  // redirect() works by throwing, so it must come after everything that could fail
  redirect(`/orders/${encodeURIComponent(number)}?t=${encodeURIComponent(token)}`);
};
