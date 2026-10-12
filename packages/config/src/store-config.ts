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

// Fonts a store may choose. The storefront loads each one through next/font (self-hosted, with a
// matched fallback to avoid layout shift), and its Record<SupportedFont, ...> table fails to
// compile if one is missing, so this list and the storefront cannot drift apart.
export const SUPPORTED_FONTS = ["Fraunces", "Nunito Sans"] as const;
export type SupportedFont = (typeof SUPPORTED_FONTS)[number];

const fontNameSchema = z.enum(SUPPORTED_FONTS);

// Colour roles. Each has one job, so contrast can be checked per pairing (see contrast.ts):
//   background / foreground   page and body text
//   primary / primaryForeground   filled buttons and the text on them
//   surface                   tinted section backgrounds, text on it is `foreground` or `emphasis`
//   emphasis                  coloured headings, links and focus rings on `background` or `surface`
//   accent                    decoration only (shapes, icons, underlines), never behind text
//   muted                     borders and quiet fills
//   sale                      price drops and discount badges, white text on it
const themeSchema = z.object({
  colours: z.object({
    background: hexColourSchema,
    foreground: hexColourSchema,
    primary: hexColourSchema,
    primaryForeground: hexColourSchema,
    accent: hexColourSchema,
    muted: hexColourSchema,
    surface: hexColourSchema,
    emphasis: hexColourSchema,
    sale: hexColourSchema,
  }),
  fonts: z.object({
    heading: fontNameSchema,
    body: fontNameSchema,
  }),
  radius: z.enum(["none", "sm", "md", "lg"]).default("md"),
});

// Paths the app already uses, which a department slug must not shadow.
const RESERVED_PATH_SEGMENTS = [
  "api",
  "cart",
  "contact",
  "delivery",
  "faq",
  "placeholder",
  "privacy",
  "products",
  "returns",
  "robots",
  "search",
  "sitemap",
  "terms",
];

// A department (for example dogs or cats) is a section of the store with its own colours. It
// overrides only the roles that give a section its character; everything else comes from `theme`.
const departmentSchema = z.object({
  slug: z
    .string()
    .regex(/^[a-z][a-z0-9-]{1,20}$/, "use 2-21 lowercase letters, digits or hyphens")
    .refine(
      (slug) => !RESERVED_PATH_SEGMENTS.includes(slug),
      "this path is already used by the app",
    ),
  name: z.string().min(1),
  tagline: z.string().min(1),
  colours: z.object({
    primary: hexColourSchema,
    primaryForeground: hexColourSchema,
    accent: hexColourSchema,
    surface: hexColourSchema,
    emphasis: hexColourSchema,
  }),
});

const navigationItemSchema = z.object({
  label: z.string().min(1),
  href: z.string().startsWith("/"),
});

const shippingSchema = z
  .object({
    // Flat delivery charge, and the basket value above which delivery is free. Both in minor units.
    flatRateMinor: z.number().int().min(0).default(399),
    freeThresholdMinor: z.number().int().min(0).default(3500),
  })
  .default({ flatRateMinor: 399, freeThresholdMinor: 3500 });

// Who is selling. Needed on policy pages and in the footer; each field is shown only when set,
// and the policy pages mark anything still missing so it cannot be launched by accident.
const businessSchema = z
  .object({
    legalName: z.string().min(1).optional(),
    address: z.string().min(1).optional(),
    email: z.email().optional(),
    phone: z.string().min(1).optional(),
    companyNumber: z.string().min(1).optional(),
    vatNumber: z.string().min(1).optional(),
  })
  .default({});

const homeContentSchema = z.object({
  heading: z.string().min(1),
  subheading: z.string().min(1),
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
    // Days to send an item back. UK law gives at least 14 for online sales.
    returnsWindowDays: z.number().int().min(14).default(30),
    // Stays false until a solicitor has checked the delivery, returns, privacy and terms pages.
    // While false, those pages show a prominent "draft" notice so they cannot be launched by
    // accident (README risk R10).
    reviewed: z.boolean().default(false),
  })
  .default({ deliveryMaxWorkingDays: 5, returnsWindowDays: 30, reviewed: false });

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

export const storeConfigSchema = z
  .object({
    slug: slugSchema,
    name: z.string().min(1),
    tagline: z.string().optional(),
    domain: hostnameSchema,
    stagingDomain: hostnameSchema.optional(),
    currency: currencySchema,
    locale: localeSchema,
    shippingCountries: z.array(countrySchema).min(1),
    theme: themeSchema,
    departments: z.array(departmentSchema).min(1).max(6),
    home: homeContentSchema,
    // Secondary links shown in the footer's help column.
    navigation: z.array(navigationItemSchema).default([]),
    shipping: shippingSchema,
    business: businessSchema,
    supplierSources: z.array(supplierSourceSchema).default([]),
    pricingRules: pricingRulesSchema,
    policies: policiesSchema,
    analytics: analyticsSchema,
    email: emailSchema,
    stripe: stripeSchema,
  })
  .refine(
    (config) => new Set(config.departments.map((d) => d.slug)).size === config.departments.length,
    { message: "department slugs must be unique", path: ["departments"] },
  );

export type StoreConfig = z.output<typeof storeConfigSchema>;
export type StoreConfigInput = z.input<typeof storeConfigSchema>;
