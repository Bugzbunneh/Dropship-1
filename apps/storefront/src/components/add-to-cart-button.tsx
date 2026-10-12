"use client";

import { Check, ShoppingBag } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCartStore } from "@/lib/cart/store";
import { buttonClasses } from "@/lib/ui";

type AddToCartButtonProps = {
  variantId: string;
  productTitle: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const CONFIRMATION_MS = 1800;

// One-click add from a product card. It opens the cart drawer so the visitor sees what they have
// and how close they are to free delivery, then returns to normal.
export const AddToCartButton = ({
  variantId,
  productTitle,
  size = "md",
  className,
}: AddToCartButtonProps) => {
  const addItem = useCartStore((state) => state.addItem);
  const openDrawer = useCartStore((state) => state.openDrawer);
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleClick = () => {
    addItem(variantId, 1);
    openDrawer();
    setJustAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(false), CONFIRMATION_MS);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={buttonClasses("primary", size, className)}
      aria-label={justAdded ? `Added to cart: ${productTitle}` : `Add to cart: ${productTitle}`}
    >
      {justAdded ? (
        <Check aria-hidden="true" className="h-4 w-4" />
      ) : (
        <ShoppingBag aria-hidden="true" className="h-4 w-4" />
      )}
      <span aria-hidden="true">{justAdded ? "Added" : "Add to cart"}</span>
    </button>
  );
};
