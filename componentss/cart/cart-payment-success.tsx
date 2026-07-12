"use client"

import { useEffect } from "react"
import { CheckCircle2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/componentss/ui/button"

// Tebex payments are confirmed asynchronously by the webhook
// (app/api/tebex/webhook → provisionCart), which marks the order paid, clears
// the cart, and activates the slots. So the return page just confirms the
// payment was received — there is no client-side capture step.
export default function CartPaymentSuccess() {
  useEffect(() => {
    // Refresh the cart badge (the webhook clears the cart server-side).
    window.dispatchEvent(new CustomEvent("cartUpdated"))
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-3xl border border-gray-800 bg-neutral-900/60 backdrop-blur-md p-8 md:p-10 shadow-2xl text-center"
      >
        <div className="space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto"
          >
            <CheckCircle2 className="h-12 w-12 text-green-400" />
          </motion.div>

          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-white">Thank You!</h2>
            <p className="text-green-400 font-semibold">Your payment has been received.</p>
            <p className="text-gray-400 text-sm max-w-xs mx-auto mt-2">
              Your ad slots / featured-asset slots activate within moments of
              the payment confirmation. Check your dashboard below.
            </p>
          </div>

          <div className="border-t border-gray-800/80 my-2 pt-6 flex flex-col gap-3">
            <Link href="/profile" className="w-full">
              <Button className="w-full !bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 text-black font-bold py-6 text-base rounded-full shadow-lg hover:brightness-110 border-none transition-all">
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/marketplace" className="w-full">
              <Button variant="outline" className="w-full border-gray-800 text-gray-300 rounded-full py-6 hover:bg-neutral-800 hover:text-white">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
