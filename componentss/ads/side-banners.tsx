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

// The four sellable side-banner slots: each rail is split into a top + bottom
// half. Keyed by the same free-text `position` values as the DB / API.
type ActiveMap = {
  "left-top": Banner
  "left-bottom": Banner
  "right-top": Banner
  "right-bottom": Banner
}

const EMPTY_ACTIVE: ActiveMap = {
  "left-top": null,
  "left-bottom": null,
  "right-top": null,
  "right-bottom": null,
}

// Wrap a page's CONTENT (hero, rows, features…) so the four side-banner ad slots
// sit INSIDE the same content frame, as sticky columns beside the content. Place
// between the page's <Navbar/> and <Footer/>. Below xl the rails hide and content
// fills the frame.
export default function SideAdsFrame({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<ActiveMap>(EMPTY_ACTIVE)
  // Until the first fetch resolves we show a neutral skeleton — NOT the
  // "Advertise here" CTA — so a booked slot never flashes as available.
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetch("/api/side-banners")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.active)
          setActive({
            "left-top": d.active["left-top"] ?? null,
            "left-bottom": d.active["left-bottom"] ?? null,
            "right-top": d.active["right-top"] ?? null,
            "right-bottom": d.active["right-bottom"] ?? null,
          })
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoaded(true)
      })
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="flex w-full items-start gap-4 px-2.5">
      <Rail side="left" top={active["left-top"]} bottom={active["left-bottom"]} loaded={loaded} />
      <div className="min-w-0 flex-1">{children}</div>
      <Rail side="right" top={active["right-top"]} bottom={active["right-bottom"]} loaded={loaded} />
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

// A single sticky rail now holds TWO stacked slots (top + bottom), each roughly
// half the rail height, so there are 4 sellable slots total.
function Rail({ side, top, bottom, loaded }: { side: "left" | "right"; top: Banner; bottom: Banner; loaded: boolean }) {
  const railW = useRailWidth()

  return (
    <aside
      aria-label={`${side} sponsored banners`}
      style={{ width: railW }}
      className="sticky top-[88px] hidden h-[calc(100vh-104px)] min-h-[460px] shrink-0 flex-col gap-4 self-start xl:flex"
    >
      <BannerSlot banner={top} position={`${side}-top`} loaded={loaded} />
      <BannerSlot banner={bottom} position={`${side}-bottom`} loaded={loaded} />
    </aside>
  )
}

// One banner slot (top or bottom of a rail). Renders the sponsored creative when
// booked, a "Sponsored — coming soon" placeholder while a booked slot has no
// image yet, or an "Advertise here" CTA when the slot is open.
function BannerSlot({ banner, position, loaded }: { banner: Banner; position: string; loaded: boolean }) {
  return (
    <div className="min-h-0 w-full flex-1 overflow-hidden rounded-2xl">
      {!loaded ? (
        <div className="h-full w-full animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
      ) : banner && banner.imageUrl ? (
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
          href={`/advertise#side-banners`}
          data-position={position}
          className="group flex h-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.015] px-3 text-center transition-colors hover:border-orange-500/40 hover:bg-orange-500/[0.04]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] text-white/40 transition-colors group-hover:bg-orange-500/12 group-hover:text-orange-400">
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
  )
}
