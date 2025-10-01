"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";

import type { SiteSettings } from "@/context/site-settings-schema";
import { useSiteSettings } from "@/context/site-settings-context";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "site-cookie-consent";

interface CookieConsentBannerProps {
  initialSettings: SiteSettings;
}

export default function CookieConsentBanner({ initialSettings }: CookieConsentBannerProps) {
  const { settings: contextSettings } = useSiteSettings();
  const settings = contextSettings ?? initialSettings;

  const privacy = settings.privacy;
  const integrations = settings.integrations;
  const gaId = integrations.gaId?.trim() || null;
  const pixelId = integrations.metaPixelId?.trim() || null;
  const shouldRequireConsent = Boolean(privacy.cookieBanner && integrations.loadOnCookieAccept);

  const [hasAcknowledged, setHasAcknowledged] = useState<boolean>(() => !privacy.cookieBanner);

  useEffect(() => {
    if (!privacy.cookieBanner) {
      setHasAcknowledged(true);
      return;
    }

    try {
      const storedValue = window.localStorage.getItem(STORAGE_KEY);
      setHasAcknowledged(storedValue === "accepted");
    } catch {
      setHasAcknowledged(false);
    }
  }, [privacy.cookieBanner]);

  const handleAccept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // Ignore storage errors (private mode, etc.).
    }
    setHasAcknowledged(true);
  };

  const shouldLoadScripts = !shouldRequireConsent || hasAcknowledged;
  const showBanner = privacy.cookieBanner && !hasAcknowledged;

  const acceptText = privacy.acceptText?.trim() || "Aceptar";
  const cookieText = privacy.cookieText?.trim() || "Este sitio utiliza cookies para mejorar tu experiencia.";

  const scriptElements = useMemo(() => {
    if (!shouldLoadScripts) {
      return null;
    }

    return (
      <>
        {gaId ? (
          <>
            <Script
              id="ga-script"
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            />
            <Script id="ga-inline" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}');
              `}
            </Script>
          </>
        ) : null}
        {pixelId ? (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${pixelId}');
              fbq('track', 'PageView');
            `}
          </Script>
        ) : null}
      </>
    );
  }, [gaId, pixelId, shouldLoadScripts]);

  return (
    <>
      {scriptElements}
      {showBanner ? (
        <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4 sm:px-6 sm:pb-6">
          <div className="max-w-3xl rounded-lg bg-background shadow-lg ring-1 ring-border">
            <div className="flex flex-col gap-4 p-6 text-sm text-foreground sm:flex-row sm:items-center sm:gap-6">
              <p className="flex-1 text-sm text-muted-foreground">{cookieText}</p>
              <Button onClick={handleAccept} id="cookie-banner-accept">
                {acceptText}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}