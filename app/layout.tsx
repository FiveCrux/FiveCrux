import type React from "react"
import type { Metadata } from "next"
import { Chakra_Petch } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/providers/theme-provider"
import SessionProvider from "@/providers/session-provider"
import { QueryProvider } from "@/providers/query-provider"
import { Toaster } from "@/componentss/ui/toaster"
import { Toaster as Sonner } from "@/componentss/ui/sonner"
import { AutoCheckWrapper } from "@/components/auto-check-wrapper"
import { Analytics } from "@vercel/analytics/next"
import FirebaseAnalytics from "@/componentss/FirebaseAnalytics"
import ImpersonationWidget from "@/componentss/dev/impersonation-widget"
import { safeJsonLd } from "@/lib/json-ld"
import {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  BING_SITE_VERIFICATION,
  canonicalUrl,
} from "@/lib/seo"
// Chakra Petch — squared terminals, reads as FiveM/server-panel rather than
// generic SaaS. It ships no weight above 700, so the weights are listed
// explicitly: asking for 800/900 anywhere would silently synthesise a fake bold.
const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  /* Without metadataBase, Next resolves every relative OG/canonical URL against
     localhost in dev and against the deployment URL in production — which for a
     Vercel project is the preview alias, not the domain people search for. */
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: { canonical: canonicalUrl("/") },
  openGraph: {
    type: "website",
    url: canonicalUrl("/"),
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: SITE_TITLE, description: SITE_DESCRIPTION },
  /* Bing verifies a hostname, and the property it had verified was the apex —
     which serves nothing. This is the www token, so the property that actually
     answers can be verified. */
  verification: { other: { "msvalidate.01": BING_SITE_VERIFICATION } },
}

/* Organization and WebSite, once, on every page. Organization is what ties the
   brand's name, logo and support address into one entity search engines can
   recognise; WebSite is what makes a sitelinks search box possible. Neither
   existed — the only structured data on the site was per-product. */
const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: canonicalUrl("/"),
      logo: canonicalUrl("/fivecrux-logo.png"),
      description: SITE_DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: canonicalUrl("/"),
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${canonicalUrl("/scripts")}?search={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(SITE_JSON_LD) }}
        />
      </head>
      <body className={chakraPetch.className}>
        <SessionProvider>
          <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
              <AutoCheckWrapper>
              <FirebaseAnalytics />
                {children}
              </AutoCheckWrapper>
              <Toaster />
              <Sonner />
              <Analytics />
              <ImpersonationWidget />
            </ThemeProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
