import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";
import { assertNotBlocked } from "@/lib/api-auth";
import { MAX_CART_QUANTITY } from "@/lib/slot-count";

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

/**
 * PATCH /api/cart — change how many of a cart line the buyer wants.
 *
 * Body: { cartItemId: number, quantity: number }
 *
 * SECURITY: only the quantity is writable. The price stays whatever the server
 * put there when the item was added, so a client cannot reprice its own cart by
 * sending a price alongside. The line is looked up scoped to the caller's own
 * active cart, so an id belonging to someone else simply is not found.
 */
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const user = session.user as any;

        // Fraud block: a chargeback-blocked account keeps read access but must
        // not be able to change what it is buying.
        const blocked = await assertNotBlocked(user.id);
        if (blocked) return blocked.response;

        const body = await request.json().catch(() => ({}));
        const cartItemId = Number(body?.cartItemId);
        const quantity = Number(body?.quantity);

        if (!Number.isInteger(cartItemId)) {
            return NextResponse.json(
                { error: "Missing cart item identifier" },
                { status: 400 }
            );
        }

        if (!Number.isInteger(quantity) || quantity < 1) {
            return NextResponse.json(
                { error: "Quantity must be a whole number of at least 1" },
                { status: 400 }
            );
        }

        // Provisioning creates one row per slot, so an unbounded quantity is a
        // way to make one checkout write thousands of rows. Removing the line is
        // how you get to zero; this only covers real multi-pack purchases.
        if (quantity > MAX_CART_QUANTITY) {
            return NextResponse.json(
                { error: `You can buy at most ${MAX_CART_QUANTITY} of one item at a time` },
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
            where: and(
                eq(cartItems.id, cartItemId),
                eq(cartItems.cartId, cart.id)
            ),
        });

        if (!item) {
            return NextResponse.json(
                { error: "Cart item not found" },
                { status: 404 }
            );
        }

        await db.update(cartItems)
            .set({ quantity, updatedAt: new Date() })
            .where(eq(cartItems.id, item.id));

        return NextResponse.json({ success: true, quantity });
    } catch (error) {
        console.error("Update cart quantity error:", error);
        return NextResponse.json(
            { error: "Failed to update quantity" },
            { status: 500 }
        );
    }
}
