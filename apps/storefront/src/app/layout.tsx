import type { Metadata, Viewport } from "next";
import type { CSSProperties, ReactNode } from "react";
import { AnnouncementBar } from "@/components/announcement-bar";
import { CartDrawer } from "@/components/cart-drawer";
import { JsonLd } from "@/components/json-ld";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { StoreSettings } from "@/components/store-settings";
import { fontClassNames } from "@/lib/fonts";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/jsonld";
import { indexingAllowed, siteOrigin } from "@/lib/site";
import { getStoreConfig } from "@/lib/store";
import { themeToCssVariables } from "@/lib/theme";
import "./globals.css";

export const generateMetadata = async (): Promise<Metadata> => {
  const config = await getStoreConfig();
  const description = config.home.subheading;

  return {
    metadataBase: new URL(siteOrigin(config)),
    title: {
      default: `${config.name}: ${config.tagline ?? "Pet supplies"}`,
      template: `%s | ${config.name}`,
    },
    description,
    applicationName: config.name,
    openGraph: {
      type: "website",
      siteName: config.name,
      locale: config.locale.replace("-", "_"),
      title: config.name,
      description,
    },
    twitter: { card: "summary_large_image", title: config.name, description },
    robots: indexingAllowed() ? { index: true, follow: true } : { index: false, follow: false },
  };
};

export const generateViewport = async (): Promise<Viewport> => {
  const config = await getStoreConfig();
  return { themeColor: config.theme.colours.background, width: "device-width", initialScale: 1 };
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = async ({ children }: RootLayoutProps) => {
  const config = await getStoreConfig();
  const origin = siteOrigin(config);

  const settings: StoreSettings = {
    name: config.name,
    currency: config.currency,
    locale: config.locale,
    shipping: config.shipping,
    deliveryMaxWorkingDays: config.policies.deliveryMaxWorkingDays,
    departments: config.departments.map(({ slug, name }) => ({ slug, name })),
  };

  return (
    <html
      lang={config.locale}
      className={fontClassNames}
      style={themeToCssVariables(config.theme) as CSSProperties}
    >
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers settings={settings}>
          <AnnouncementBar />
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <CartDrawer />
        </Providers>
        <JsonLd
          data={[
            organizationJsonLd({ name: config.name, origin, email: config.business.email }),
            websiteJsonLd({ name: config.name, origin }),
          ]}
        />
      </body>
    </html>
  );
};

export default RootLayout;
