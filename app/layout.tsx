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
// Chakra Petch — squared terminals, reads as FiveM/server-panel rather than
// generic SaaS. It ships no weight above 700, so the weights are listed
// explicitly: asking for 800/900 anywhere would silently synthesise a fake bold.
const chakraPetch = Chakra_Petch({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "FiveCrux - Premium FiveM Assets & Giveaways",
  description:
    "Your one-stop destination for premium FiveM assets and exciting giveaways. Discover, purchase, and download the community's best assets."
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
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
