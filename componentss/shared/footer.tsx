"use client"

import Link from "next/link"
import Image from "next/image"
import { useNavData } from "@/componentss/shared/nav-data-context"

const DISCORD = "https://discord.gg/EwGrUb7DW6"

type FooterLink = { name: string; href: string; external?: boolean }

const MARKETPLACE: FooterLink[] = [
  { name: "Assets", href: "/scripts" },
  { name: "Props", href: "/props" },
  { name: "Giveaways", href: "/giveaways" },
  { name: "Advertise", href: "/advertise" },
]

const SUPPORT: FooterLink[] = [
  { name: "Contact", href: "mailto:support@fivecrux.com" },
  { name: "Discord", href: DISCORD, external: true },
  { name: "Sell an asset", href: "/scripts/submit" },
]

// Fallback category links if the NavData context isn't populated yet.
const FALLBACK_CATEGORIES: FooterLink[] = [
  { name: "Maps", href: "/scripts?category=maps" },
  { name: "Vehicles", href: "/scripts?category=vehicles" },
  { name: "Weapons", href: "/scripts?category=weapons" },
  { name: "Clothing", href: "/scripts?category=clothing" },
]

const DiscordIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.249-1.844-.276-3.68-.276-5.486 0-.164-.393-.405-.874-.617-1.249a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
)

const socials = [{ label: "Discord", href: DISCORD, Icon: DiscordIcon }]

export default function Footer() {
  const { categories } = useNavData()
  // Show ALL home-flagged categories (same set as the nav/browse chips),
  // sorted like the home row — not just a hardcoded handful.
  const categoryLinks: FooterLink[] = Array.isArray(categories)
    ? [...categories]
        .filter((c) => c.showOnHome)
        .sort((a, b) => (a.homeOrder ?? 0) - (b.homeOrder ?? 0))
        .map((c) => ({ name: c.name as string, href: `/scripts?category=${c.slug}` }))
    : []

  const columns: { title: string; links: FooterLink[] }[] = [
    { title: "Marketplace", links: MARKETPLACE },
    { title: "Categories", links: categoryLinks.length ? categoryLinks : FALLBACK_CATEGORIES },
    { title: "Support", links: SUPPORT },
  ]

  return (
    <footer className="mt-16 w-full border-t border-white/[0.07] bg-[#0a0a0a]">
      <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
        {/* Top: brand (left) + link columns (right) */}
        <div className="flex flex-wrap justify-between gap-x-16 gap-y-10 pt-16">
          <div className="max-w-[300px]">
            <Link href="/" aria-label="FiveCrux home" className="inline-flex items-center">
              <Image src="/fivecrux-logo.png" alt="FiveCrux" width={142} height={34} />
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-white/55">
              Premium FiveM assets, Maps &amp; resources — discover, buy and run them on your server.
            </p>
            <div className="mt-6 flex gap-3.5">
              {socials.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="text-white/40 transition-colors hover:text-white"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </a>
              ))}
            </div>
          </div>

          <div className="flex gap-12 sm:gap-[72px]">
            {columns.map((col) => (
              <div key={col.title}>
                <h4 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
                  {col.title}
                </h4>
                {col.links.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="block py-1.5 text-sm text-white/[0.58] transition-colors hover:text-white"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-white/[0.07] py-6 sm:flex-row sm:items-center">
          <span className="text-[13px] text-white/40">© 2026 FiveCrux. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <span className="inline-flex items-center gap-2 text-[13px] text-white/40">
              <span className="h-[7px] w-[7px] rounded-full bg-green-400" />
              All systems operational
            </span>
            <span className="font-mono text-[13px] text-white/40">EUR €</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
