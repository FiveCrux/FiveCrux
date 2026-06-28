"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Megaphone, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react"

type Banner = {
  id: number
  position: string
  title: string | null
  imageUrl: string | null
  linkUrl: string | null
  endDate: string | null
} | null

// Wrap a page's CONTENT sections (hero, rows, features…) with this so the two
// side-banner ad slots sit INSIDE the same content frame, as sticky columns
// beside the content — part of the page, not divs pinned to the raw browser
// edges. Place it between the page's <Navbar/> and <Footer/>. On <xl the rails
// hide and content fills the frame.
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
    <div className="mx-auto flex w-full max-w-[1680px] items-start gap-4 px-2.5">
      <Rail side="left" banner={active.left} />
      <div className="min-w-0 flex-1">{children}</div>
      <Rail side="right" banner={active.right} />
    </div>
  )
}

function Rail({ side, banner }: { side: "left" | "right"; banner: Banner }) {
  const isLeft = side === "left"
  const storageKey = `sb-collapsed-${side}`

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(storageKey) === "1"
  })
  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, collapsed ? "1" : "0")
    } catch {
      /* ignore */
    }
  }, [collapsed, storageKey])

  return (
    // A sticky column INSIDE the frame (not fixed to the viewport edge) → reads as
    // part of the site. Width stays reserved so the content never shifts.
    <aside
      aria-label={`${side} sponsored banner`}
      className="sticky top-[88px] hidden h-[600px] max-h-[calc(100vh-110px)] w-[160px] shrink-0 self-start xl:block"
    >
      {/* The ad card — slides toward the edge + fades when collapsed. */}
      <motion.div
        animate={{ x: collapsed ? (isLeft ? -184 : 184) : 0, opacity: collapsed ? 0 : 1 }}
        transition={{ type: "spring", bounce: 0, duration: 0.55 }}
        className="h-full w-full"
        style={{ pointerEvents: collapsed ? "none" : "auto" }}
      >
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
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5 text-xs font-semibold text-white">
                {banner.title}
              </span>
            )}
          </Link>
        ) : banner ? (
          // Slot is sold (active) but the owner hasn't uploaded a banner yet.
          <div className="flex h-full flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] px-3 text-center">
            <span className="rounded-full border border-white/10 bg-black/40 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-white/40">
              Sponsored
            </span>
            <span className="text-[11px] text-white/30">Banner coming soon</span>
          </div>
        ) : (
          <Link
            href="/advertise#side-banners"
            className="group flex h-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-white/[0.07] bg-white/[0.015] px-3 text-center transition-colors hover:border-orange-500/40 hover:bg-orange-500/[0.04]"
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/[0.04] text-white/40 transition-colors group-hover:bg-orange-500/12 group-hover:text-orange-400">
              <Megaphone className="h-[18px] w-[18px]" />
            </span>
            <span className="text-[13px] font-semibold text-white/55 transition-colors group-hover:text-white">
              Advertise here
            </span>
            <span className="text-[10px] text-white/30">from €30/wk</span>
            <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-orange-400/80 transition-colors group-hover:text-orange-400">
              Book <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        )}
      </motion.div>

      {/* Toggle handle — always visible on the inner edge; collapses / re-opens. */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Show banner" : "Hide banner"}
        className={`absolute top-2 z-10 grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-[#111]/90 text-white/55 shadow-md backdrop-blur-sm transition hover:text-white ${
          isLeft ? "-right-3" : "-left-3"
        }`}
      >
        {collapsed
          ? isLeft
            ? <ChevronRight className="h-4 w-4" />
            : <ChevronLeft className="h-4 w-4" />
          : isLeft
            ? <ChevronLeft className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />}
      </button>
    </aside>
  )
}
