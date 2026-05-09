import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";

import { db } from "@/lib/db/client";

import {
    carts,
    cartItems,
    props,
    subscriptions,
} from "@/lib/db/schema";

import {
    and,
    eq,
    sql,
} from "drizzle-orm";

function generateNumericId() {
    return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
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

        const body = await request.json();

        const {
            itemType,
            itemId,
            title,
            price,
            metadata,
        } = body;

        if (!itemType || !itemId) {
            return NextResponse.json(
                { error: "Missing fields" },
                { status: 400 }
            );
        }

        if (itemType !== "subscription" && itemType !== "prop") {
            return NextResponse.json(
                { error: "Invalid item type" },
                { status: 400 }
            );
        }

        // 1. Get active cart
        let cart = await db.query.carts.findFirst({
            where: and(
                eq(carts.userId, user.id),
                eq(carts.status, "active")
            ),
        });

        // 2. Create cart if not exists
        if (!cart) {

            const [newCart] = await db.insert(carts)
                .values({
                    id: generateNumericId(),
                    userId: user.id,
                    status: "active",
                })
                .returning();

            cart = newCart;
        }

        // 3. Fetch actual item or use provided ad package data
        let item;

        if (itemType === "subscription") {
            item = await db.query.subscriptions.findFirst({
                where: eq(subscriptions.id, itemId),
            });
        } else if (itemType === "prop" && typeof title === "string" && price !== undefined) {
            const parsedPrice = Number(price);

            if (Number.isNaN(parsedPrice)) {
                return NextResponse.json(
                    { error: "Invalid price" },
                    { status: 400 }
                );
            }

            item = {
                title,
                price: parsedPrice,
                metadata: metadata ?? null,
            } as any;
        } else {
            item = await db.query.props.findFirst({
                where: eq(props.id, itemId),
            });
        }

        if (!item) {
            return NextResponse.json(
                { error: "Item not found" },
                { status: 404 }
            );
        }

        // 4. Check existing cart item
        const existingItem =
            await db.query.cartItems.findFirst({
                where: and(
                    eq(cartItems.cartId, cart.id),
                    eq(cartItems.itemId, itemId),
                    eq(cartItems.itemType, itemType),
                ),
            });

        // 5. Update OR Insert
        if (existingItem) {

            await db.update(cartItems)
                .set({
                    quantity: sql`${cartItems.quantity} + 1`,
                    updatedAt: new Date(),
                })
                .where(eq(cartItems.id, existingItem.id));

        } else {

            await db.insert(cartItems)
                .values({
                    id: generateNumericId(),
                    cartId: cart.id,

                    itemType,
                    itemId,

                    title: item.title,

                    price: item.price,

                    quantity: 1,

                    metadata: item.metadata ?? null,
                });

        }

        return NextResponse.json({
            success: true,
        });

    } catch (error) {

        console.error("Add to cart error:", error);

        return NextResponse.json(
            { error: "Failed to add to cart" },
            { status: 500 }
        );
    }
}
