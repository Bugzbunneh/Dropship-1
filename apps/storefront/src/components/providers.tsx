"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { CART_STORAGE_KEY, useCartStore } from "@/lib/cart/store";
import { StoreSettingsProvider, type StoreSettings } from "./store-settings";

// Reads the saved cart once the page has loaded, and again whenever another tab changes it.
const CartHydrator = () => {
  useEffect(() => {
    void useCartStore.persist.rehydrate();

    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) {
        void useCartStore.persist.rehydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return null;
};

type ProvidersProps = {
  settings: StoreSettings;
  children: ReactNode;
};

export const Providers = ({ settings, children }: ProvidersProps) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
      }),
  );

  return (
    <StoreSettingsProvider settings={settings}>
      <QueryClientProvider client={queryClient}>
        <CartHydrator />
        {children}
      </QueryClientProvider>
    </StoreSettingsProvider>
  );
};
