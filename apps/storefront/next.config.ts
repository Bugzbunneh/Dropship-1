import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Opt-in caching with 'use cache' and cache tags, which is how sync jobs refresh pages.
  cacheComponents: true,
  // Recommended for new projects: links prefetch a shared shell per route.
  partialPrefetching: true,
  // The workspace packages ship TypeScript source, so Next has to compile them.
  transpilePackages: ["@dropship/config", "@dropship/core", "@dropship/stores"],
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    // Order and payment-return addresses carry a secret (an access token or Stripe's session id),
    // so the browser must not pass them on to other sites in the Referer header, and they must not
    // be stored by shared caches.
    const privateHeaders = [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Cache-Control", value: "private, no-store" },
    ];
    return [
      { source: "/orders/:path*", headers: privateHeaders },
      { source: "/checkout/:path*", headers: privateHeaders },
    ];
  },
};

export default nextConfig;
