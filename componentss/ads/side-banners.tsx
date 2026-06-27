"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Megaphone, ArrowRight } from "lucide-react"

type Banner = {
  id: number
  position: string
  title: string | null
  imageUrl: string | null
  linkUrl: string | null
  endDate: string | null
} | null

// Two side-rail ad slots (left + right), shown on desktop (≥1280px). Each is a
// fixed-size SKYSCRAPER anchored near the top (not a full-height bar) so there's
// clean negative space around it — reads as a real ad unit, not a cluttered
// sidebar. Below xl they're hidden and the page goes full width.
export default function SideBanners() {
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
    <>
      <Rail side="left" banner={active.left} />
      <Rail side="right" banner={active.right} />
    </>
  )
}

function Rail({ side, banner }: { side: "left" | "right"; banner: Banner }) {
  const isLeft = side === "left"
  return (
    <motion.aside
      initial={{ x: isLeft ? -120 : 120, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", bounce: 0, duration: 0.7, delay: isLeft ? 0.15 : 0.25 }}
      aria-label={`${side} sponsored banner`}
      // Top-anchored skyscraper (160×600, caps on short viewports). Fixed so it
      // stays beside the catalogue as you scroll.
      className={`fixed top-[96px] z-30 hidden h-[600px] max-h-[calc(100vh-128px)] w-[160px] xl:block ${
        isLeft ? "left-6" : "right-6"
      }`}
    >
      {banner && banner.imageUrl ? (
        <Link
          href={banner.linkUrl || "#"}
          target={banner.linkUrl ? "_blank" : undefined}
          rel="noopener noreferrer sponsored"
          className="group relative block h-full overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e0e0f] shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition-all hover:-translate-y-0.5 hover:border-orange-500/40"
        >
          <span className="absolute left-2.5 top-2.5 z-10 rounded-full border border-white/10 bg-black/55 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-white/55 backdrop-blur-sm">
            Ad
          </span>
          {/* advertiser image (any host) → plain img, no next/image domain config */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.imageUrl} alt={banner.title || "Sponsored"} className="h-full w-full object-cover" />
          {banner.title && (
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5 text-xs font-semibold text-white">
              {banner.title}
            </span>
          )}
        </Link>
      ) : (
        // Quiet empty state — subtle, so two unsold slots don't look cluttered.
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
    </motion.aside>
  )
}
