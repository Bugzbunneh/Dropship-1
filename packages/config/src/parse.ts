import type { z } from "zod";
import { storeConfigSchema, type StoreConfig, type StoreConfigInput } from "./store-config";

export class StoreConfigError extends Error {
  readonly issues: string[];

  constructor(storeLabel: string, issues: string[]) {
    super(
      `Invalid store config for ${storeLabel}:\n${issues.map((issue) => `  - ${issue}`).join("\n")}`,
    );
    this.name = "StoreConfigError";
    this.issues = issues;
  }
}

const describeIssue = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
  return `${path}: ${issue.message}`;
};

const labelFor = (input: unknown): string => {
  const hasSlug = typeof input === "object" && input !== null && "slug" in input;
  const slug = hasSlug ? (input as { slug: unknown }).slug : undefined;
  return typeof slug === "string" ? `"${slug}"` : "an unnamed store";
};

// Validates untrusted input and applies defaults. Throws StoreConfigError with one line per problem.
export const parseStoreConfig = (input: unknown): StoreConfig => {
  const result = storeConfigSchema.safeParse(input);
  if (result.success) {
    return result.data;
  }
  const issues = result.error.issues.map(describeIssue);
  throw new StoreConfigError(labelFor(input), issues);
};

// Used in each stores/<slug>/store.config.ts. The input is type-checked at the call site and
// validated at runtime, so a bad config fails the build rather than a customer's page.
export const defineStore = (input: StoreConfigInput): StoreConfig => parseStoreConfig(input);
