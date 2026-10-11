import { loadActiveStoreConfig } from "@dropship/stores";
import { cache } from "react";

// The store this deployment serves, chosen by the STORE environment variable.
export const getStoreConfig = cache(() => loadActiveStoreConfig());
