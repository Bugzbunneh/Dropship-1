import { cacheLife, cacheTag } from "next/cache";
import { probeTag } from "./tags";

// A cached value that records when it was generated. The smoke test reads it, expires its tag
// through /api/revalidate and reads it again: a new timestamp proves the whole revalidation path
// works on the installed Next.js version. Re-run it after every Next.js upgrade.
export const readProbe = async (): Promise<number> => {
  "use cache";
  cacheTag(probeTag);
  cacheLife("hours");

  return Date.now();
};
