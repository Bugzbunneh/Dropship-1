"use client";

import { useEffect } from "react";
import { useCartStore } from "@/lib/cart/store";

// The customer has paid, so their cart has done its job. Cleared once, when this page appears.
export const ClearCart = () => {
  const clear = useCartStore((state) => state.clear);
  const hydrated = useCartStore((state) => state.hydrated);

  useEffect(() => {
    // wait for the saved cart to load first, or the emptied cart would be overwritten by it
    if (hydrated) {
      clear();
    }
  }, [clear, hydrated]);

  return null;
};
