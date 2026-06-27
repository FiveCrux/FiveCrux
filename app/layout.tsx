import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
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
import SideBanners from "@/componentss/ads/side-banners"
const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "FiveCrux - Premium FiveM Scripts & Giveaways",
  description:
    "Your one-stop destination for premium FiveM scripts and exciting giveaways. Discover, purchase, and download the community's best scripts."
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionProvider>
          <QueryProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
              <AutoCheckWrapper>
              <FirebaseAnalytics />
                {/* Scarce side-banner ad rails (every page; desktop ≥1280px). */}
                <SideBanners />
                {/* Inset content on desktop so it clears the slim fixed rails;
                    below xl there are no rails and content is full width. */}
                <div className="xl:px-[208px]">{children}</div>
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
