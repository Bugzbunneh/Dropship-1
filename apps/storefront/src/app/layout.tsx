import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import SiteFooter from "@/components/site-footer";
import SiteHeader from "@/components/site-header";
import { getStoreConfig } from "@/lib/store";
import { themeToCssVariables } from "@/lib/theme";
import "./globals.css";

export const generateMetadata = async (): Promise<Metadata> => {
  const store = await getStoreConfig();

  return {
    title: { default: store.name, template: `%s | ${store.name}` },
    description: store.tagline,
    metadataBase: new URL(`https://${store.domain}`),
  };
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = async ({ children }: RootLayoutProps) => {
  const store = await getStoreConfig();
  const themeVariables = themeToCssVariables(store.theme) as CSSProperties;

  return (
    <html lang={store.locale} style={themeVariables}>
      <body className="flex min-h-screen flex-col">
        <SiteHeader storeName={store.name} navigation={store.navigation} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">{children}</main>
        <SiteFooter storeName={store.name} />
      </body>
    </html>
  );
};

export default RootLayout;
