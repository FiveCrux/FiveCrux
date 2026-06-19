import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { env } from "@/lib/env";
import { validateCoupon } from "@/lib/cart-checkout-utils";

import { db } from "@/lib/db/client";

import {
    carts,
    couponRedemptions,
    coupons,
    orders,
} from "@/lib/db/schema";

import {
    and,
    eq,
    sql,
} from "drizzle-orm";

function generateNumericId() {
    return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
}

const getPayPalBaseUrl = () => {
    return env.PAYPAL_ENVIRONMENT === "production"
        ? "https://api-m.paypal.com"
        : "https://api-m.sandbox.paypal.com";
};

async function getPayPalAccessToken(): Promise<string> {
    const clientId = env.PAYPAL_CLIENT_ID;
    const clientSecret = env.PAYPAL_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error("PayPal credentials not configured");
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${auth}`,
        },
        body: "grant_type=client_credentials",
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("PayPal OAuth token error:", errorText);
        throw new Error("Failed to get PayPal access token");
    }

    const data = await response.json();
    return data.access_token;
}

export async function POST(request: NextRequest) {

    try {

        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = session.user as any;

        const body = await request.json().catch(() => ({}));
        const couponCode = typeof body.couponCode === "string" ? body.couponCode : "";

        // 1. Get cart
        const cart = await db.query.carts.findFirst({
            where: and(
                eq(carts.userId, user.id),
                eq(carts.status, "active")
            ),

            with: {
                items: true,
            },
        });

        if (!cart || cart.items.length === 0) {

            return NextResponse.json(
                { error: "Cart empty" },
                { status: 400 }
            );
        }

        // 2. Calculate total
        let total = 0;

        for (const item of cart.items) {

            total +=
                Number(item.price) *
                item.quantity;
        }

        const couponResult = await validateCoupon(couponCode, user.id, total, cart.items);

        if (couponResult && "error" in couponResult) {
            return NextResponse.json(
                { error: couponResult.error },
                { status: 400 }
            );
        }

        const appliedCoupon = couponResult?.coupon ?? null;
        const discountAmount = couponResult?.discountAmount ?? 0;
        const payableAmount = Math.max(0, total - discountAmount);

        if (payableAmount <= 0) {
            return NextResponse.json(
                { error: "Payable amount must be greater than 0 to start payment" },
                { status: 400 }
            );
        }

        // 3. Create order
        const [order] = await db.insert(orders)
            .values({
                id: generateNumericId(),
                userId: user.id,
                cartId: cart.id,
                couponId: appliedCoupon?.id ?? null,

                totalAmount: total.toString(),
                discountAmount: discountAmount.toFixed(2),
                payableAmount: payableAmount.toFixed(2),

                status: "pending",
            })
            .returning();

        if (appliedCoupon) {
            await db.insert(couponRedemptions)
                .values({
                    id: generateNumericId(),
                    couponId: appliedCoupon.id,
                    userId: user.id,
                    orderId: order.id,
                });

            await db.update(coupons)
                .set({
                    usedCount: sql`${coupons.usedCount} + 1`,
                    updatedAt: new Date(),
                })
                .where(eq(coupons.id, appliedCoupon.id));
        }

        const accessToken = await getPayPalAccessToken();
        const baseUrl = getPayPalBaseUrl();
        const siteUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

        const paypalResponse = await fetch(`${baseUrl}/v2/checkout/orders`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                intent: "CAPTURE",
                purchase_units: [
                    {
                        amount: {
                            currency_code: "EUR",
                            value: payableAmount.toFixed(2),
                        },
                        description: `Cart order #${order.id}`,
                        custom_id: JSON.stringify({
                            orderId: order.id,
                            cartId: cart.id,
                            userId: user.id,
                            couponId: appliedCoupon?.id ?? null,
                        }),
                    },
                ],
                application_context: {
                    return_url: `${siteUrl}/cart?payment=success`,
                    cancel_url: `${siteUrl}/cart?payment=cancelled`,
                    brand_name: "Crux Marketplace",
                    landing_page: "BILLING",
                    user_action: "PAY_NOW",
                },
            }),
        });

        if (!paypalResponse.ok) {
            const error = await paypalResponse.text();
            console.error("PayPal cart order creation error:", error);
            return NextResponse.json(
                { error: "Failed to create PayPal order" },
                { status: 500 }
            );
        }

        const paypalOrder = await paypalResponse.json();
        const approvalUrl = paypalOrder.links?.find((link: any) => link.rel === "approve")?.href;

        if (!approvalUrl) {
            return NextResponse.json(
                { error: "PayPal approval URL missing" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            order,
            approvalUrl,
        });

    } catch (error) {

        console.error(error);

        return NextResponse.json(
            { error: "Checkout failed" },
            { status: 500 }
        );
    }
}
