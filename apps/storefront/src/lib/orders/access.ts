import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

// Who may see an order. Customers have no accounts, so there are two ways in, both proving they
// hold something only the buyer has:
//
//   1. the order number AND the email address the order was placed with, typed into the lookup form
//   2. a signed link, which is what the order emails contain
//
// The link carries a token that names one order in one store. It is signed with a key derived from
// the project's signing secret and a purpose label, so it can never be mistaken for a database
// token (and a database token can never open an order page), and no extra secret has to be managed.
// It is read-only access to one order's status page.

export const ORDER_ACCESS_LIFETIME_SECONDS = 90 * 24 * 60 * 60;

const AUDIENCE = "dropship-order-access";
const KEY_PURPOSE = "dropship/order-access/v1";

const deriveKey = (signingKey: string): Uint8Array =>
  new Uint8Array(createHmac("sha256", signingKey).update(KEY_PURPOSE).digest());

type TokenScope = {
  orderId: string;
  storeId: string;
  signingKey: string;
  now?: Date;
};

export const mintOrderAccessToken = async ({
  orderId,
  storeId,
  signingKey,
  now = new Date(),
}: TokenScope): Promise<string> => {
  const issuedAt = Math.floor(now.getTime() / 1000);
  return new SignJWT({ store_id: storeId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer("dropship-storefront")
    .setAudience(AUDIENCE)
    .setSubject(orderId)
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + ORDER_ACCESS_LIFETIME_SECONDS)
    .sign(deriveKey(signingKey));
};

// True only for an unexpired token, signed with our key, for exactly this order in this store.
// Never throws: anything wrong with the token just means no access.
export const verifyOrderAccessToken = async (
  token: string | undefined,
  { orderId, storeId, signingKey, now = new Date() }: TokenScope,
): Promise<boolean> => {
  if (!token) {
    return false;
  }
  try {
    const { payload } = await jwtVerify(token, deriveKey(signingKey), {
      algorithms: ["HS256"],
      audience: AUDIENCE,
      issuer: "dropship-storefront",
      currentDate: now,
    });
    return payload.sub === orderId && payload["store_id"] === storeId;
  } catch {
    return false;
  }
};

export const normaliseEmail = (email: string): string => email.trim().toLowerCase();

// Compares two email addresses without revealing, through timing, how much of one matched.
export const emailsMatch = (given: string, stored: string | null): boolean => {
  if (!stored) {
    return false;
  }
  const digest = (value: string): Buffer =>
    createHash("sha256").update(normaliseEmail(value)).digest();
  return timingSafeEqual(digest(given), digest(stored));
};
