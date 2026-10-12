"use client";

import { ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCartStore } from "@/lib/cart/store";
import { useCartSummary } from "@/lib/cart/use-cart";
import { buttonClasses } from "@/lib/ui";
import { CartLines, FreeShippingBar } from "./cart-lines";
import { OrderSummary } from "./order-summary";
import { useStoreSettings } from "./store-settings";

// The slide-in cart. A native <dialog>, so focus is trapped inside while it is open, Escape closes
// it and focus returns to the button that opened it, all without extra code.
export const CartDrawer = () => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = useCartStore((state) => state.drawerOpen);
  const closeDrawer = useCartStore((state) => state.closeDrawer);
  const { summary, hydrated, isPricing } = useCartSummary();
  const { departments } = useStoreSettings();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const isEmpty = hydrated && summary.lines.length === 0;

  return (
    <dialog
      ref={dialogRef}
      className="drawer fixed inset-y-0 left-auto right-0 w-full max-w-md"
      aria-labelledby="cart-drawer-title"
      onClose={closeDrawer}
      onClick={(event) => {
        // a click on the dimmed area (the dialog element itself) closes it
        if (event.target === dialogRef.current) {
          closeDrawer();
        }
      }}
      data-testid="cart-drawer"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-muted px-5 py-4">
          <h2 id="cart-drawer-title" className="text-xl font-bold">
            Your cart
            {summary.itemCount > 0 ? (
              <span className="ml-2 text-base font-semibold text-foreground/70">
                ({summary.itemCount})
              </span>
            ) : null}
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close cart"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-surface"
          >
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {isEmpty ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-surface">
                <ShoppingBag aria-hidden="true" className="h-8 w-8 text-emphasis" />
              </span>
              <p className="font-heading text-xl font-semibold">Your cart is empty</p>
              <p className="text-foreground/75">Let’s find something your pet will love.</p>
              <div className="flex flex-wrap justify-center gap-3">
                {departments.map((department) => (
                  <Link
                    key={department.slug}
                    href={`/${department.slug}`}
                    onClick={closeDrawer}
                    className={buttonClasses("secondary", "md")}
                  >
                    Shop {department.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <FreeShippingBar summary={summary} />
              {isPricing && summary.lines.length > 0 ? (
                <p className="text-sm text-foreground/70" role="status">
                  Updating prices…
                </p>
              ) : null}
              <CartLines summary={summary} compact />
            </div>
          )}
        </div>

        {!isEmpty ? (
          <div className="space-y-4 border-t border-muted bg-surface/50 px-5 py-5">
            <OrderSummary summary={summary} />
            <Link
              href="/cart"
              onClick={closeDrawer}
              className={buttonClasses("secondary", "md", "w-full")}
            >
              View full cart
            </Link>
          </div>
        ) : null}
      </div>
    </dialog>
  );
};
