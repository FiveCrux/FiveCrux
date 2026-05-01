"use client";

import { useRef, useState, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { Users, Star, Shield, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface Feature {
  title: string;
  description: string;
  icon: React.ElementType;
  accentColor: string;
  glowColor: string;
}

const features: Feature[] = [
  {
    title: "Community Driven",
    description:
      "Built by experienced FiveM developers, shaped and trusted by the community every step of the way.",
    icon: Users,
    accentColor: "#f97316",
    glowColor: "rgba(249,115,22,0.15)",
  },
  {
    title: "Premium Quality",
    description:
      "Only top-tier scripts that meet our strict quality standards are listed on FiveCrux.",
    icon: Star,
    accentColor: "#eab308",
    glowColor: "rgba(234,179,8,0.15)",
  },
  {
    title: "Security Verified",
    description:
      "Every resource is manually reviewed and verified before going live on the platform.",
    icon: Shield,
    accentColor: "#f97316",
    glowColor: "rgba(249,115,22,0.15)",
  },
  {
    title: "Maximum Reach",
    description:
      "Get your scripts discovered by thousands of FiveM server owners and communities worldwide.",
    icon: Megaphone,
    accentColor: "#eab308",
    glowColor: "rgba(234,179,8,0.15)",
  },
];

// Mouse-tilt card
function FeatureCard({
  feature,
  index,
  inView,
}: {
  feature: Feature;
  index: number;
  inView: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const Icon = feature.icon;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: -dy * 8, y: dx * 8 });
  }, []);

  const resetTilt = useCallback(() => {
    setTilt({ x: 0, y: 0 });
    setIsHovered(false);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.6,
        delay: index * 0.1,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{ perspective: "1000px" }}
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={resetTilt}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
          transition: isHovered ? "transform 0.1s linear" : "transform 0.5s ease-out",
          transformStyle: "preserve-3d",
        }}
        className="relative h-full rounded-2xl overflow-hidden cursor-default"
      >
        {/* Card background */}
        <div
          className="relative h-full p-6 flex flex-col gap-5"
          style={{
            background: "#080808",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: "16px",
          }}
        >
          {/* Animated top border sweep */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-px"
            style={{
              background: `linear-gradient(90deg, transparent, ${feature.accentColor}, transparent)`,
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={inView ? { scaleX: 1, opacity: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3 + index * 0.12 }}
          />

          {/* Glow on hover */}
          {isHovered && (
            <div
              aria-hidden="true"
              className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at 50% 0%, ${feature.glowColor} 0%, transparent 60%)`,
              }}
            />
          )}

          {/* Icon */}
          <div
            className="relative flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0"
            style={{
              background: `${feature.accentColor}12`,
              border: `1px solid ${feature.accentColor}30`,
            }}
          >
            <Icon
              className="h-5 w-5"
              style={{ color: feature.accentColor }}
            />
          </div>

          {/* Text */}
          <div className="flex flex-col gap-2">
            <h3 className="text-white font-bold text-lg tracking-tight">
              {feature.title}
            </h3>
            <p className="text-neutral-500 text-sm leading-relaxed">
              {feature.description}
            </p>
          </div>

          {/* Bottom accent line */}
          <div
            className="mt-auto h-px w-8 rounded-full"
            style={{
              background: `linear-gradient(90deg, ${feature.accentColor}, transparent)`,
              opacity: isHovered ? 1 : 0.3,
              transition: "opacity 0.3s",
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function PlatformFeaturesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{ background: "#000000" }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(249,115,22,0.04) 0%, transparent 70%)",
        }}
      />

      <div ref={ref} className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/8 bg-white/[0.03] mb-5">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
              The Platform
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter mb-4">
            Why Choose{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #f97316, #eab308)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              FiveCrux?
            </span>
          </h2>

          <p className="text-neutral-500 max-w-xl mx-auto text-sm leading-relaxed">
            The most trusted ecosystem for premium FiveM resources, engineered for performance
            and community growth.
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, i) => (
            <FeatureCard key={feature.title} feature={feature} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
