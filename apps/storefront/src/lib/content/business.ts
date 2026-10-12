import type { StoreConfig } from "@dropship/config";

// What the law expects a UK online seller to show customers, so the policy pages can say what is
// still missing rather than going live with gaps. Company and VAT numbers are only needed if they
// apply, so they are not required here.

type Business = StoreConfig["business"];

export const missingBusinessDetails = (business: Business): string[] => {
  const missing: string[] = [];
  if (!business.legalName) {
    missing.push("legal or trading name");
  }
  if (!business.address) {
    missing.push("postal address");
  }
  if (!business.email) {
    missing.push("contact email address");
  }
  return missing;
};

// True when nothing stands between these pages and launch.
export const policiesReadyForLaunch = (
  config: Pick<StoreConfig, "business" | "policies">,
): boolean => config.policies.reviewed && missingBusinessDetails(config.business).length === 0;
