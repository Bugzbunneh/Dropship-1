import { Truck } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { getStoreConfig } from "@/lib/store";

// A thin strip at the very top that states the delivery promise and the free delivery threshold on
// every page. Both come from the store's config, so they can't drift from what the store does.
export const AnnouncementBar = async () => {
  const config = await getStoreConfig();
  const threshold = formatMoney(config.shipping.freeThresholdMinor, config.currency, config.locale);

  return (
    <div className="bg-foreground text-background">
      <p className="container-page flex items-center justify-center gap-2 py-2 text-center text-sm font-semibold">
        <Truck aria-hidden="true" className="h-4 w-4 shrink-0" />
        <span>
          Free UK delivery over {threshold}
          <span className="hidden sm:inline">
            {" "}
            · Delivered within {config.policies.deliveryMaxWorkingDays} working days
          </span>
        </span>
      </p>
    </div>
  );
};
