import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";

import { db } from "@/lib/db/client";

import {
    carts,
    cartItems,
} from "@/lib/db/schema";

import {
    and,
    eq,
} from "drizzle-orm";

export async function GET() {

    try {

        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = session.user as any;

        const cart = await db.query.carts.findFirst({
            where: and(
                eq(carts.userId, user.id),
                eq(carts.status, "active")
            ),

            with: {
                items: true,
            },
        });

        if (!cart) {
            return NextResponse.json({
                items: [],
                total: 0,
            });
        }

        let total = 0;

        for (const item of cart.items) {

            total +=
                Number(item.price) *
                item.quantity;
        }

        return NextResponse.json({
            ...cart,
            total,
        });

    } catch (error) {

        console.error(error);

        return NextResponse.json(
            { error: "Failed to fetch cart" },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
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
        const { cartItemId, itemId, itemType } = body;

        if (!cartItemId && !(itemId && itemType)) {
            return NextResponse.json(
                { error: "Missing cart item identifier" },
                { status: 400 }
            );
        }

        const cart = await db.query.carts.findFirst({
            where: and(
                eq(carts.userId, user.id),
                eq(carts.status, "active")
            ),
        });

        if (!cart) {
            return NextResponse.json(
                { error: "Cart not found" },
                { status: 404 }
            );
        }

        const item = await db.query.cartItems.findFirst({
            where: cartItemId
                ? and(
                    eq(cartItems.id, Number(cartItemId)),
                    eq(cartItems.cartId, cart.id)
                )
                : and(
                    eq(cartItems.itemId, itemId),
                    eq(cartItems.itemType, itemType),
                    eq(cartItems.cartId, cart.id)
                ),
        });

        if (!item) {
            return NextResponse.json(
                { error: "Cart item not found" },
                { status: 404 }
            );
        }

        await db.delete(cartItems).where(eq(cartItems.id, item.id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
            { error: "Failed to remove cart item" },
            { status: 500 }
        );
    }
}
