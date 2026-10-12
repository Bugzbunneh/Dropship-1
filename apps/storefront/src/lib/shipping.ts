// Delivery charges are decided in @dropship/core so the cart on screen and the order charged at
// checkout use one function and cannot disagree. Re-exported here for the components that show them.
export {
  freeShippingProgress,
  remainingForFreeShippingMinor,
  shippingChargeMinor,
  type ShippingRules,
} from "@dropship/core";
