import type { CSSProperties } from "react";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Signika_Negative } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { CartProvider } from "@/context/cart-context";
import ConditionalFooter from "@/components/conditional-footer";
import { AuthProvider } from "@/context/auth-context";
import WhatsappButton from "@/components/whatsapp-button";
import ChatButton from "@/components/ChatButton";
import { MessagesProvider } from "@/context/messages-context";
import { SiteSettingsProvider } from "@/context/site-settings-context";
import { ThemeModeSync } from "./theme-mode-sync";
import { getSiteSettings } from "@/lib/site-settings";
import CookieConsentBanner from "@/components/cookie-consent-banner";
import MaintenanceGate from "@/components/maintenance-gate";
import { getSiteName, getSocialLinks } from "@/utils/site-settings";
import { getTypographyFont } from "@/lib/typography-fonts";

const anton = localFont({
  src: "../../public/fonts/anton.woff2",
  variable: "--font-anton",
  display: "swap",
});

const signika = Signika_Negative({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-signika",
  display: "swap",
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getSiteSettings();

const siteName = getSiteName(settings);
  const title = settings.seo.defaultTitle?.trim() || siteName;
  const description = settings.seo.defaultDescription?.trim() || "";
  const faviconUrl = settings.brand.faviconUrl?.trim();
  const ogImage = settings.seo.ogImage?.trim();
  const socialLinks = getSocialLinks(settings);
  const twitterLink = socialLinks.find((item:any) => item.platform === "x");
  const twitterHandle = twitterLink?.handle ?? null;

  return {
    title,
    description,
    icons: faviconUrl ? { icon: faviconUrl } : undefined,
    openGraph: {
      type: "website",
      siteName,
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
      url: settings.seo.baseSlug?.trim() || undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
      site: twitterHandle ?? undefined,
      creator: twitterHandle ?? undefined,
    },
  } satisfies Metadata;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { settings, updatedAt, createdAt } = await getSiteSettings();
  const typographyFont = getTypographyFont(settings.typography.fontFamily);
  const htmlClassName = `${anton.variable} ${signika.variable} ${typographyFont.className}`.trim();
  const htmlStyle: CSSProperties = {
    ["--site-font-body" as string]: typographyFont.cssVariable,
    ["--site-font-heading" as string]: typographyFont.cssVariable,
  };

  return (
    <html lang="en" suppressHydrationWarning className={htmlClassName} style={htmlStyle}>
      <body className="antialiased font-site">
        <SiteSettingsProvider
          initialSettings={settings}
          initialUpdatedAt={updatedAt}
          initialCreatedAt={createdAt}
        >
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <ThemeModeSync />
            <AuthProvider>
              <CartProvider>
                <MessagesProvider>
                  <CookieConsentBanner initialSettings={settings} />
                  <MaintenanceGate
                    initialEnabled={settings.maintenance.enabled}
                    initialMessage={settings.maintenance.message}
                  >
                    <Toaster position="top-right" richColors /> {/* Configuración de Sonner */}
                    {children}
                    <WhatsappButton />
                    <ChatButton />
                    <ConditionalFooter />
                  </MaintenanceGate>
                </MessagesProvider>
              </CartProvider>
            </AuthProvider>
          </ThemeProvider>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
