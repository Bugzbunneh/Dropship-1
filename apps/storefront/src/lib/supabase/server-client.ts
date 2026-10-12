import "server-only";
import type { Database } from "@dropship/db";
import { createClient } from "@supabase/supabase-js";
import { readSupabaseEnv, type SupabaseEnv } from "./env";
import { mintServerToken } from "./store-token";

// A Supabase client acting as this deployment's server for its own store: it can create and update
// the store's orders, and read their customers' details. Server only, and only for code that has
// already established who is asking (the Stripe webhook after checking Stripe's signature, a
// checkout the visitor started, a status page the visitor proved they may see).
//
// The token names one store and lives for a minute, so even a mistake in a query cannot reach
// another store's orders. Make one per operation rather than sharing it.
export const createServerClient = async (config: SupabaseEnv = readSupabaseEnv()) => {
  const token = await mintServerToken({
    storeId: config.storeId,
    signingKey: config.jwtSigningKey,
  });

  return createClient<Database>(config.url, config.publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
};

export type ServerClient = Awaited<ReturnType<typeof createServerClient>>;
