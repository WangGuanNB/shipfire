import "@/app/globals.css";

import { getLocale, setRequestLocale } from "next-intl/server";
import { locales } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import Script from "next/script";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  setRequestLocale(locale);

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "";
  const googleAdsenseCode = process.env.NEXT_PUBLIC_GOOGLE_ADCODE || "";
  const googleAnalyticsId = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || "";

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        {/* Google Analytics ID - 作为备用方案，供客户端组件读取 */}
        {googleAnalyticsId && (
          <meta name="ga-id" content={googleAnalyticsId} />
        )}
        {googleAdsenseCode && (
          <>
            <meta name="google-adsense-account" content={googleAdsenseCode} />
            <script 
              async 
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${googleAdsenseCode}`}
              crossOrigin="anonymous"
            />
          </>
        )}

        <link rel="icon" href="/logo.ico" />

        {locales &&
          locales.map((loc) => (
            <link
              key={loc}
              rel="alternate"
              hrefLang={loc}
              href={`${webUrl}${loc === "en" ? "" : `/${loc}`}/`}
            />
          ))}
        <link rel="alternate" hrefLang="x-default" href={webUrl} />
      </head>
      <body className={cn("min-h-screen overflow-x-hidden", inter.variable)}>
        {children}
        <Script id="enforce-external-nofollow" strategy="afterInteractive">
          {`
            (function(){
              try{
                var anchors = document.querySelectorAll('a[href^="http"], a[target="_blank"]');
                anchors.forEach(function(a){
                  var isExternal = a.host && a.host !== window.location.host;
                  if(isExternal){
                    var rel = (a.getAttribute('rel') || '').split(/\\s+/).filter(Boolean);
                    // always keep opener/noreferrer for security
                    ['noopener','noreferrer'].forEach(function(flag){
                      if(!rel.includes(flag)) rel.push(flag);
                    });
                    var isFooterBadge = a.hasAttribute('data-footer-badge');
                    var allowDofollow = a.hasAttribute('data-dofollow');
                    if(isFooterBadge){
                      // Footer badges default to nofollow unless explicitly approved
                      if(allowDofollow){
                        rel = rel.filter(function(flag){ return flag !== 'nofollow'; });
                      } else if(!rel.includes('nofollow')){
                        rel.push('nofollow');
                      }
                    } else {
                      // Non-badge externals: keep shipfire prior policy (default nofollow)
                      if(!rel.includes('nofollow')) rel.push('nofollow');
                    }
                    a.setAttribute('rel', rel.join(' ').trim());
                  }
                });
              }catch(e){}
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
