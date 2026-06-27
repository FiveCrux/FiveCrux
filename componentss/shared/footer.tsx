"use client"

import { motion } from "framer-motion"
import Link from "next/link"

const footerLinks = [
  {
    title: "Categories",
    accent: true,
    links: [
      { name: "Scripts", href: "/scripts?category=scripts" },
      { name: "MLOs", href: "/scripts?category=mlo" },
      { name: "Vehicles", href: "/scripts?category=vehicles" },
      { name: "Weapons", href: "/scripts?category=weapons" },
      { name: "Clothing", href: "/scripts?category=clothing" },
    ],
  },
  {
    title: "Marketplace",
    links: [
      { name: "Browse All", href: "/scripts" },
      { name: "Props", href: "/props" },
      { name: "Giveaways", href: "/giveaways" },
      { name: "Advertise", href: "/advertise" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "Contact Us", href: "mailto:support@fivecrux.com" },
      { name: "Discord", href: "https://discord.gg/EwGrUb7DW6", target: "_blank" },
    ],
  },
]

const DISCORD = "https://discord.gg/EwGrUb7DW6"

const DiscordIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
  </svg>
)

export default function Footer() {
  return (
    <footer className="relative w-full overflow-hidden border-t border-white/[0.08] bg-[#0a0a0a]">
      <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
        {/* Top: link groups + Discord */}
        <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-8 pt-12 pb-7">
          <div className="flex flex-wrap gap-x-12 gap-y-8">
            {footerLinks.map((section) => (
              <div key={section.title} className="flex flex-col gap-2.5">
                <h4
                  className={`mb-1 text-[11px] font-bold uppercase tracking-[0.16em] ${
                    section.accent ? "text-orange-500" : "text-white/45"
                  }`}
                >
                  {section.title}
                </h4>
                {section.links.map((link) => (
                  <Link
                    key={link.name}
                    href={link.href}
                    target={(link as any).target}
                    rel={(link as any).target ? "noopener noreferrer" : undefined}
                    className="text-sm text-white/[0.62] transition-colors hover:text-white"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            ))}
          </div>

          <Link
            href={DISCORD}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-2 rounded-full bg-[#5865F2] px-[18px] text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#4752c4]"
          >
            <DiscordIcon className="h-5 w-5" />
            Join Discord
          </Link>
        </div>

        {/* Type-flood wordmark — the brand is the hero */}
        <motion.div
          className="relative select-none"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ type: "spring", bounce: 0, duration: 0.7 }}
        >
          <h2
            aria-label="FiveCrux"
            className="font-black leading-[0.78] tracking-[-0.04em]"
            style={{
              fontSize: "clamp(58px,16vw,220px)",
              backgroundImage: "linear-gradient(180deg,#ffffff 38%,rgba(255,255,255,0.06))",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            FIVECRUX
          </h2>
          <span className="absolute bottom-[14px] left-[2px] h-[6px] w-[72px] rounded bg-orange-500 sm:h-[7px] sm:w-[84px]" />
        </motion.div>

        {/* Bottom bar */}
        <div className="-mt-1 flex flex-col items-start justify-between gap-2 border-t border-white/[0.06] py-5 pb-8 text-[12.5px] text-white/45 sm:flex-row sm:items-center">
          <span>© 2026 FiveCrux — premium FiveM scripts &amp; resources.</span>
          <span>
            Made with <span className="text-orange-500">♥</span> for the FiveM community
          </span>
        </div>
      </div>
    </footer>
  )
}
