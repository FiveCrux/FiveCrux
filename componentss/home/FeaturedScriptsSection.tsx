"use client";

import { motion } from "framer-motion";
import { InfiniteMovingCards } from "@/componentss/ui/infinite-moving-cards";
import FeaturedScriptCard from "@/componentss/featured-scripts/featured-script-card";
import { Zap } from "lucide-react";

interface Script {
  id: number;
  featuredScriptId?: number;
  title: string;
  description: string;
  cover_image?: string;
  framework?: string[];
  price: number;
  original_price?: number;
  currency_symbol?: string;
  free?: boolean;
  seller?: string;
  seller_name?: string;
  seller_image?: string;
  seller_roles?: string[];
}

interface FeaturedScriptsSectionProps {
  scripts: Script[];
  loading: boolean;
}

export default function FeaturedScriptsSection({
  scripts,
  loading,
}: FeaturedScriptsSectionProps) {
  return (
    <section
      className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{ background: "#000000" }}
    >
      {/* Subtle top-edge separator */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(249,115,22,0.3), transparent)",
        }}
      />

      {/* Spotlight cone behind content */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: "600px",
          height: "400px",
          background:
            "conic-gradient(from 270deg at 50% 0%, transparent 60deg, rgba(249,115,22,0.04) 120deg, transparent 180deg)",
          filter: "blur(40px)",
        }}
      />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/5 mb-5">
            <Zap className="h-3 w-3 text-orange-500" />
            <span className="text-xs font-semibold text-orange-400/80 uppercase tracking-widest">
              Featured Scripts
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter mb-4">
            Top{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #f97316, #eab308)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Scripts
            </span>
          </h2>

          <p className="text-neutral-500 max-w-xl mx-auto text-sm leading-relaxed">
            Hand-picked, premium-quality scripts trusted by thousands of FiveM server owners.
          </p>
        </motion.div>

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl h-80 overflow-hidden relative"
                style={{ background: "#0a0a0a", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {/* Shimmer overlay */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.04) 50%, transparent 100%)",
                    animation: "shimmer 1.8s infinite",
                    backgroundSize: "200% 100%",
                  }}
                />
              </div>
            ))}
          </div>
        ) : scripts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-neutral-600 text-sm">
              No featured scripts available at the moment.
            </p>
          </div>
        ) : scripts.length > 3 ? (
          <InfiniteMovingCards
            items={scripts}
            direction="left"
            speed="fast"
            pauseOnHover
            className="max-w-7xl"
            renderItem={(item, index) => (
              <FeaturedScriptCard
                item={item}
                index={index}
                style={{
                  width: "calc((100vw - 8rem) / 3)",
                  minWidth: "320px",
                  maxWidth: "420px",
                }}
              />
            )}
          />
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex md:grid md:grid-cols-2 xl:grid-cols-3 gap-6 min-w-max md:min-w-0">
              {scripts.map((item, index) => (
                <FeaturedScriptCard
                  key={item.id}
                  item={item}
                  index={index}
                  className="flex-shrink-0 w-[320px] md:w-auto"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom separator */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-2/3"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
        }}
      />
    </section>
  );
}
