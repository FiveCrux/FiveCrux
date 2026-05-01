"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";
import { Code2, Users, Gift, DollarSign } from "lucide-react";

interface StatItem {
  icon: React.ElementType;
  rawValue: number;
  suffix: string;
  prefix?: string;
  label: string;
  description: string;
}

// Animated counter hook
function useCounter(target: number, inView: boolean, duration = 1.8) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) =>
    target >= 1000
      ? v >= 1000
        ? `${(v / 1000).toFixed(1)}k`
        : Math.round(v).toString()
      : Math.round(v).toString()
  );

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, target, {
      duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return controls.stop;
  }, [inView, target, count, duration]);

  return rounded;
}

function StatCard({ stat, index, inView }: { stat: StatItem; index: number; inView: boolean }) {
  const Icon = stat.icon;
  const counter = useCounter(stat.rawValue, inView);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.6,
        delay: index * 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="flex flex-col items-center gap-3 group"
    >
      {/* Icon ring */}
      <div
        className="relative flex items-center justify-center w-12 h-12 rounded-xl mb-1 transition-all duration-300 group-hover:scale-110"
        style={{
          background: "rgba(249,115,22,0.08)",
          border: "1px solid rgba(249,115,22,0.2)",
          boxShadow: "0 0 20px rgba(249,115,22,0.1)",
        }}
      >
        <Icon className="h-5 w-5 text-orange-500" />
      </div>

      {/* Counter */}
      <div className="flex items-baseline gap-0.5">
        {stat.prefix && (
          <span className="text-2xl font-black text-orange-400">{stat.prefix}</span>
        )}
        <motion.span className="text-4xl sm:text-5xl font-black text-white tracking-tighter tabular-nums">
          {counter}
        </motion.span>
        <span className="text-2xl font-black text-orange-400">{stat.suffix}</span>
      </div>

      <span className="text-xs text-neutral-500 uppercase tracking-widest font-semibold">
        {stat.label}
      </span>
      <span className="text-xs text-neutral-600 text-center max-w-[140px] leading-relaxed hidden sm:block">
        {stat.description}
      </span>
    </motion.div>
  );
}

interface StatsBannerSectionProps {
  /** Live stats from /api/stats — falls back to placeholder if null */
  liveStats?: {
    totalScripts?: number;
    totalUsers?: number;
    totalGiveaways?: number;
    totalGiveawayValue?: number;
    totalDevelopers?: number;
  } | null;
}

export default function StatsBannerSection({ liveStats }: StatsBannerSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const statsData: StatItem[] = [
    {
      icon: Code2,
      rawValue: liveStats?.totalScripts ?? 500,
      suffix: "+",
      label: "Scripts Listed",
      description: "Premium resources ready to deploy",
    },
    {
      icon: Users,
      rawValue: liveStats?.totalUsers ?? 12000,
      suffix: "+",
      label: "Active Users",
      description: "Server owners & developers",
    },
    {
      icon: Gift,
      rawValue: liveStats?.totalGiveaways ?? 250,
      suffix: "+",
      label: "Giveaways Hosted",
      description: "Community competitions ran",
    },
    {
      icon: DollarSign,
      rawValue: liveStats?.totalGiveawayValue ?? 50000,
      suffix: "+",
      prefix: "$",
      label: "Value Given Away",
      description: "In prizes to our community",
    },
  ];

  return (
    <section
      className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{ background: "#000000" }}
    >
      {/* Thin top rule */}
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(249,115,22,0.25), rgba(234,179,8,0.15), transparent)",
        }}
      />

      {/* Background strip */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(249,115,22,0.04) 0%, transparent 70%)",
        }}
      />

      <div ref={ref} className="max-w-5xl mx-auto relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-6">
          {statsData.map((stat, i) => (
            <StatCard key={stat.label} stat={stat} index={i} inView={inView} />
          ))}
        </div>
      </div>

      {/* Thin bottom rule */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
        }}
      />
    </section>
  );
}
