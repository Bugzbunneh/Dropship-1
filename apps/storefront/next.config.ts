import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Opt-in caching with 'use cache' and cache tags, which is how sync jobs refresh pages.
  cacheComponents: true,
  // Recommended for new projects: links prefetch a shared shell per route.
  partialPrefetching: true,
  // The workspace packages ship TypeScript source, so Next has to compile them.
  transpilePackages: ["@dropship/config", "@dropship/stores"],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
