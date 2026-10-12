"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useStoreSettings } from "@/components/store-settings";
import { lookupCartVariants } from "./actions";
import { countItems } from "./lines";
import { useCartStore } from "./store";
import { summariseCart, type CartSummary } from "./totals";

// The cart as the interface shows it: saved lines joined to today's catalog data and totalled.
export const useCartSummary = (): {
  summary: CartSummary;
  hydrated: boolean;
  isPricing: boolean;
  failed: boolean;
} => {
  const lines = useCartStore((state) => state.lines);
  const hydrated = useCartStore((state) => state.hydrated);
  const { shipping } = useStoreSettings();

  const variantIds = useMemo(() => lines.map((line) => line.variantId).sort(), [lines]);

  const query = useQuery({
    queryKey: ["cart-variants", variantIds],
    queryFn: () => lookupCartVariants(variantIds),
    enabled: hydrated && variantIds.length > 0,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const summary = useMemo(
    () => summariseCart(lines, query.data ?? [], shipping),
    [lines, query.data, shipping],
  );

  return {
    summary,
    hydrated,
    isPricing: variantIds.length > 0 && query.data === undefined && !query.isError,
    failed: query.isError,
  };
};

// How many items to show on the cart icon. Zero until the saved cart has loaded.
export const useCartCount = (): number => {
  const lines = useCartStore((state) => state.lines);
  const hydrated = useCartStore((state) => state.hydrated);
  return hydrated ? countItems(lines) : 0;
};
