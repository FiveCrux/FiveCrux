"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, XCircle, Loader2, ArrowRight, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/componentss/ui/button"

type CartPaymentSuccessProps = {
  token: string
}

export default function CartPaymentSuccess({ token }: CartPaymentSuccessProps) {
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing")
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    let active = true

    const capturePayment = async () => {
      try {
        const response = await fetch("/api/cart/capture", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data.error || "Failed to complete payment capture")
        }

        setStatus("success")
        window.dispatchEvent(new CustomEvent("cartUpdated"))
      } catch (err) {
        if (active) {
          setStatus("error")
          setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred while capturing payment.")
        }
      }
    }

    capturePayment()

    return () => {
      active = false
    }
  }, [token])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md rounded-3xl border border-gray-800 bg-neutral-900/60 backdrop-blur-md p-8 md:p-10 shadow-2xl text-center"
      >
        {status === "processing" && (
          <div className="space-y-6 py-6">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <Loader2 className="h-16 w-16 text-orange-500 animate-spin absolute" />
              <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-orange-400" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Verifying Payment</h2>
              <p className="text-gray-400 text-sm max-w-xs mx-auto">
                Please wait while we confirm your transaction and activate your purchases...
              </p>
            </div>
          </div>
        )}

        {status === "success" && (
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
              <p className="text-green-400 font-semibold">Your payment has been successfully processed.</p>
              <p className="text-gray-400 text-sm max-w-xs mx-auto mt-2">
                All purchased items, active ad slots, or featured scripts are now fully active on your account.
              </p>
            </div>

            <div className="border-t border-gray-800/80 my-2 pt-6 flex flex-col gap-3">
              <Link href="/profile?tab=coupons" className="w-full">
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
        )}

        {status === "error" && (
          <div className="space-y-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-20 h-20 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto"
            >
              <XCircle className="h-12 w-12 text-red-400" />
            </motion.div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Capture Failed</h2>
              <p className="text-red-400 text-sm font-medium">
                {errorMsg || "We encountered an issue confirming your payment with PayPal."}
              </p>
              <p className="text-gray-400 text-xs max-w-xs mx-auto mt-1">
                If the money has been deducted from your account, please contact our support and provide the PayPal token: <code className="bg-neutral-950 px-1 py-0.5 rounded text-gray-300 font-mono text-[10px]">{token}</code>
              </p>
            </div>

            <div className="border-t border-gray-800/80 my-2 pt-6 flex flex-col gap-3">
              <Link href="/cart" className="w-full">
                <Button className="w-full bg-slate-800 text-white font-semibold py-6 rounded-full hover:bg-slate-700 transition-all">
                  Return to Cart
                </Button>
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
