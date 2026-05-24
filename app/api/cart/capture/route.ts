import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { env } from "@/lib/env";
import { db } from "@/lib/db/client";
import { orders, orderItems, carts, cartItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdSlots, createFeaturedScriptSlots } from "@/lib/database-new";

// Get PayPal base URL
const getPayPalBaseUrl = () => {
  return env.PAYPAL_ENVIRONMENT === "production" || env.PAYPAL_ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
};

// Get PayPal access token
async function getPayPalAccessToken(): Promise<string> {
  const baseUrl = getPayPalBaseUrl();
  const clientId = env.PAYPAL_CLIENT_ID;
  const clientSecret = env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${auth}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("PayPal OAuth token error in cart capture:", errorText);
    throw new Error("Failed to get PayPal access token");
  }

  const data = await response.json();
  return data.access_token;
}

function generateNumericId() {
  return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
}

function isPayPalOrderCompleted(order: any): boolean {
  if (order.status === "COMPLETED") return true;

  const captures = order.purchase_units?.[0]?.payments?.captures;
  return Array.isArray(captures) && captures.some((capture: any) => capture.status === "COMPLETED");
}

async function fetchPayPalOrder(token: string, accessToken: string, baseUrl: string) {
  const orderResponse = await fetch(`${baseUrl}/v2/checkout/orders/${token}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!orderResponse.ok) {
    const errorText = await orderResponse.text();
    console.error("Failed to fetch PayPal order:", errorText);
    throw new Error("Failed to fetch PayPal order");
  }

  return orderResponse.json();
}

function isOrderAlreadyCapturedError(errorText: string): boolean {
  try {
    const errorData = JSON.parse(errorText);
    return Array.isArray(errorData.details)
      && errorData.details.some((detail: any) => detail.issue === "ORDER_ALREADY_CAPTURED");
  } catch {
    return false;
  }
}

// POST - Capture cart PayPal payment and provision items/subscriptions
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { token } = body; // token is the PayPal order ID

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 });
    }

    const accessToken = await getPayPalAccessToken();
    const baseUrl = getPayPalBaseUrl();

    // 1. Fetch the PayPal order to extract custom metadata
    const order = await fetchPayPalOrder(token, accessToken, baseUrl);

    const customId = order.purchase_units?.[0]?.custom_id;
    if (!customId) {
      return NextResponse.json({ error: "Order missing custom metadata" }, { status: 400 });
    }

    const orderData = JSON.parse(customId);

    // Verify the order belongs to this user
    if (orderData.userId !== userId) {
      return NextResponse.json({ error: "Order does not belong to this user" }, { status: 403 });
    }

    const dbOrderId = orderData.orderId;
    const cartId = orderData.cartId;

    // Fetch the DB order
    const dbOrder = await db.query.orders.findFirst({
      where: eq(orders.id, dbOrderId),
    });

    if (!dbOrder) {
      return NextResponse.json({ error: "Order not found in database" }, { status: 404 });
    }

    const existingOrderItems = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, dbOrderId),
      limit: 1,
    });

    if (dbOrder.status === "paid" && existingOrderItems.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Order already processed",
      });
    }

    // 2. Capture the PayPal payment if not already done
    let captureData = order;
    if (!isPayPalOrderCompleted(order)) {
      const captureResponse = await fetch(`${baseUrl}/v2/checkout/orders/${token}/capture`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!captureResponse.ok) {
        const errorText = await captureResponse.text();

        if (isOrderAlreadyCapturedError(errorText)) {
          captureData = await fetchPayPalOrder(token, accessToken, baseUrl);
        } else {
          console.error("PayPal cart order capture error:", errorText);
          return NextResponse.json({ error: "Failed to capture payment" }, { status: 500 });
        }
      } else {
        captureData = await captureResponse.json();
      }
    }

    if (!isPayPalOrderCompleted(captureData)) {
      return NextResponse.json({ error: `Payment not completed. Status: ${captureData.status}` }, { status: 400 });
    }

    // 3. Update the database order and provision items
    const needsProcessing = dbOrder.status !== "paid" || existingOrderItems.length === 0;

    if (needsProcessing) {
      if (dbOrder.status !== "paid") {
        await db.update(orders)
          .set({
            status: "paid",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, dbOrderId));
      }

      // 4. Retrieve cart items to populate order_items and provision
      const cart = await db.query.carts.findFirst({
        where: eq(carts.id, cartId),
        with: {
          items: true,
        },
      });

      if (cart && existingOrderItems.length === 0) {
        for (const item of cart.items) {
          // Insert into order_items
          await db.insert(orderItems)
            .values({
              id: generateNumericId(),
              orderId: dbOrderId,
              itemType: item.itemType,
              itemId: item.itemId,
              title: item.title,
              price: item.price,
              quantity: item.quantity,
            });

          // Parse metadata for subscription details
          const metadata = typeof item.metadata === "string"
            ? (() => { try { return JSON.parse(item.metadata) } catch { return null } })()
            : item.metadata;

          // Provision active entitlements
          if (item.itemType === "subscription" && metadata) {
            const packageId = metadata.packageId;
            const slotsToAdd = metadata.slotsToAdd || metadata.slotsPerMonth || 1;
            const durationMonths = metadata.durationMonths || 1;
            const durationWeeks = metadata.durationWeeks;

            const paypalOrderIds = Array(slotsToAdd).fill(token);

            if (metadata.packageType === "ads") {
              await createAdSlots(
                userId,
                slotsToAdd,
                paypalOrderIds,
                packageId,
                durationMonths
              );
            } else if (metadata.packageType === "featured-scripts") {
              await createFeaturedScriptSlots(
                userId,
                slotsToAdd,
                paypalOrderIds,
                packageId,
                0,
                durationWeeks
              );
            }
          }
        }

        await db.delete(cartItems).where(eq(cartItems.cartId, cartId));
        await db.update(carts)
          .set({
            status: "completed",
            updatedAt: new Date(),
          })
          .where(eq(carts.id, cartId));
      }
    }

    return NextResponse.json({
      success: true,
      message: "Order successfully captured and items provisioned",
    });
  } catch (error) {
    console.error("Cart capture error:", error);
    return NextResponse.json({
      error: "Failed to process payment capture",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
