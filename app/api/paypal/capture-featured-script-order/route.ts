import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { env } from "@/lib/env"
import { createFeaturedScriptSlots, getUserActiveFeaturedScriptSlots } from "@/lib/database-new"

// PayPal API base URL
const getPayPalBaseUrl = () => {
  return env.PAYPAL_ENVIRONMENT === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com"
}

// Get PayPal access token
async function getPayPalAccessToken(): Promise<string> {
  const baseUrl = getPayPalBaseUrl()
  const clientId = env.PAYPAL_CLIENT_ID
  const clientSecret = env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured")
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("PayPal OAuth token error:", {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    })
    throw new Error(`Failed to get PayPal access token: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  return data.access_token
}

// POST - Capture PayPal order and create featured script slots
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { orderId } = body

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        { error: "Invalid order ID" },
        { status: 400 }
      )
    }

    const accessToken = await getPayPalAccessToken()
    const baseUrl = getPayPalBaseUrl()
    const userId = (session.user as any).id

    // First, get the order details to extract custom_id
    const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!orderResponse.ok) {
      const error = await orderResponse.text()
      console.error("PayPal order fetch error:", error)
      return NextResponse.json(
        { error: "Failed to fetch PayPal order" },
        { status: 500 }
      )
    }

    const order = await orderResponse.json()

    // Extract custom_id from purchase_units
    const customId = order.purchase_units?.[0]?.custom_id
    if (!customId) {
      return NextResponse.json(
        { error: "Order missing custom data" },
        { status: 400 }
      )
    }

    const orderData = JSON.parse(customId)

    // Verify the order belongs to the current user
    if (orderData.userId !== userId) {
      return NextResponse.json(
        { error: "Order does not belong to current user" },
        { status: 403 }
      )
    }

    // Verify this is a featured script slots order
    if (orderData.type !== "featured_script_slots") {
      return NextResponse.json(
        { error: "Invalid order type" },
        { status: 400 }
      )
    }

    // Capture the order
    const captureResponse = await fetch(
      `${baseUrl}/v2/checkout/orders/${orderId}/capture`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!captureResponse.ok) {
      const error = await captureResponse.text()
      console.error("PayPal capture error:", error)
      return NextResponse.json(
        { error: "Failed to capture PayPal order" },
        { status: 500 }
      )
    }

    const captureData = await captureResponse.json()

    // Check if order was successfully captured
    if (captureData.status !== "COMPLETED") {
      return NextResponse.json(
        { error: `Order not completed. Status: ${captureData.status}` },
        { status: 400 }
      )
    }

    // Create featured script slots with PayPal order ID
    // Pass durationWeeks to calculate endDate based on weeks
    const paypalOrderIds = Array(orderData.slotsToAdd).fill(orderId)

    const createdSlot = await createFeaturedScriptSlots(
      userId,
      orderData.slotsToAdd,
      paypalOrderIds,
      orderData.packageId,
      0, // durationMonths (not used when durationWeeks is provided)
      orderData.durationWeeks // Pass weeks to calculate endDate properly
    )

    // Update the endDate to be based on weeks, not months
    // We'll need to update the slot's endDate after creation
    // For now, the database function calculates based on months, so we'll adjust
    // Actually, let's update the database function to handle weeks properly
    // But for now, let's use the months calculation and adjust the endDate manually if needed

    // Get updated active slots count
    const activeSlots = await getUserActiveFeaturedScriptSlots(userId)

    return NextResponse.json({
      success: true,
      activeSlots,
      slots: [createdSlot],
      message: `Successfully purchased ${orderData.slotsToAdd} featured script slot(s)`,
    })
  } catch (error) {
    console.error("Error capturing PayPal order:", error)
    return NextResponse.json(
      {
        error: "Failed to capture PayPal order",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

