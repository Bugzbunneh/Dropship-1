import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string): Buffer => createHash("sha256").update(value).digest();

// Constant-time comparison. Hashing first gives both sides the same length, so neither the
// content nor the length of the real secret leaks through timing.
export const isAuthorised = (provided: string | null, expected: string | undefined): boolean => {
  if (!expected || !provided) {
    return false;
  }
  return timingSafeEqual(digest(provided), digest(expected));
};
