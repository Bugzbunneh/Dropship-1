import { SignJWT } from "jose";

// The tokens that scope a database request to one store.
//
// The database policies (see supabase/migrations) read the `store_id` claim through
// app.current_store_id(). A token is signed here, on the server, with the project's JWT secret;
// PostgREST checks the signature, so a claim cannot be forged from a browser. Tokens are
// short-lived and never carry operator privileges. There are two kinds:
//
//   mintStoreToken   role `anon`: reads the store's published catalog. Safe for any page.
//   mintServerToken  role `storefront_server`: creates and updates this store's orders. It can
//                    reach customer data (names, addresses), so it is only for server code that
//                    has authenticated its caller, such as the Stripe webhook.

export const STORE_TOKEN_LIFETIME_SECONDS = 300;
export const SERVER_TOKEN_LIFETIME_SECONDS = 60;

type MintOptions = {
  storeId: string;
  signingKey: string;
  now?: Date;
};

type SignOptions = MintOptions & {
  role: "anon" | "storefront_server";
  lifetimeSeconds: number;
};

const signToken = async ({
  storeId,
  signingKey,
  now = new Date(),
  role,
  lifetimeSeconds,
}: SignOptions): Promise<string> => {
  const issuedAt = Math.floor(now.getTime() / 1000);
  // The secret is used as the raw bytes of the string, exactly as Supabase's API does.
  const keyBytes = new TextEncoder().encode(signingKey);

  return new SignJWT({ role, store_id: storeId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("dropship-storefront")
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + lifetimeSeconds)
    .sign(keyBytes);
};

export const mintStoreToken = (options: MintOptions): Promise<string> =>
  signToken({ ...options, role: "anon", lifetimeSeconds: STORE_TOKEN_LIFETIME_SECONDS });

export const mintServerToken = (options: MintOptions): Promise<string> =>
  signToken({
    ...options,
    role: "storefront_server",
    lifetimeSeconds: SERVER_TOKEN_LIFETIME_SECONDS,
  });
