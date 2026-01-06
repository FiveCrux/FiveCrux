import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { env } from "@/lib/env"

// PayPal API base URL
const getPayPalBaseUrl = () => {
  return env.PAYPAL_ENVIRONMENT === "production" || env.PAYPAL_ENVIRONMENT === "live"
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
      environment: env.PAYPAL_ENVIRONMENT,
      baseUrl: getPayPalBaseUrl(),
    })
    throw new Error(`Failed to get PayPal access token: ${response.status} ${response.statusText} - ${errorText}`)
  }

  const data = await response.json()
  return data.access_token
}

// POST - Create PayPal order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { packageId, durationMonths, price, slotsToAdd } = body

    // Validation
    if (!packageId || !["starter", "premium", "executive"].includes(packageId)) {
      return NextResponse.json(
        { error: "Invalid package ID" },
        { status: 400 }
      )
    }

    if (![1, 3, 6, 12].includes(durationMonths)) {
      return NextResponse.json(
        { error: "Invalid duration. Must be 1, 3, 6, or 12 months" },
        { status: 400 }
      )
    }

    if (typeof price !== "number" || price <= 0) {
      return NextResponse.json(
        { error: "Invalid price" },
        { status: 400 }
      )
    }

    if (typeof slotsToAdd !== "number" || slotsToAdd <= 0) {
      return NextResponse.json(
        { error: "Invalid slots count" },
        { status: 400 }
      )
    }

    const accessToken = await getPayPalAccessToken()
    const baseUrl = getPayPalBaseUrl()
    const returnUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/advertise?success=true`
    const cancelUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/advertise?canceled=true`

    // Create PayPal order for ONE-TIME purchase (not a subscription)
    // This follows the one-time purchase flow from SUBSCRIPTION_SLOT_SYSTEM.md
    // The order will be captured after user approval, then ad slots will be created
    const orderData = {
      intent: "CAPTURE", // One-time capture, not subscription
      purchase_units: [
        {
          amount: {
            currency_code: "EUR",
            value: price.toFixed(2),
          },
          description: `${packageId.toUpperCase()} Package - ${slotsToAdd} slot(s) for ${durationMonths} month(s)`,
          // Store purchase metadata in custom_id for retrieval after payment
          custom_id: JSON.stringify({
            packageId, // 'starter', 'premium', or 'executive'
            durationMonths, // 1, 3, 6, or 12 months (used to calculate endDate)
            slotsToAdd, // Total number of slots to create
            userId: (session.user as any).id, // For security verification
          }),
        },
      ],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        brand_name: "Crux Marketplace",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
      },
    }

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(orderData),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error("PayPal order creation error:", error)
      return NextResponse.json(
        { error: "Failed to create PayPal order" },
        { status: 500 }
      )
    }

    const order = await response.json()

    return NextResponse.json({
      orderId: order.id,
      approvalUrl: order.links?.find((link: any) => link.rel === "approve")?.href,
    })
  } catch (error) {
    console.error("Error creating PayPal order:", error)
    return NextResponse.json(
      {
        error: "Failed to create PayPal order",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}

