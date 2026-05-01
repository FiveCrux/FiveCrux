"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import Image from "next/image";

interface ServiceCard {
  href: string;
  logo: string;
  logoAlt: string;
  name: string;
  tag: string;
  description: string;
  cta: string;
}

const services: ServiceCard[] = [
  {
    href: "https://www.gamecrux.io/",
    logo: "/gamecrux.webp",
    logoAlt: "GameCrux",
    name: "GameCrux",
    tag: "Minigames Platform",
    description:
      "Discover, Play, and Enjoy a Curated Selection of Exciting Minigames. Dive into the ultimate experience with our comprehensive games ecosystem.",
    cta: "Launch Platform",
  },
  {
    href: "https://crux.tebex.io/",
    logo: "/cs.webp",
    logoAlt: "Crux Studio",
    name: "Crux Studio",
    tag: "Asset Marketplace",
    description:
      "Premium FiveM Assets Marketplace. Creating high-quality products with passion and attention to detail to make your server even better.",
    cta: "Browse Store",
  },
];

function ServiceCard({ service, index, inView }: { service: ServiceCard; index: number; inView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: index === 0 ? -30 : 30 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6 }}
      className="group h-full"
      style={{ transition: "transform 0.3s ease" }}
    >
      <a
        href={service.href}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full"
      >
        <div
          className="relative h-full p-px rounded-2xl overflow-hidden transition-all duration-500"
          style={{
            background:
              "linear-gradient(160deg, rgba(249,115,22,0.15) 0%, rgba(255,255,255,0.05) 50%, transparent 100%)",
          }}
        >
          {/* Inner card */}
          <div
            className="relative h-full rounded-2xl p-7 flex flex-col gap-5 overflow-hidden"
            style={{
              background: "#060606",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {/* Corner accent */}
            <div
              aria-hidden="true"
              className="absolute top-0 right-0 w-32 h-32 pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at top right, rgba(249,115,22,0.07) 0%, transparent 70%)",
              }}
            />

            {/* Logo + name */}
            <div className="flex items-center gap-4">
              <div
                className="relative flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden p-2 transition-all duration-300 group-hover:scale-105"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(249,115,22,0.2)",
                  boxShadow: "0 0 20px rgba(249,115,22,0.08)",
                }}
              >
                <Image
                  src={service.logo}
                  alt={service.logoAlt}
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h3 className="text-white font-bold text-xl tracking-tight">
                  {service.name}
                </h3>
                <span className="text-[11px] font-semibold text-orange-500/70 uppercase tracking-widest">
                  {service.tag}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div
              className="h-px w-full"
              style={{
                background:
                  "linear-gradient(90deg, rgba(249,115,22,0.2), rgba(255,255,255,0.04), transparent)",
              }}
            />

            {/* Description */}
            <p className="text-neutral-500 text-sm leading-relaxed flex-1 group-hover:text-neutral-400 transition-colors duration-300">
              {service.description}
            </p>

            {/* CTA row */}
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-600 group-hover:text-orange-400 transition-colors duration-300 mt-auto">
              {service.cta}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </a>
    </motion.div>
  );
}

export default function ServicesSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section
      className="relative py-28 px-4 sm:px-6 lg:px-8 overflow-hidden"
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

      <div ref={ref} className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/8 bg-white/[0.03] mb-5">
            <Zap className="h-3 w-3 text-orange-500" />
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">
              Ecosystem
            </span>
          </div>

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter mb-4">
            Our{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #f97316, #eab308)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Services
            </span>
          </h2>

          <p className="text-neutral-500 max-w-xl mx-auto text-sm leading-relaxed">
            Empowering the FiveM community through a specialized suite of premium services
            and platforms.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {services.map((service, i) => (
            <ServiceCard key={service.name} service={service} index={i} inView={inView} />
          ))}
        </div>
      </div>
    </section>
  );
}
