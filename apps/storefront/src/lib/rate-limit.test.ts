import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

const clock = (start = 1_000_000) => {
  let time = start;
  return {
    now: () => time,
    advance: (ms: number) => {
      time += ms;
    },
  };
};

describe("createRateLimiter", () => {
  it("allows up to the limit, then refuses with a wait time", () => {
    const { now } = clock();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now });

    expect([1, 2, 3].map(() => limiter.take("a").allowed)).toEqual([true, true, true]);
    const fourth = limiter.take("a");

    expect(fourth).toEqual({ allowed: false, retryAfterMs: 60_000 });
  });

  it("counts each key separately", () => {
    const { now } = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now });

    expect(limiter.take("a").allowed).toBe(true);
    expect(limiter.take("b").allowed).toBe(true);
    expect(limiter.take("a").allowed).toBe(false);
  });

  it("starts again once the window has passed", () => {
    const { now, advance } = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now });
    limiter.take("a");

    advance(30_000);
    expect(limiter.take("a")).toEqual({ allowed: false, retryAfterMs: 30_000 });
    advance(30_000);

    expect(limiter.take("a").allowed).toBe(true);
  });

  it("does not let a flood of different keys grow its memory without bound", () => {
    const { now } = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 60_000, now });

    for (let index = 0; index < 25_000; index += 1) {
      limiter.take(`key-${index}`);
    }

    // still working, and an early key was dropped rather than the table blowing up
    expect(limiter.take("key-24999").allowed).toBe(false);
    expect(limiter.take("brand-new").allowed).toBe(true);
  });
});
