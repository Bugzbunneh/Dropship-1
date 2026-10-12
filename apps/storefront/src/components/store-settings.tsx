"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { ShippingRules } from "@/lib/shipping";
import { formatMoney } from "@/lib/money";

// The few store settings client components need (formatting money, delivery promises, free
// delivery thresholds). Passed down once from the root layout rather than re-fetched.

export type StoreSettings = {
  name: string;
  currency: string;
  locale: string;
  shipping: ShippingRules;
  deliveryMaxWorkingDays: number;
  departments: { slug: string; name: string }[];
};

const StoreSettingsContext = createContext<StoreSettings | null>(null);

type ProviderProps = {
  settings: StoreSettings;
  children: ReactNode;
};

export const StoreSettingsProvider = ({ settings, children }: ProviderProps) => (
  <StoreSettingsContext value={settings}>{children}</StoreSettingsContext>
);

export const useStoreSettings = (): StoreSettings => {
  const settings = useContext(StoreSettingsContext);
  if (!settings) {
    throw new Error("useStoreSettings must be used inside StoreSettingsProvider");
  }
  return settings;
};

export const useMoney = (): ((minor: number) => string) => {
  const { currency, locale } = useStoreSettings();
  return (minor) => formatMoney(minor, currency, locale);
};
