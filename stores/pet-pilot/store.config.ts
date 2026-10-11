import { defineStore } from "@dropship/config";

// Placeholder pilot store for pet products. The name, domain, colours and email address are
// stand-ins until the brand is chosen; nothing here is final.
export default defineStore({
  slug: "pet-pilot",
  name: "Pilot Pets",
  tagline: "Placeholder store for the pet products pilot",
  domain: "pilot-pets.example.com",
  currency: "GBP",
  locale: "en-GB",
  shippingCountries: ["GB"],
  theme: {
    colours: {
      background: "#fffaf3",
      foreground: "#1f2933",
      primary: "#2f6f5e",
      primaryForeground: "#ffffff",
      accent: "#e8a33d",
      muted: "#f1ebe0",
    },
    fonts: { heading: "Inter", body: "Inter" },
    radius: "lg",
  },
  navigation: [
    { label: "Shop", href: "/collections" },
    { label: "Delivery", href: "/delivery" },
    { label: "Returns", href: "/returns" },
    { label: "Contact", href: "/contact" },
  ],
  email: {
    fromName: "Pilot Pets",
    fromAddress: "hello@pilot-pets.example.com",
  },
});
