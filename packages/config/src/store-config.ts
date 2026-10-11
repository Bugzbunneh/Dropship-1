import { z } from "zod";

// Money and rates are integers everywhere (design principle 4), so percentages are basis points:
// 4000 means 40%.

const slugSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]{1,30}[a-z0-9]$/, "use 3-32 lowercase letters, digits or hyphens");

const hostnameSchema = z
  .string()
  .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/, "use a bare hostname such as shop.example.com");

const currencySchema = z.string().regex(/^[A-Z]{3}$/, "use an ISO 4217 code such as GBP");

const countrySchema = z.string().regex(/^[A-Z]{2}$/, "use an ISO 3166 alpha-2 code such as GB");

const localeSchema = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, "use a locale such as en-GB");

const hexColourSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "use a 6-digit hex colour");

const envVarNameSchema = z.string().regex(/^[A-Z][A-Z0-9_]*$/, "use an UPPER_SNAKE_CASE name");

// Font names end up inside a CSS value, so only plain family names are allowed.
const fontNameSchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9 -]{0,40}$/, "use a plain font family name such as Inter");

const themeSchema = z.object({
  colours: z.object({
    background: hexColourSchema,
    foreground: hexColourSchema,
    primary: hexColourSchema,
    primaryForeground: hexColourSchema,
    accent: hexColourSchema,
    muted: hexColourSchema,
  }),
  fonts: z.object({
    heading: fontNameSchema,
    body: fontNameSchema,
  }),
  radius: z.enum(["none", "sm", "md", "lg"]).default("md"),
});

const navigationItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().startsWith("/"),
});

const supplierSourceSchema = z.object({
  // Matches an adapter registered in @dropship/suppliers once that package exists.
  supplier: z.string().min(1),
  // Supplier-side account or feed identifier. Credentials never live in config.
  accountRef: z.string().min(1).optional(),
});

const pricingRulesSchema = z
  .object({
    markupBps: z.number().int().min(0).default(4000),
    marginFloorBps: z.number().int().min(0).default(2000),
    rounding: z.enum(["none", "ends-99", "whole-unit"]).default("ends-99"),
    // Largest price change a single sync run may apply to one product before it needs approval.
    maxPriceChangeBpsPerSync: z.number().int().min(0).default(2000),
  })
  .default({
    markupBps: 4000,
    marginFloorBps: 2000,
    rounding: "ends-99",
    maxPriceChangeBpsPerSync: 2000,
  });

const policiesSchema = z
  .object({
    // The delivery promise from the README: order placed to delivered, in working days.
    deliveryMaxWorkingDays: z.number().int().min(1).max(30).default(5),
    returnsWindowDays: z.number().int().min(14).default(30),
    // Paths to policy page copy, relative to the store folder.
    pages: z
      .object({
        delivery: z.string().optional(),
        returns: z.string().optional(),
        privacy: z.string().optional(),
        terms: z.string().optional(),
      })
      .default({}),
  })
  .default({ deliveryMaxWorkingDays: 5, returnsWindowDays: 30, pages: {} });

const analyticsSchema = z
  .object({
    googleAnalyticsId: z.string().optional(),
    metaPixelId: z.string().optional(),
  })
  .default({});

const emailSchema = z.object({
  fromName: z.string().min(1),
  fromAddress: z.email(),
  replyTo: z.email().optional(),
});

// Names of the environment variables that hold this store's Stripe keys. The keys themselves
// never appear in the repo.
const stripeSchema = z
  .object({
    publishableKeyEnv: envVarNameSchema.default("STRIPE_PUBLISHABLE_KEY"),
    secretKeyEnv: envVarNameSchema.default("STRIPE_SECRET_KEY"),
    webhookSecretEnv: envVarNameSchema.default("STRIPE_WEBHOOK_SECRET"),
  })
  .default({
    publishableKeyEnv: "STRIPE_PUBLISHABLE_KEY",
    secretKeyEnv: "STRIPE_SECRET_KEY",
    webhookSecretEnv: "STRIPE_WEBHOOK_SECRET",
  });

export const storeConfigSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1),
  tagline: z.string().optional(),
  domain: hostnameSchema,
  stagingDomain: hostnameSchema.optional(),
  currency: currencySchema,
  locale: localeSchema,
  shippingCountries: z.array(countrySchema).min(1),
  theme: themeSchema,
  navigation: z.array(navigationItemSchema).default([]),
  supplierSources: z.array(supplierSourceSchema).default([]),
  pricingRules: pricingRulesSchema,
  policies: policiesSchema,
  analytics: analyticsSchema,
  email: emailSchema,
  stripe: stripeSchema,
});

export type StoreConfig = z.output<typeof storeConfigSchema>;
export type StoreConfigInput = z.input<typeof storeConfigSchema>;
