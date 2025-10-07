"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/componentss/ui/button"
import { Upload } from "lucide-react"

export default function MarketplacePage() {
  return (
    <motion.div
      className="container mx-auto px-4 py-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-4">Script Marketplace</h1>
        <p className="text-gray-600">Explore and download high-quality scripts for your projects.</p>
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Link href="/scripts/submit">
            <Button className="bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-600 hover:to-yellow-500 text-black font-bold px-8 py-3 text-lg shadow-lg">
              <Upload className="mr-2 h-5 w-5" />
              Submit Your Script
            </Button>
          </Link>
        </motion.div>
      </motion.div>

      {/* Add script listing or other content here */}
    </motion.div>
  )
}
