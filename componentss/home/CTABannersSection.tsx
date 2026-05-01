"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { MousePointerClick, Code2, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

interface CTABannerProps {
  image: string;
  title: string;
  description: string;
  cta: string;
  href?: string;
  onSignIn?: () => void;
  icon: React.ElementType;
  index: number;
  inView: boolean;
  isAuthenticated: boolean;
}

function CTABanner({
  image,
  title,
  description,
  cta,
  href,
  icon: Icon,
  index,
  inView,
  isAuthenticated,
}: CTABannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Background image */}
      <img
        src={image}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
        style={{ opacity: 0.35 }}
      />

      {/* Overlays */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.7) 100%)",
        }}
      />
      {/* Orange left-edge accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[2px]"
        style={{
          background:
            "linear-gradient(to bottom, transparent, #f97316, #eab308, transparent)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-8 sm:p-10 min-h-[220px] sm:min-h-0">
        <div className="flex flex-col gap-4 max-w-lg">
          {/* Label */}
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-semibold text-orange-400/80 uppercase tracking-widest">
              For Developers
            </span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            {title}
          </h2>

          <p className="text-neutral-400 text-sm leading-relaxed">{description}</p>
        </div>

        {/* CTA Button */}
        {isAuthenticated && href ? (
          <Link href={href} className="flex-shrink-0">
            <motion.button
              whileHover={{ scale: 1.04, y: -1 }}
              whileTap={{ scale: 0.97 }}
              className={cn(
                "group/btn inline-flex items-center gap-2.5",
                "bg-orange-500 hover:bg-orange-400 text-black font-bold",
                "px-7 py-3.5 rounded-xl text-sm tracking-wide",
                "transition-all duration-200 flex-shrink-0",
                "shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_32px_rgba(249,115,22,0.5)]"
              )}
            >
              {cta}
              <MousePointerClick className="h-4 w-4 transition-transform duration-200 group-hover/btn:scale-110" />
            </motion.button>
          </Link>
        ) : (
          <motion.button
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => signIn("discord")}
            className={cn(
              "group/btn inline-flex items-center gap-2.5",
              "bg-orange-500 hover:bg-orange-400 text-black font-bold",
              "px-7 py-3.5 rounded-xl text-sm tracking-wide flex-shrink-0",
              "transition-all duration-200",
              "shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_32px_rgba(249,115,22,0.5)]"
            )}
          >
            {cta}
            <MousePointerClick className="h-4 w-4 transition-transform duration-200 group-hover/btn:scale-110" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

export default function CTABannersSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  return (
    <section
      className="relative py-16 px-4 sm:px-6 lg:px-8"
      style={{ background: "#000000" }}
    >
      {/* Top rule */}
      <div
        aria-hidden="true"
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
        }}
      />

      <div ref={ref} className="max-w-7xl mx-auto flex flex-col gap-5">
        <CTABanner
          image="/gtav_1.jpg"
          title="Publish Your Script"
          description="Every great store starts with a great idea — and yours could be next. Share your work, get instant exposure, and grow alongside the FiveM community."
          cta="Submit Your Script"
          href="/scripts/submit"
          icon={Code2}
          index={0}
          inView={inView}
          isAuthenticated={isAuthenticated}
        />

        <CTABanner
          image="/gtav_2.jpg"
          title="Create Your Giveaway"
          description="Create and publish giveaways to promote your scripts, gain visibility, and reach a wider FiveM audience instantly."
          cta="Create Your Giveaway"
          href="/giveaways/create"
          icon={Gift}
          index={1}
          inView={inView}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </section>
  );
}
