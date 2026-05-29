"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"

const footerLinks = [
  {
    title: "Categories",
    links: [
      { name: "Scripts", href: "/scripts?category=scripts" },
      { name: "Maps", href: "/scripts?category=maps" },
      { name: "Props", href: "/props" },
      { name: "Clothing", href: "/scripts?category=clothing" },
      { name: "Economy", href: "/scripts?category=economy" },
      { name: "Vehicles", href: "/scripts?category=vehicles" },
    ],
  },
  {
    title: "Marketplace",
    links: [
      { name: "Browse All", href: "/scripts" },
      { name: "Giveaways", href: "/giveaways" },
      { name: "Advertise", href: "/advertise" },
    ],
  },
  {
    title: "Support",
    links: [
      { name: "Contact Us", href: "mailto:support@fivecrux.com" },
      { name: "Discord", href: "https://discord.gg/EwGrUb7DW6", target: "_blank" },
    ],
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      bounce: 0,
      duration: 0.6,
    },
  },
}

export default function Footer() {
  return (
    <motion.footer
      className="w-full flex justify-center pb-8 px-4"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ type: "spring", bounce: 0, duration: 0.7 }}
    >
      {/* Floating pill container — mirrors the navbar */}
      <div
        className="w-full max-w-[min(1200px,96vw)] rounded-2xl overflow-hidden"
        style={{
          background: "rgba(26, 26, 26, 0.85)",
          border: "1px solid rgba(249, 115, 22, 0.12)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.04), 0 8px 40px rgba(0,0,0,0.5), 0 2px 8px rgba(249,115,22,0.06)",
        }}
      >
        {/* Subtle orange radial glow in the top-left */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 40% at 10% 0%, rgba(249,115,22,0.06) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 py-10 px-8 sm:px-10 lg:px-12">
          {/* Main grid */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr_1fr_1fr] gap-10"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            {/* Brand column */}
            <motion.div variants={itemVariants} className="flex flex-col gap-4">
              <Link href="/" className="flex items-center gap-2 w-fit group">
                <Image src="/CF.svg" alt="FiveCrux logo" width={44} height={44} />
                <span className="text-2xl font-bold">
                  <motion.span
                    className="text-orange-500 inline-block"
                    animate={{
                      textShadow: [
                        "0 0 8px rgba(249,115,22,0.4)",
                        "0 0 16px rgba(249,115,22,0.7)",
                        "0 0 8px rgba(249,115,22,0.4)",
                      ],
                    }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  >
                    Five
                  </motion.span>
                  <motion.span
                    className="text-yellow-400 inline-block"
                    animate={{
                      textShadow: [
                        "0 0 8px rgba(234,179,8,0.4)",
                        "0 0 16px rgba(234,179,8,0.7)",
                        "0 0 8px rgba(234,179,8,0.4)",
                      ],
                    }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
                  >
                    Crux
                  </motion.span>
                </span>
              </Link>
              <p className="text-neutral-400 text-sm leading-relaxed max-w-[240px]">
                Your trusted source for premium FiveM scripts and resources. Built by developers, for developers.
              </p>
              {/* Discord pill */}
              <Link
                href="https://discord.gg/EwGrUb7DW6"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 w-fit mt-1 px-3 py-1.5 rounded-full text-xs font-semibold text-neutral-200 transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  background: "rgba(88, 101, 242, 0.15)",
                  border: "1px solid rgba(88, 101, 242, 0.3)",
                }}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-[#5865F2]">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.101 18.08.114 18.102.132 18.116a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                Join our Discord
              </Link>
            </motion.div>

            {/* Link columns */}
            {footerLinks.map((section) => (
              <motion.div key={section.title} variants={itemVariants}>
                <h4 className="text-white text-sm font-semibold mb-4 tracking-wide uppercase opacity-60">
                  {section.title}
                </h4>
                <ul className="space-y-2.5">
                  {section.links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        target={(link as any).target}
                        className="text-neutral-400 hover:text-orange-400 text-sm transition-colors duration-200 relative group inline-flex items-center gap-1"
                      >
                        <span className="absolute -left-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-orange-500 text-xs">›</span>
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom bar */}
          <motion.div
            className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <p className="text-neutral-500 text-xs">
              © 2026 FiveCrux. All rights reserved.
            </p>
            <p className="text-neutral-600 text-xs">
              Made with{" "}
              <span className="text-orange-500">♥</span>{" "}
              for the FiveM community
            </p>
          </motion.div>
        </div>
      </div>
    </motion.footer>
  )
}
