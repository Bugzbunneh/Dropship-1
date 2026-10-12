"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addLine, removeLine, sanitiseLines, setLineQuantity, type CartLine } from "./lines";

// The visitor's cart, kept in their browser so it survives reloads and return visits. It holds
// only variant ids and quantities; everything else is looked up fresh (see actions.ts).

type CartState = {
  lines: CartLine[];
  // false until the saved cart has been read, so the first render matches the server's
  hydrated: boolean;
  drawerOpen: boolean;
  addItem: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
};

export const CART_STORAGE_KEY = "dropship-cart";

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      hydrated: false,
      drawerOpen: false,
      addItem: (variantId, quantity = 1) =>
        set((state) => ({ lines: addLine(state.lines, variantId, quantity) })),
      setQuantity: (variantId, quantity) =>
        set((state) => ({ lines: setLineQuantity(state.lines, variantId, quantity) })),
      removeItem: (variantId) => set((state) => ({ lines: removeLine(state.lines, variantId) })),
      clear: () => set({ lines: [] }),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: CART_STORAGE_KEY,
      version: 1,
      // Read the saved cart after the first render (see CartHydrator), so server and browser agree.
      skipHydration: true,
      partialize: (state) => ({ lines: state.lines }),
      // Saved data may be old, edited or corrupt, so keep only what is valid.
      merge: (saved, current) => ({
        ...current,
        lines: sanitiseLines((saved as { lines?: unknown } | undefined)?.lines),
      }),
      onRehydrateStorage: () => () => {
        useCartStore.setState({ hydrated: true });
      },
    },
  ),
);
