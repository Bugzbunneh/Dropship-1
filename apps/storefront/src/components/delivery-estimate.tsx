"use client";

import { Truck } from "lucide-react";
import { useSyncExternalStore } from "react";
import {
  estimateDelivery,
  formatShortDate,
  type DeliveryEstimate as Estimate,
} from "@/lib/delivery/working-days";
import { cn } from "@/lib/ui";
import { useStoreSettings } from "./store-settings";

const ONE_MINUTE_MS = 60_000;

// The current minute, as a number, read from the visitor's clock. On the server (where the page is
// built ahead of time and so cannot know what day it is for the visitor) it is null. Ticking each
// minute means the date moves on at midnight without a reload.
const subscribeToClock = (onTick: () => void): (() => void) => {
  const timer = setInterval(onTick, ONE_MINUTE_MS);
  return () => clearInterval(timer);
};
const currentMinute = (): number => Math.floor(Date.now() / ONE_MINUTE_MS);
const noMinuteOnServer = (): null => null;

type DeliveryEstimateProps = {
  className?: string;
};

// "Order today, delivered by Mon 19 Oct". Until the visitor's clock is read, and whenever a date
// can't be trusted, it states the promise without a date.
export const DeliveryEstimate = ({ className }: DeliveryEstimateProps) => {
  const { deliveryMaxWorkingDays, locale } = useStoreSettings();
  const minute = useSyncExternalStore(subscribeToClock, currentMinute, noMinuteOnServer);
  const estimate: Estimate | null =
    minute === null
      ? null
      : estimateDelivery(new Date(minute * ONE_MINUTE_MS), deliveryMaxWorkingDays);

  return (
    <p className={cn("flex items-start gap-3", className)} data-testid="delivery-estimate">
      <Truck aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emphasis" />
      <span>
        {estimate?.kind === "date" ? (
          <>
            Order today, delivered by{" "}
            <strong className="font-bold">{formatShortDate(estimate.latest, locale)}</strong>
          </>
        ) : (
          <>
            Delivered within{" "}
            <strong className="font-bold">{deliveryMaxWorkingDays} working days</strong>
          </>
        )}
      </span>
    </p>
  );
};
