// Shared coupon authorization + ownership helpers.
//
// Coupon management used to be founder/admin only, then opened to
// `verified_creator`, and is now open to ANY seller with at least one
// approved script or prop — BUT with a hard money-safety constraint: a
// coupon created by a plain creator (NOT an admin/founder) may only ever
// discount THAT creator's own products in the cart — never other sellers'
// items and never platform ad/featured slots. Admin/founder coupons keep the
// existing scope behavior. These helpers keep that distinction consistent
// across the coupon API routes and the checkout validation path.
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { approvedProps, approvedScripts } from "@/lib/db/schema";
import { hasAnyRole, type ValidRole } from "@/lib/database-new";

// Roles with unrestricted coupon reach (all coupons, existing scope semantics).
export const COUPON_ADMIN_ROLES: ValidRole[] = ["founder", "admin"];

// Roles allowed to create/manage coupons regardless of listings.
export const COUPON_MANAGE_ROLES: ValidRole[] = ["founder", "admin", "verified_creator"];

/** True if these roles alone (no DB check) grant coupon access. */
export function canManageCoupons(roles: string[] | null | undefined): boolean {
  return Boolean(roles && hasAnyRole(roles, COUPON_MANAGE_ROLES));
}

/** True if this user has at least one approved script or prop (a real seller). */
export async function hasApprovedListing(userId: string): Promise<boolean> {
  if (!userId) return false;
  const [script] = await db
    .select({ id: approvedScripts.id })
    .from(approvedScripts)
    .where(eq(approvedScripts.sellerId, userId))
    .limit(1);
  if (script) return true;

  const [prop] = await db
    .select({ id: approvedProps.id })
    .from(approvedProps)
    .where(eq(approvedProps.createdBy, userId))
    .limit(1);
  return Boolean(prop);
}

/**
 * Full access gate: role-based access OR any approved listing. This is the
 * check to use for "can this user reach the coupon surface at all" — role
 * check first (cheap, no DB hit) before falling back to a listing lookup.
 */
export async function canManageCouponsAsync(
  userId: string,
  roles: string[] | null | undefined
): Promise<boolean> {
  if (canManageCoupons(roles)) return true;
  return hasApprovedListing(userId);
}

/**
 * True if these roles have UNRESTRICTED coupon reach (founder/admin). Plain
 * `verified_creator` returns false → their coupons are self-scoped and they can
 * only see/edit/delete their own coupons.
 */
export function isCouponAdmin(roles: string[] | null | undefined): boolean {
  return Boolean(roles && hasAnyRole(roles, COUPON_ADMIN_ROLES));
}
