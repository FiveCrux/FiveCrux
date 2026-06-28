import Link from "next/link"

const DISCORD = "https://discord.gg/EwGrUb7DW6"

const columns: {
  title: string
  links: { name: string; href: string; external?: boolean }[]
}[] = [
  {
    title: "Marketplace",
    links: [
      { name: "Scripts", href: "/scripts" },
      { name: "Props", href: "/props" },
      { name: "Giveaways", href: "/giveaways" },
      { name: "Advertise", href: "/advertise" },
    ],
  },
  {
    title: "Categories",
    links: [
      { name: "MLOs", href: "/scripts?category=mlo" },
      { name: "Vehicles", href: "/scripts?category=vehicles" },
      { name: "Weapons", href: "/scripts?category=weapons" },
      { name: "Clothing", href: "/scripts?category=clothing" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "Contact", href: "mailto:support@fivecrux.com" },
      { name: "Discord", href: DISCORD, external: true },
      { name: "Sell a script", href: "/scripts/submit" },
    ],
  },
]

const DiscordIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
  </svg>
)
const YouTubeIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M23 7.5a3 3 0 0 0-2.1-2.1C19 5 12 5 12 5s-7 0-8.9.4A3 3 0 0 0 1 7.5 31 31 0 0 0 .6 12 31 31 0 0 0 1 16.5a3 3 0 0 0 2.1 2.1C5 19 12 19 12 19s7 0 8.9-.4a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23.4 12 31 31 0 0 0 23 7.5ZM9.8 15.3V8.7l5.7 3.3-5.7 3.3Z" />
  </svg>
)
const XIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.9 2H22l-7.3 8.3L23.3 22H16l-5-6.6L5.4 22H2.2l7.8-8.9L1 2h7.3l4.5 6 5.1-6Zm-1.2 18h1.7L7.3 3.8H5.5L17.7 20Z" />
  </svg>
)

// NOTE: YouTube / X point to the Discord invite for now — swap in real channel
// URLs when they exist (or drop those two icons).
const socials = [
  { label: "Discord", href: DISCORD, Icon: DiscordIcon },
  { label: "YouTube", href: DISCORD, Icon: YouTubeIcon },
  { label: "X", href: DISCORD, Icon: XIcon },
]

export default function Footer() {
  return (
    <footer className="w-full border-t border-white/[0.07] bg-[#0a0a0a]">
      <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
        {/* Top: brand (left) + link columns (right) */}
        <div className="flex flex-wrap justify-between gap-x-16 gap-y-10 pt-16">
          <div className="max-w-[300px]">
            <Link href="/" className="inline-flex items-center gap-2.5 text-[17px] font-bold tracking-tight text-white">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-orange-500 text-sm font-black text-black">F</span>
              FiveCrux
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-white/55">
              Premium FiveM scripts, MLOs &amp; resources — discover, buy and run them on your server.
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
