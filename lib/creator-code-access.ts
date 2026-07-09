// Access control for creator codes — same gate as coupons (any seller with an
// approved listing, plus verified_creator/admin/founder roles). Unlike
// coupons, a creator code is NEVER self-scoped: it's storewide affiliate
// marketing, so there is no "admin vs plain creator" reach distinction here.
import { canManageCouponsAsync } from "@/lib/coupon-access";

export async function canManageCreatorCodes(
  userId: string,
  roles: string[] | null | undefined
): Promise<boolean> {
  return canManageCouponsAsync(userId, roles);
}
