"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Button } from "@/componentss/ui/button";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { ShoppingBag, Gift, ArrowRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

// Lazy-load Three.js canvas to avoid SSR issues
const ParticleCanvas = dynamic(() => import("./ParticleCanvas"), { ssr: false });

interface HeroStat {
  value: string;
  label: string;
}

interface HeroSectionProps {
  stats: HeroStat[];
}

export default function HeroSection({ stats }: HeroSectionProps) {
  const { status } = useSession();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const words1 = ["Premium", "FiveM"];
  const gradientWord = "Marketplace";
  const words2 = ["&"];
  const gradientWord2 = "Giveaway";
  const words3 = ["Platform"];

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{ background: "#000000" }}
    >
      {/* ── Three.js Particle Background ──────────────────────────── */}
      {mounted && <ParticleCanvas />}

      {/* ── Radial Glow Orbs ──────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
      >
        {/* Primary orange orb */}
        <div
          className="absolute"
          style={{
            top: "20%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "700px",
            height: "700px",
            background:
              "radial-gradient(circle, rgba(249,115,22,0.12) 0%, rgba(234,179,8,0.05) 40%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        {/* Secondary accent orb left */}
        <div
          className="absolute"
          style={{
            top: "60%",
            left: "10%",
            width: "400px",
            height: "400px",
            background:
              "radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        {/* Accent orb right */}
        <div
          className="absolute"
          style={{
            top: "40%",
            right: "5%",
            width: "350px",
            height: "350px",
            background:
              "radial-gradient(circle, rgba(234,179,8,0.06) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
      </div>

      {/* ── Perspective Grid Floor ─────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{ height: "45%", perspective: "800px" }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            transform: "rotateX(70deg)",
            transformOrigin: "bottom center",
            backgroundImage: `
              linear-gradient(rgba(249,115,22,0.10) 1px, transparent 1px),
              linear-gradient(90deg, rgba(249,115,22,0.10) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            backgroundPosition: "center bottom",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.3) 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0.3) 100%)",
          }}
        />
      </div>

      {/* ── Hero Content ──────────────────────────────────────────── */}
      <div className="relative z-10 max-w-5xl mx-auto text-center pt-20">
        <AnimatePresence>
          {inView && (
            <>
              {/* Live badge */}
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full border border-orange-500/25 bg-orange-500/8 text-xs font-semibold text-orange-400 uppercase tracking-widest"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                </span>
                FiveM&apos;s #1 Script Marketplace
              </motion.div>

              {/* Heading */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 leading-[1.05] tracking-tighter"
              >
                {/* Line 1 */}
                <span className="block">
                  {words1.map((w, i) => (
                    <motion.span
                      key={w}
                      className="inline-block mr-[0.2em] text-white"
                      initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{ duration: 0.6, delay: 0.3 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {w}
                    </motion.span>
                  ))}
                  <motion.span
                    className="inline-block mr-[0.2em]"
                    initial={{ opacity: 0, y: 40, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      background: "linear-gradient(90deg, #f97316 0%, #eab308 50%, #f97316 100%)",
                      backgroundSize: "200% auto",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {gradientWord}
                  </motion.span>
                </span>

                {/* Line 2 */}
                <span className="block text-neutral-500 text-4xl sm:text-5xl md:text-6xl font-bold mt-1">
                  {words2.map((w) => (
                    <motion.span
                      key={w}
                      className="inline-block mr-[0.25em]"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.65 }}
                    >
                      {w}
                    </motion.span>
                  ))}
                  <motion.span
                    className="inline-block mr-[0.25em]"
                    initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{ duration: 0.6, delay: 0.72, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      background: "linear-gradient(90deg, #eab308 0%, #f97316 50%, #eab308 100%)",
                      backgroundSize: "200% auto",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {gradientWord2}
                  </motion.span>
                  {words3.map((w) => (
                    <motion.span
                      key={w}
                      className="inline-block text-white"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.82 }}
                    >
                      {w}
                    </motion.span>
                  ))}
                </span>
              </motion.h1>

              {/* Animated accent line */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ duration: 1, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto mb-8 h-px w-48 origin-center"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, #f97316, #eab308, transparent)",
                }}
              />

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-base sm:text-lg md:text-xl text-neutral-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light"
              >
                Discover the most advanced collection of high-quality scripts for your FiveM
                server. Built by experts, trusted by thousands. Plus enter amazing giveaways to
                win premium content!
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.75 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
              >
                {/* Primary */}
                <Link href="/scripts">
                  <motion.div
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <button
                      className={cn(
                        "group relative overflow-hidden",
                        "inline-flex items-center gap-2.5",
                        "bg-orange-500 hover:bg-orange-400 text-black font-bold",
                        "px-8 py-3.5 rounded-xl text-sm tracking-wide",
                        "transition-all duration-200",
                        "shadow-[0_0_24px_rgba(249,115,22,0.35)] hover:shadow-[0_0_36px_rgba(249,115,22,0.55)]"
                      )}
                    >
                      <ShoppingBag className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                      Explore Marketplace
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </button>
                  </motion.div>
                </Link>

                {/* Secondary */}
                <Link href="/giveaways">
                  <motion.div
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    <button
                      className={cn(
                        "group inline-flex items-center gap-2.5",
                        "border border-white/15 hover:border-orange-500/50",
                        "text-white/80 hover:text-orange-400 font-semibold",
                        "px-8 py-3.5 rounded-xl text-sm tracking-wide",
                        "transition-all duration-200",
                        "bg-white/[0.04] hover:bg-orange-500/[0.08]"
                      )}
                    >
                      <Gift className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                      Explore Giveaways
                    </button>
                  </motion.div>
                </Link>
              </motion.div>

              {/* ── Hero Stats Row ─────────────────────────────────── */}
              {stats.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.9 }}
                  className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4"
                >
                  {stats.map((stat, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                        {stat.value}
                      </span>
                      <span className="text-xs text-neutral-500 uppercase tracking-widest mt-0.5 font-medium">
                        {stat.label}
                      </span>
                    </div>
                  ))}
                </motion.div>
              )}
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── Scroll Indicator ──────────────────────────────────────── */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-neutral-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        <span className="text-[10px] uppercase tracking-widest font-medium">Scroll</span>
        <motion.div
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </motion.div>
    </section>
  );
}
