import { cacheLife } from "next/cache";

// The year for the footer's copyright line. Reading the clock while a page is being pre-built
// would freeze it into the build, so it is read inside a cache that refreshes every day instead.
export const getCurrentYear = async (): Promise<number> => {
  "use cache";
  cacheLife("days");

  return new Date().getFullYear();
};
