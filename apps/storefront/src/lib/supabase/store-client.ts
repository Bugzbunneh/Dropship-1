import type { Database } from "@dropship/db";
import { createClient } from "@supabase/supabase-js";
import { readSupabaseEnv, type SupabaseEnv } from "./env";
import { mintStoreToken } from "./store-token";

// A Supabase client acting as this deployment's store. Server only.
//
// The publishable key identifies the project; the Authorization header carries the store-scoped
// token, so the database sees an `anon` request with a `store_id` claim. A client is cheap to
// create, so make one per request rather than sharing one across stores or requests.
export const createStoreClient = async (config: SupabaseEnv = readSupabaseEnv()) => {
  const token = await mintStoreToken({
    storeId: config.storeId,
    signingKey: config.jwtSigningKey,
  });

  return createClient<Database>(config.url, config.publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
};
