import { SignJWT } from "jose";

// The token that scopes a database request to one store.
//
// The database policies (see supabase/migrations) read the `store_id` claim through
// app.current_store_id() and show only that store's published rows. The token is signed here,
// on the server, with the project's JWT secret; PostgREST checks the signature, so the claim
// cannot be forged from a browser. It is short-lived, and it never carries operator privileges:
// the role is always `anon`.

export const STORE_TOKEN_LIFETIME_SECONDS = 300;

type MintOptions = {
  storeId: string;
  signingKey: string;
  now?: Date;
};

export const mintStoreToken = async ({
  storeId,
  signingKey,
  now = new Date(),
}: MintOptions): Promise<string> => {
  const issuedAt = Math.floor(now.getTime() / 1000);
  // The secret is used as the raw bytes of the string, exactly as Supabase's API does.
  const keyBytes = new TextEncoder().encode(signingKey);

  return new SignJWT({ role: "anon", store_id: storeId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("dropship-storefront")
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + STORE_TOKEN_LIFETIME_SECONDS)
    .sign(keyBytes);
};
