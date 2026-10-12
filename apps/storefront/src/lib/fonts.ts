import { Fraunces, Nunito_Sans } from "next/font/google";

// Self-hosted at build time and preloaded. `optional` means a font that is not ready within about
// 100ms is skipped for that page view (and used from the next one), so a slow connection never sees
// text reflow when it arrives (layout shift). The variable names must match ./font-stacks.ts.
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "optional" });
const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  display: "optional",
});

// Applied to <html>. Every supported font is declared, but the browser only downloads the ones
// the page's CSS actually uses.
export const fontClassNames = [fraunces.variable, nunitoSans.variable].join(" ");
