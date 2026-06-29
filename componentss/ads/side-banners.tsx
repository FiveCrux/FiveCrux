"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { Megaphone, ArrowRight } from "lucide-react"

type Banner = {
  id: number
  position: string
  title: string | null
  imageUrl: string | null
  linkUrl: string | null
  endDate: string | null
} | null

// Wrap a page's CONTENT (hero, rows, features…) so the two side-banner ad slots
// sit INSIDE the same content frame, as sticky columns beside the content. Place
// between the page's <Navbar/> and <Footer/>. Below xl the rails hide and content
// fills the frame.
export default function SideAdsFrame({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<{ left: Banner; right: Banner }>({ left: null, right: null })

  useEffect(() => {
    let alive = true
    fetch("/api/side-banners")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.active) setActive({ left: d.active.left ?? null, right: d.active.right ?? null })
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="flex w-full items-start gap-4 px-2.5">
      <Rail side="left" banner={active.left} />
      <div className="min-w-0 flex-1">{children}</div>
      <Rail side="right" banner={active.right} />
    </div>
  )
}

// Rail width scales with the screen instead of a fixed 160px — so big monitors
// get a proportionate skyscraper, small ones stay compact.
function useRailWidth() {
  const [w, setW] = useState(180)
  useEffect(() => {
    const calc = () => {
      const vw = window.innerWidth
      setW(
        vw >= 3200 ? 400 : vw >= 2560 ? 330 : vw >= 2100 ? 285 : vw >= 1800 ? 245 : vw >= 1536 ? 210 : 165
      )
    }
    calc()
    window.addEventListener("resize", calc)
    return () => window.removeEventListener("resize", calc)
  }, [])
  return w
}

function Rail({ side, banner }: { side: "left" | "right"; banner: Banner }) {
  const railW = useRailWidth()

  return (
    <aside
      aria-label={`${side} sponsored banner`}
      style={{ width: railW }}
      className="sticky top-[88px] hidden h-[70vh] min-h-[460px] shrink-0 self-start xl:block"
    >
      <div className="h-full w-full overflow-hidden rounded-2xl">
        {banner && banner.imageUrl ? (
          <Link
            href={banner.linkUrl || "#"}
            target={banner.linkUrl ? "_blank" : undefined}
            rel="noopener noreferrer sponsored"
            className="group relative block h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e0e0f] transition-all hover:-translate-y-0.5 hover:border-orange-500/40"
          >
            <span className="absolute left-2.5 top-2.5 z-10 rounded-full border border-white/10 bg-black/55 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-white/55 backdrop-blur-sm">
              Ad
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={banner.imageUrl} alt={banner.title || "Sponsored"} className="h-full w-full object-cover" />
            {banner.title && (
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5 text-sm font-semibold text-white">
                {banner.title}
              </span>
            )}
          </Link>
        ) : banner ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-3 text-center">
            <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-white/40">
              Sponsored
            </span>
            <span className="text-[11px] text-white/30">Banner coming soon</span>
          </div>
        ) : (
          <Link
            href="/advertise#side-banners"
            className="group flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.015] px-3 text-center transition-colors hover:border-orange-500/40 hover:bg-orange-500/[0.04]"
          >
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/[0.04] text-white/40 transition-colors group-hover:bg-orange-500/12 group-hover:text-orange-400">
              <Megaphone className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold text-white/55 transition-colors group-hover:text-white">
              Advertise here
            </span>
            <span className="text-[11px] text-white/30">from €30/wk</span>
            <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-orange-400/80 transition-colors group-hover:text-orange-400">
              Book <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        )}
      </div>
    </aside>
  )
}
