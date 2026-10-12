// A small in-memory limiter for actions anyone on the internet can trigger (starting a checkout,
// looking up an order). It counts requests per key in a fixed window.
//
// It lives in one server instance's memory, so on a platform that runs many instances the limit
// applies per instance. That is enough to stop a script hammering one address, and it fails safe,
// but it is not a replacement for a firewall or bot protection in front of the site (README R18).

export type RateLimiterOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
};

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterMs: number };

type Window = { startedAt: number; count: number };

// Past this many tracked keys the oldest are dropped, so the table can't be used to fill memory.
const MAX_TRACKED_KEYS = 10_000;

export const createRateLimiter = ({ limit, windowMs, now = Date.now }: RateLimiterOptions) => {
  const windows = new Map<string, Window>();

  const forget = (current: number): void => {
    for (const [key, window] of windows) {
      if (current - window.startedAt >= windowMs) {
        windows.delete(key);
      }
    }
    // everything left is recent: drop the oldest entries until there is room
    for (const key of windows.keys()) {
      if (windows.size < MAX_TRACKED_KEYS) {
        break;
      }
      windows.delete(key);
    }
  };

  const take = (key: string): RateLimitResult => {
    const current = now();
    const existing = windows.get(key);

    if (!existing || current - existing.startedAt >= windowMs) {
      if (windows.size >= MAX_TRACKED_KEYS) {
        forget(current);
      }
      windows.set(key, { startedAt: current, count: 1 });
      return { allowed: true };
    }
    if (existing.count >= limit) {
      return { allowed: false, retryAfterMs: existing.startedAt + windowMs - current };
    }
    existing.count += 1;
    return { allowed: true };
  };

  return { take };
};
