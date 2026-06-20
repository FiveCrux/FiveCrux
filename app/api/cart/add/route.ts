import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/auth";

import { db } from "@/lib/db/client";

import {
    carts,
    cartItems,
    approvedProps,
    subscriptions,
} from "@/lib/db/schema";

import {
    and,
    eq,
    sql,
} from "drizzle-orm";

import { resolvePackage, resolvePackageMeta, parsePackageItemId } from "@/lib/ad-pricing";
import { getLivePriceByPackageId } from "@/lib/tebex-pricing";

// App-generated integer PK (prod uses manual integer PKs, not DB identity).
function generateNumericId() {
    return Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 10000);
}

function normalizeMetadata(metadata: unknown) {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
        return null;
    }

    return metadata as Record<string, unknown>;
}

// Build a platform-slot cart item. SECURITY: the price and slot count come from
// the server-side price table (lib/ad-pricing), derived from the itemId — NEVER
// from the client. A tampered price / slotsToAdd is simply ignored.
async function getCustomPackageItem(
    itemType: string,
    itemId: unknown,
    title: unknown,
    metadata: unknown
) {
    const normalizedMetadata = normalizeMetadata(metadata);
    const packageType = normalizedMetadata?.packageType;
    const couponScope = normalizedMetadata?.couponScope;

    if (
        itemType !== "subscription" ||
        !normalizedMetadata ||
        !["ads", "featured-scripts"].includes(String(packageType)) ||
        !["Ad Slots", "Featured Script Slots"].includes(String(couponScope))
    ) {
        return null;
    }

    const parsed = parsePackageItemId(itemId);
    if (!parsed) return { error: "Invalid package" } as const;
    // Validate the package STRUCTURE first (sync), so we can tell "invalid" apart
    // from "valid but not priced yet".
    const meta = resolvePackageMeta(parsed.packageType, parsed.packageId, parsed.duration);
    if (!meta || meta.packageType !== String(packageType)) {
        return { error: "Unknown or invalid package" } as const;
    }
    // Price is the live Tebex price (server-authoritative, never the client's).
    const pkg = await resolvePackage(parsed.packageType, parsed.packageId, parsed.duration);
    if (!pkg) {
        return { error: "Pricing not available for this package yet (Tebex not configured)" } as const;
    }

    // Server-authoritative metadata: overwrite anything the client tried to set
    // that affects price or provisioning.
    const safeMetadata = {
        ...normalizedMetadata,
        packageType: pkg.packageType,
        packageId: pkg.packageId,
        slotsToAdd: pkg.slots,
        slotsPerMonth: pkg.slots,
        durationMonths: pkg.durationMonths,
        ...(pkg.durationWeeks != null ? { durationWeeks: pkg.durationWeeks } : {}),
    };

    return {
        title: typeof title === "string" && title.trim() ? title : `${couponScope} - ${pkg.packageId}`,
        price: pkg.price,
        metadata: safeMetadata,
    };
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
                    id: generateNumericId(), // app-generated integer PK (prod has manual PKs)
                    userId: user.id,
                    status: "active",
                })
                .returning();

            cart = newCart;
        }

        // 3. Fetch actual item or use provided package data
        let item;

        const customPackageItem = await getCustomPackageItem(itemType, itemId, title, metadata);

        if (customPackageItem && "error" in customPackageItem) {
            return NextResponse.json(
                { error: customPackageItem.error },
                { status: 400 }
            );
        }

        if (customPackageItem) {
            item = customPackageItem;
        } else if (itemType === "subscription") {
            item = await db.query.subscriptions.findFirst({
                where: eq(subscriptions.id, itemId),
            });
        } else {
            // Props: priced LIVE from the prop's Tebex package (never the client).
            // FiveCrux is the only lister; each prop carries its FiveCrux-store
            // tebex_package_id. A prop with no live Tebex price isn't purchasable.
            const prop = await db.query.approvedProps.findFirst({
                where: eq(approvedProps.id, itemId),
            });
            if (prop) {
                const live = await getLivePriceByPackageId(prop.tebexPackageId);
                if (!live) {
                    return NextResponse.json(
                        { error: "This prop isn't available for purchase yet (Tebex package not configured)" },
                        { status: 400 }
                    );
                }
                item = {
                    title: prop.name,
                    price: live.amount,
                    // Carry the prop's Tebex package id so checkout can add it to
                    // FiveCrux's basket.
                    metadata: { ...(normalizeMetadata(metadata) ?? {}), tebexPackageId: prop.tebexPackageId },
                } as any;
            }
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
                    id: generateNumericId(), // app-generated integer PK (prod has manual PKs)
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
