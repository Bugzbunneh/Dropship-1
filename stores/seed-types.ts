// The shape of a store's demo catalog. One definition feeds three things: the script that seeds the
// hosted database, the offline "fixtures" mode that lets CI and local development run without
// credentials, and the storefront's unit tests.

export type SeedCollection = {
  slug: string;
  title: string;
  department: string;
  description: string;
  sortOrder: number;
};

export type SeedVariant = {
  sku: string;
  title: string;
  priceMinor: number;
  // the "was" price, shown struck through; must be above priceMinor
  compareAtMinor?: number;
  // the choices that make this variant, for example { Size: "Medium", Colour: "Grey" }
  options?: Record<string, string>;
  isAvailable?: boolean;
};

export type SeedProduct = {
  slug: string;
  title: string;
  brand: string;
  department: string;
  // slugs of the collections this product belongs to; the first is its main one
  collections: string[];
  summary: string;
  description: string[];
  tags: string[];
  featured?: boolean;
  // how many placeholder images to generate; real photos replace them at supplier import
  imageCount?: number;
  variants: SeedVariant[];
};

export type SeedCatalog = {
  collections: SeedCollection[];
  products: SeedProduct[];
};
