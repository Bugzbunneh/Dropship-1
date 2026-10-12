"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const INTERVAL_MS = 2_500;
const MAX_REFRESHES = 16;

// Stripe tells us about a payment a moment after the customer returns to the site, so the page
// may be seen before the order has been marked paid. This asks the server for a fresh copy every
// couple of seconds (for about 40 seconds) until it has, then stops by being removed from the page.
export const OrderRefresher = () => {
  const router = useRouter();

  useEffect(() => {
    let refreshes = 0;
    const timer = setInterval(() => {
      refreshes += 1;
      router.refresh();
      if (refreshes >= MAX_REFRESHES) {
        clearInterval(timer);
      }
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [router]);

  return null;
};
