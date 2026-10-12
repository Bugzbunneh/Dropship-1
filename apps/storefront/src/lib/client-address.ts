// Who is asking, for rate limiting. Behind a proxy or CDN the original address arrives in a header
// the proxy sets; the first entry is the visitor's own. This is only used to *limit* requests, never
// to decide who may see something, so a forged header can at worst let one script spread its
// requests across made-up addresses (the limiter's table is bounded, see rate-limit.ts).
export const clientAddress = (requestHeaders: { get: (name: string) => string | null }): string => {
  const forwarded = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = requestHeaders.get("x-real-ip")?.trim();
  return forwarded || real || "unknown";
};
