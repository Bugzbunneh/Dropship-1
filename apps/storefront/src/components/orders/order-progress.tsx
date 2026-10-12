import { customerStageOf, type CustomerStage, type OrderStatus } from "@dropship/core";
import { Check, House, PackageOpen, ReceiptText, Truck } from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/ui";

type Step = {
  label: string;
  Icon: ComponentType<{ className?: string; "aria-hidden"?: "true" }>;
};

const STEPS: readonly Step[] = [
  { label: "Order placed", Icon: ReceiptText },
  { label: "Being prepared", Icon: PackageOpen },
  { label: "On its way", Icon: Truck },
  { label: "Delivered", Icon: House },
];

// How many of the steps are finished, and which one is under way, for each stage.
const progressOf = (stage: CustomerStage): { done: number; current: number | null } => {
  switch (stage) {
    case "awaiting_payment":
      return { done: 0, current: 0 };
    case "preparing":
    case "attention":
      return { done: 1, current: 1 };
    case "on_its_way":
      return { done: 2, current: 2 };
    case "delivered":
      return { done: 4, current: null };
    case "refunded":
    case "cancelled":
      return { done: 0, current: null };
  }
};

// Four steps from "Order placed" to "Delivered". Cancelled and refunded orders have no journey to
// show, so the page explains them in words instead (see OrderNotice).
export const OrderProgress = ({ status }: { status: OrderStatus }) => {
  const { done, current } = progressOf(customerStageOf(status));

  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Order progress" data-testid="order-progress">
      {STEPS.map(({ label, Icon }, index) => {
        const isDone = index < done;
        const isCurrent = index === current;
        return (
          <li
            key={label}
            aria-current={isCurrent ? "step" : undefined}
            className="flex flex-col items-center gap-2 text-center"
          >
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-full border-2",
                isDone && "border-emphasis bg-emphasis text-background",
                isCurrent && "border-emphasis bg-background text-emphasis",
                !isDone && !isCurrent && "border-muted bg-background text-foreground/55",
              )}
            >
              {isDone ? (
                <Check aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Icon aria-hidden="true" className="h-5 w-5" />
              )}
            </span>
            <span
              className={cn(
                "text-xs font-semibold sm:text-sm",
                !isDone && !isCurrent && "text-foreground/80",
              )}
            >
              {label}
              <span className="sr-only">{isDone ? " (done)" : isCurrent ? " (now)" : ""}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
};
