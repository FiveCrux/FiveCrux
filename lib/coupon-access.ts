// Shared coupon authorization + ownership helpers.
//
// Coupon management used to be founder/admin only. It is now also open to
// `verified_creator` users, BUT with a hard money-safety constraint: a coupon
// created by a plain creator (NOT an admin/founder) may only ever discount
// THAT creator's own products in the cart — never other sellers' items and
// never platform ad/featured slots. Admin/founder coupons keep the existing
// scope behavior. These helpers keep that distinction consistent across the
// coupon API routes and the checkout validation path.
import { hasAnyRole, type ValidRole } from "@/lib/database-new";

// Roles with unrestricted coupon reach (all coupons, existing scope semantics).
export const COUPON_ADMIN_ROLES: ValidRole[] = ["founder", "admin"];

// Roles allowed to create/manage coupons at all. `verified_creator` is added
// here but is treated as a scoped/self-only creator (see isCouponAdmin).
export const COUPON_MANAGE_ROLES: ValidRole[] = ["founder", "admin", "verified_creator"];

/** True if these roles may access the coupon management surface at all. */
export function canManageCoupons(roles: string[] | null | undefined): boolean {
  return Boolean(roles && hasAnyRole(roles, COUPON_MANAGE_ROLES));
}

/**
 * True if these roles have UNRESTRICTED coupon reach (founder/admin). Plain
 * `verified_creator` returns false → their coupons are self-scoped and they can
 * only see/edit/delete their own coupons.
 */
export function isCouponAdmin(roles: string[] | null | undefined): boolean {
  return Boolean(roles && hasAnyRole(roles, COUPON_ADMIN_ROLES));
}
