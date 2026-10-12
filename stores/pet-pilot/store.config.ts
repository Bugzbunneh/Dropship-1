import { defineStore } from "@dropship/config";

// Placeholder pilot store for pet products. The name, domain and email address are stand-ins until
// the brand is chosen; nothing here is final.
//
// Colours follow the reference palette the owner picked: warm amber for dogs, teal for cats, on a
// warm cream page with charcoal ink. Amber cannot carry white text, so dog buttons use dark ink
// (8.5:1) and the per-pet `accent` is decorative only. stores/index.test.ts enforces every pairing.
export default defineStore({
  slug: "pet-pilot",
  name: "Pilot Pets",
  tagline: "Everything your dog or cat needs, delivered fast",
  domain: "pilot-pets.example.com",
  currency: "GBP",
  locale: "en-GB",
  shippingCountries: ["GB"],
  theme: {
    colours: {
      background: "#FFFBF5",
      foreground: "#33302C",
      primary: "#35302B",
      primaryForeground: "#FFFFFF",
      accent: "#C9B79C",
      muted: "#E9DFD0",
      surface: "#F6EFE4",
      emphasis: "#6B4A2F",
      sale: "#B7084E",
    },
    fonts: { heading: "Fraunces", body: "Nunito Sans" },
    radius: "lg",
  },
  departments: [
    {
      slug: "dogs",
      name: "Dogs",
      tagline: "For tails that never stop wagging",
      colours: {
        primary: "#F8B036",
        primaryForeground: "#2B2112",
        accent: "#C96F00",
        surface: "#FFF1D6",
        emphasis: "#8A5300",
      },
    },
    {
      slug: "cats",
      name: "Cats",
      tagline: "For curious, cosy, independent cats",
      colours: {
        primary: "#00808C",
        primaryForeground: "#FFFFFF",
        accent: "#3A9FC9",
        surface: "#E0F2F3",
        emphasis: "#00626C",
      },
    },
  ],
  home: {
    heading: "Happy pets, happy homes",
    subheading:
      "Beds, toys, treats and everyday essentials for dogs and cats, picked for quality and delivered within 5 working days.",
  },
  navigation: [
    { label: "Delivery", href: "/delivery" },
    { label: "Returns", href: "/returns" },
    { label: "FAQs", href: "/faq" },
    { label: "Contact", href: "/contact" },
  ],
  // Placeholder rates until real delivery costs are known (Phase 3, supplier selection).
  shipping: { flatRateMinor: 399, freeThresholdMinor: 3500 },
  // Legal details are filled in before launch. Policy pages flag anything missing here.
  business: {},
  email: {
    fromName: "Pilot Pets",
    fromAddress: "hello@pilot-pets.example.com",
  },
});
