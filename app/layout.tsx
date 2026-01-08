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
                {children}
              </AutoCheckWrapper>
              <Toaster />
              <Sonner />
              <Analytics />
            </ThemeProvider>
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
