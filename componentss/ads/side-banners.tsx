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

// Two scarce side-rail slots (left + right) shown on EVERY page on wide screens.
// They slide in from the screen edges; below the breakpoint they're hidden and
// the page goes full width (the root layout removes the inset to match).
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
      initial={{ x: isLeft ? -140 : 140, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", bounce: 0, duration: 0.8, delay: isLeft ? 0.15 : 0.28 }}
      aria-label={`${side} banner ad`}
      className={`fixed top-[84px] bottom-4 z-30 hidden w-[200px] min-[1700px]:flex ${
        isLeft ? "left-3" : "right-3"
      }`}
    >
      {/* outer-edge accent — reinforces "docked to the side" */}
      <span
        className={`pointer-events-none absolute top-9 bottom-9 w-[3px] rounded-full bg-gradient-to-b from-transparent via-orange-500/70 to-transparent ${
          isLeft ? "-left-2" : "-right-2"
        }`}
      />
      {banner && banner.imageUrl ? (
        <Link
          href={banner.linkUrl || "#"}
          target={banner.linkUrl ? "_blank" : undefined}
          rel="noopener noreferrer sponsored"
          className="group relative flex-1 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0e0e0f] shadow-[0_24px_60px_rgba(0,0,0,0.55)] transition-all hover:-translate-y-1 hover:border-orange-500/40"
        >
          <span className="absolute left-3 top-3 z-10 rounded-full border border-white/10 bg-black/55 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-white/70 backdrop-blur-sm">
            Sponsored
          </span>
          {/* advertiser image can be any host → plain img (no next/image domain config) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={banner.imageUrl} alt={banner.title || "Sponsored"} className="h-full w-full object-cover" />
          {banner.title && (
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-sm font-semibold text-white">
              {banner.title}
            </span>
          )}
        </Link>
      ) : (
        <Link
          href="/advertise#side-banners"
          className="group flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-[1.5px] border-dashed border-orange-500/40 bg-orange-500/[0.04] p-5 text-center transition-colors hover:border-orange-500/70 hover:bg-orange-500/[0.07]"
        >
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-orange-500/12 text-orange-400">
            <Megaphone className="h-6 w-6" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-orange-400">Premium placement</span>
          <span className="text-base font-extrabold text-white">Your banner here</span>
          <span className="text-xs leading-relaxed text-white/55">
            A sticky banner beside the catalogue, on every page.
          </span>
          <span className="text-[11px] text-white/40">Only 2 side slots exist.</span>
          <span className="mt-1 inline-flex items-center gap-1 rounded-lg bg-orange-500 px-3.5 py-2 text-xs font-bold text-black">
            Advertise <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}
    </motion.aside>
  )
}
