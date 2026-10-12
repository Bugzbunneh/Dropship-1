"use client";

import { ShoppingBag } from "lucide-react";
import { useCartCount } from "@/lib/cart/use-cart";
import { useCartStore } from "@/lib/cart/store";

// The bag icon in the header. Opens the cart drawer.
export const CartButton = () => {
  const count = useCartCount();
  const openDrawer = useCartStore((state) => state.openDrawer);

  return (
    <button
      type="button"
      onClick={openDrawer}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground transition hover:bg-surface"
      aria-label={count > 0 ? `Open cart, ${count} ${count === 1 ? "item" : "items"}` : "Open cart"}
      data-testid="cart-button"
    >
      <ShoppingBag aria-hidden="true" className="h-6 w-6" />
      {count > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-sale px-1 text-xs font-bold text-white"
        >
          {count}
        </span>
      ) : null}
    </button>
  );
};
