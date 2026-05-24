import { db } from "@/lib/db/client";
import { orders, orderItems } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function hasPurchasedProp(userId: string, propId: string): Promise<boolean> {
  try {
    const result = await db.select()
      .from(orders)
      .innerJoin(orderItems, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orders.userId, userId),
          eq(orderItems.itemType, 'prop'),
          eq(orderItems.itemId, propId)
          // If order status needs to be completed, uncomment below:
          // eq(orders.status, 'paid')
        )
      )
      .limit(1);

    return result.length > 0;
  } catch (error) {
    console.error("Error checking prop purchase status:", error);
    return false;
  }
}
