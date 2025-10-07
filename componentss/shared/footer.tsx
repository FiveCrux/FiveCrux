"use client"

import { motion } from "framer-motion"
import Link from "next/link"

export default function Footer() {
  return (
    <motion.footer
      className="bg-black/80 border-t border-gray-800/50 py-12 px-4 sm:px-6 lg:px-8 backdrop-blur-xl relative"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 1 }}
      viewport={{ once: true }}
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-8"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, staggerChildren: 0.1 }}
          viewport={{ once: true }}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
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
                { name: "Community", href: "/community" },
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
              viewport={{ once: true }}
            >
              <h4 className="text-white font-semibold mb-4">{section.title}</h4>
              <ul className="space-y-2">
                {section.links.map((link, linkIndex) => (
                  <motion.li
                    key={link.name}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: sectionIndex * 0.1 + linkIndex * 0.05 }}
                    viewport={{ once: true }}
                  >
                    <Link
                      href={link.href}
                      className="text-gray-400 hover:text-orange-500 transition-colors duration-300 relative group"
                    >
                      {link.name}
                      <motion.div
                        className="absolute bottom-0 left-0 w-0 h-0.5 bg-orange-500 group-hover:w-full transition-all duration-300"
                        layoutId={`footer-${sectionIndex}-${linkIndex}`}
                      />
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
          viewport={{ once: true }}
        >
          <p className="text-gray-400">
            &copy; 2024 FiveHub. All rights reserved. Made with{" "}
            <motion.span
              className="text-red-500"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
            >
              ❤️
            </motion.span>{" "}
            for the FiveM community.
          </p>
        </motion.div>
      </div>
    </motion.footer>
  )
}
