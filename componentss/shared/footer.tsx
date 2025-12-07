"use client"

import { HexagonBackground } from "@/components/animate-ui/components/backgrounds/hexagon"
import { motion } from "framer-motion"
import Link from "next/link"

export default function Footer() {
  return (
    <motion.footer
    className="border-t border-gray-800/50 relative overflow-hidden min-h-[400px]"
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    transition={{ duration: 1 }}
  >
    <HexagonBackground 
      className="absolute inset-0 bg-neutral-950 dark:bg-neutral-950" 
      hexagonProps={{ 
        className: "before:bg-neutral-950 dark:before:bg-neutral-950 after:bg-neutral-950 dark:after:bg-neutral-950" 
      }} 
    />
    <div className="max-w-7xl mx-auto relative z-10 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center md:text-left items-center md:items-start"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, staggerChildren: 0.1 }}
        
      >
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center md:text-left"
        >
          <h3 className="text-2xl font-bold mb-4">
            <span className="text-orange-500">Five</span>
            <span className="text-yellow-400">Hub</span>
          </h3>
          <p className="text-gray-400 mb-4 leading-relaxed">
            Your trusted source for premium FiveM scripts and resources. Built by developers, for developers.
          </p>
        </motion.div>

        {[
          {
            title: "Categories",
            links: [
              { name: "Economy", href: "/scripts?category=economy" },
              { name: "Vehicles", href: "/scripts?category=vehicles" },
              { name: "Jobs", href: "/scripts?category=jobs" },
              { name: "Housing", href: "/scripts?category=housing" },
            ],
          },
          {
            title: "Support",
            links: [
              { name: "Help Center", href: "/help" },
              { name: "Contact Us", href: "/contact" },
              { name: "Discord", href: "/discord" },
              { name: "Terms of Service", href: "/terms" },
            ],
          },
          {
            title: "Connect",
            links: [
              { name: "Giveaways", href: "/giveaways" },
              { name: "Submit Script", href: "/scripts/submit" },
              { name: "For Developers", href: "/developers" },
              { name: "API", href: "/api" },
            ],
          },
        ].map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: sectionIndex * 0.1 }}
            className="text-center md:text-left"
          >
            <h4 className="text-white font-semibold mb-4">{section.title}</h4>
            <ul className="space-y-2 flex flex-col items-center md:items-start">
              {section.links.map((link, linkIndex) => (
                <motion.li
                  key={link.name}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: sectionIndex * 0.1 + linkIndex * 0.05 }}
                >
                  <Link
                    href={link.href}
                    className="text-gray-400 hover:text-orange-500 transition-colors duration-300 relative group"
                  >
                    {link.name}
                  </Link>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        className="border-t border-gray-800/50 mt-8 pt-8 text-center"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <p className="text-gray-400">
          &copy; 2024 FiveHub. All rights reserved. Made with{" "}
          for the FiveM community.
        </p>
      </motion.div>
    </div>
  </motion.footer>
  )
}
