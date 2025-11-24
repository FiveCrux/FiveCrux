import { NextResponse } from "next/server"
import { env } from "@/lib/env"

// GET - Get PayPal client ID for frontend
export async function GET() {
  try {
    const clientId = env.PAYPAL_CLIENT_ID

    if (!clientId) {
      return NextResponse.json(
        { error: "PayPal client ID not configured" },
        { status: 500 }
      )
    }

    // Return client ID and environment
    return NextResponse.json({
      clientId,
      environment: env.PAYPAL_ENVIRONMENT,
    })
  } catch (error) {
    console.error("Error fetching PayPal client ID:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch PayPal client ID",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

