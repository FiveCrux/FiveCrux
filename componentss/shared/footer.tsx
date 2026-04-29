"use client"

import { HexagonBackground } from "@/components/animate-ui/components/backgrounds/hexagon"
import { motion } from "framer-motion"
import Link from "next/link"
import Image from "next/image"
import { Heart, Mail, MessageSquare, Twitter, Github } from "lucide-react"

export default function Footer() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1, 
      transition: { staggerChildren: 0.1, delayChildren: 0.2 } 
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { type: "spring", stiffness: 260, damping: 20 } 
    }
  }

  return (
    <footer className="relative mt-20 overflow-hidden border-t border-white/[0.05] bg-[#050508]">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <HexagonBackground 
          className="absolute inset-0" 
          hexagonProps={{ 
            className: "before:bg-neutral-950 after:bg-neutral-950" 
          }} 
        />
      </div>

      {/* Top gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />

      <div className="max-w-7xl mx-auto relative z-10 pt-20 pb-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16"
        >
          {/* Brand section */}
          <motion.div variants={itemVariants} className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6 group">
              <div className="relative">
                 <div className="absolute inset-0 bg-orange-500/20 blur-lg rounded-full group-hover:scale-150 transition-transform duration-500" />
                 <Image src="/CF.svg" alt="FiveCrux Logo" width={42} height={42} className="relative" />
              </div>
              <span className="flex items-baseline gap-0.5">
                <motion.span
                  className="text-orange-500 text-xl font-bold tracking-tight"
                  animate={{ textShadow: ["0 0 6px rgba(249,115,22,0.2)", "0 0 15px rgba(249,115,22,0.5)", "0 0 6px rgba(249,115,22,0.2)"] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  Five
                </motion.span>
                <motion.span
                  className="text-yellow-400 text-xl font-bold tracking-tight"
                  animate={{ textShadow: ["0 0 6px rgba(234,179,8,0.2)", "0 0 15px rgba(234,179,8,0.5)", "0 0 6px rgba(234,179,8,0.2)"] }}
                  transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
                >
                  Crux
                </motion.span>
              </span>
            </Link>
            <p className="text-neutral-400 text-sm leading-relaxed mb-6 max-w-xs">
              The premier ecosystem for high-fidelity FiveM resources. Engineered for developers who demand the absolute best for their community.
            </p>
            <div className="flex items-center gap-3">
              {[
                { icon: MessageSquare, href: "https://discord.gg/EwGrUb7DW6", label: "Discord" },
                { icon: Twitter, href: "#", label: "Twitter" },
                { icon: Github, href: "#", label: "Github" }
              ].map((social) => (
                <a 
                  key={social.label}
                  href={social.href}
                  className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-neutral-400 hover:text-orange-500 hover:border-orange-500/30 hover:bg-orange-500/5 transition-all duration-300"
                  aria-label={social.label}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </motion.div>

          {/* Links sections */}
          {[
            {
              title: "Marketplace",
              links: [
                { name: "Browse Scripts", href: "/scripts" },
                { name: "Maps & Props", href: "/scripts?category=maps" },
                { name: "Vehicles", href: "/scripts?category=vehicles" },
                { name: "Clothing", href: "/scripts?category=clothing" },
                { name: "Frameworks", href: "/scripts?category=economy" }
              ],
            },
            {
              title: "Platform",
              links: [
                { name: "Giveaways", href: "/giveaways" },
                { name: "Submit a Script", href: "/scripts/submit" },
                { name: "Partner Program", href: "#" },
                { name: "Advertising", href: "/advertise" }
              ],
            },
            {
              title: "Support",
              links: [
                { name: "Contact Us", href: "mailto:support@fivecrux.com" },
                { name: "Discord Support", href: "https://discord.gg/EwGrUb7DW6" },
                { name: "Documentation", href: "#" },
                { name: "Privacy Policy", href: "#" }
              ],
            },
          ].map((section) => (
            <motion.div key={section.title} variants={itemVariants}>
              <h4 className="text-white font-bold text-sm uppercase tracking-widest mb-6">{section.title}</h4>
              <ul className="space-y-4">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-neutral-400 hover:text-orange-500 text-sm transition-colors duration-300 flex items-center group"
                    >
                      <span className="w-0 group-hover:w-2 h-px bg-orange-500 mr-0 group-hover:mr-2 transition-all duration-300" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </motion.div>

        {/* Footer bottom */}
        <motion.div
          variants={itemVariants}
          className="pt-8 border-t border-white/[0.05] flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left"
        >
          <p className="text-neutral-500 text-xs tracking-wide">
            &copy; {new Date().getFullYear()} <span className="text-neutral-300">FiveCrux</span>. All rights reserved.
          </p>
          <p className="text-neutral-500 text-xs flex items-center gap-1.5">
            Crafted with <Heart size={12} className="text-orange-500 fill-orange-500/20" /> for the FiveM community.
          </p>
        </motion.div>
      </div>
    </footer>
  )
}
