import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { env } from "@/lib/env"
import { createAdSlots, getUserActiveAdSlots } from "@/lib/database-new"

// PayPal API base URL
const getPayPalBaseUrl = () => {
  return env.PAYPAL_ENVIRONMENT === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com"
}

// Get PayPal access token
// This matches the cURL command:
// curl -v -X POST "https://api-m.sandbox.paypal.com/v1/oauth2/token" \
//  -u "CLIENT_ID:CLIENT_SECRET" \
//  -H "Content-Type: application/x-www-form-urlencoded" \
//  -d "grant_type=client_credentials"
async function getPayPalAccessToken(): Promise<string> {
  const baseUrl = getPayPalBaseUrl()
  const clientId = env.PAYPAL_CLIENT_ID
  const clientSecret = env.PAYPAL_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured")
  }

  // Basic auth: base64 encode "CLIENT_ID:CLIENT_SECRET"
  // This is equivalent to cURL's -u flag
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`, // Basic auth header
    },
    body: "grant_type=client_credentials", // Form data body
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

// POST - Capture PayPal order and create ad slots
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

    // Create ad slots with PayPal order ID
    // This is a ONE-TIME purchase (not a subscription)
    // Creates a single row with all slot unique IDs in slotNumber array
    // The endDate is automatically calculated as purchaseDate + durationMonths
    const paypalOrderIds = Array(orderData.slotsToAdd).fill(orderId)

    const createdSlot = await createAdSlots(
      userId,
      orderData.slotsToAdd,
      paypalOrderIds,
      orderData.packageId,
      orderData.durationMonths
    )

    // Get updated active slots count
    const activeSlots = await getUserActiveAdSlots(userId)

    // Response format matches SUBSCRIPTION_SLOT_SYSTEM.md documentation
    return NextResponse.json({
      success: true,
      activeSlots, // Total active slots count after purchase
      slots: [createdSlot], // Single slot object wrapped in array (slotNumber contains all unique IDs)
      message: `Successfully purchased ${orderData.slotsToAdd} ad slot(s)`,
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

