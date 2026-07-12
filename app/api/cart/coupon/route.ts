import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/auth"
import { FIVECRUX_TEBEX_PUBLIC_TOKEN } from "@/lib/tebex"
import { previewCoupon } from "@/lib/tebex-checkout-flow"

// Preview whether a coupon code is valid before checkout. Coupons are
// Tebex-native (2026-07-12) — there's no FiveCrux-side coupon table anymore,
// so this applies the code to a throwaway empty Tebex basket and reports
// whether Tebex accepts it. It CANNOT show the real discount amount: this
// store requires the buyer to log in before packages can be added to a
// basket, so the true post-discount total is only known once the real,
// authenticated, package-filled basket is built during actual checkout (see
// lib/tebex-checkout-flow.ts's finalizeBasket()).
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const code = typeof body.couponCode === "string" ? body.couponCode.trim().toUpperCase() : ""

    if (!code) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 })
    }

    const storeToken = FIVECRUX_TEBEX_PUBLIC_TOKEN
    if (!storeToken) {
      return NextResponse.json({ error: "Store not configured" }, { status: 501 })
    }

    const result = await previewCoupon(storeToken, code)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({
      success: true,
      coupon: { code: result.code },
    })
  } catch (error) {
    console.error("Coupon preview error:", error)
    return NextResponse.json({ error: "Failed to validate coupon" }, { status: 500 })
  }
}
