const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** UTC calendar day as a comparable number (midnight UTC). */
export function utcDayNumber(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Parse coupon date fields from API/form input.
 * Date-only strings (YYYY-MM-DD) use UTC start-of-day for start dates
 * and UTC end-of-day for expiry dates so validation matches the selected calendar day.
 */
export function parseCouponDate(
  value: unknown,
  field: string,
  kind: "start" | "expiry"
): Date | null | { error: string } {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return { error: `${field} must be a date string` };
  }

  const trimmed = value.trim();
  const dateOnly = DATE_ONLY_PATTERN.exec(trimmed);

  if (dateOnly) {
    const year = Number(dateOnly[1]);
    const month = Number(dateOnly[2]) - 1;
    const day = Number(dateOnly[3]);

    if (kind === "start") {
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }

    return new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  }

  const date = new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    return { error: `${field} must be a valid date` };
  }

  return date;
}

export function isCouponNotStartedYet(startDate: Date | null, now = new Date()): boolean {
  if (!startDate) return false;
  return utcDayNumber(now) < utcDayNumber(startDate);
}

export function isCouponExpired(expiryDate: Date | null, now = new Date()): boolean {
  if (!expiryDate) return false;
  return utcDayNumber(now) > utcDayNumber(expiryDate);
}

export function validateCouponSchedule(
  startDate: Date | null,
  expiryDate: Date | null,
  now = new Date()
): { error: string } | null {
  if (isCouponNotStartedYet(startDate, now)) {
    return { error: "Coupon is not active yet" };
  }

  if (isCouponExpired(expiryDate, now)) {
    return { error: "Coupon has expired" };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Server-side coupon rules.
//
// Coupons were briefly delegated to Tebex, which owned the rules there. With
// Tebex gone FiveCrux enforces them itself — nothing else will. A maxUses=1
// coupon that is never counted is usable an unlimited number of times, which
// is a direct, unbounded money loss.
//
// Everything here is pure over its inputs so the rules can be tested without a
// database. The reads live in lib/cart-checkout-utils.ts.
// Locked by scripts/check-coupons.mjs.
// ---------------------------------------------------------------------------

/** Scopes that restrict a coupon to part of the cart. Anything else is storewide. */
const TARGETED_SCOPES = ["Ad Slots", "Featured Script Slots", "Props"]

export type CartLine = {
  itemType?: string
  itemId?: unknown
  price: string | number
  quantity: number
  metadata?: unknown
}

function readMetadata(metadata: unknown): any {
  if (typeof metadata !== "string") return metadata
  try {
    return JSON.parse(metadata)
  } catch {
    return null
  }
}

export function lineTotal(items: CartLine[]): number {
  return items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity ?? 1), 0)
}

/**
 * The cart lines a coupon's scope allows it to touch.
 *
 * A storewide coupon takes everything. A targeted one matches on the metadata
 * the cart already carries, so an "Ad Slots" coupon cannot quietly discount a
 * featured-slot purchase sitting in the same cart.
 */
export function matchScope(items: CartLine[], scope: string): CartLine[] {
  if (!TARGETED_SCOPES.includes(scope)) return items

  return items.filter((item) => {
    if (scope === "Props") return item.itemType === "prop"

    const meta = readMetadata(item.metadata)
    if (scope === "Ad Slots") {
      return (
        meta?.couponScope === "Ad Slots" ||
        meta?.category === "Ad Slots" ||
        meta?.packageType === "ads"
      )
    }
    if (scope === "Featured Script Slots") {
      return (
        meta?.couponScope === "Featured Script Slots" ||
        meta?.category === "Featured Script Slots" ||
        meta?.packageType === "featured-scripts"
      )
    }
    return false
  })
}

export function isTargetedScope(scope: string): boolean {
  return TARGETED_SCOPES.includes(scope)
}

export type CouponRules = {
  isActive: boolean | null
  startDate: Date | null
  expiryDate: Date | null
  minCartValue: string | number | null
  maxUses: number | null
  usedCount: number | null
  perUserLimit: number | null
  discountType: string
  discountValue: string | number
}

export function validateCouponRules(
  coupon: CouponRules,
  ctx: { cartTotal: number; userRedemptions: number; now?: Date }
): { error: string } | null {
  const now = ctx.now ?? new Date()

  if (coupon.isActive === false) return { error: "Coupon is not active" }

  const schedule = validateCouponSchedule(coupon.startDate, coupon.expiryDate, now)
  if (schedule) return schedule

  const min = Number(coupon.minCartValue ?? 0)
  if (min > 0 && ctx.cartTotal < min) {
    return { error: `Cart total must be at least ${min.toFixed(2)} to use this coupon` }
  }

  // maxUses null/0 means unlimited — only enforce a positive cap.
  const maxUses = Number(coupon.maxUses ?? 0)
  if (maxUses > 0 && Number(coupon.usedCount ?? 0) >= maxUses) {
    return { error: "Coupon has reached its usage limit" }
  }

  const perUser = Number(coupon.perUserLimit ?? 0)
  if (perUser > 0 && ctx.userRedemptions >= perUser) {
    return { error: "You have already used this coupon" }
  }

  return null
}

/**
 * Discount for a validated coupon, against the total of the lines its scope
 * allows it to touch.
 *
 * A flat coupon comes off that subtotal ONCE, not once per line — "10 off" a
 * five-item cart is 10, not 50. Clamped to the subtotal so a large flat coupon
 * can never produce a negative charge, and rounded to cents because this
 * number is charged.
 */
export function calculateCouponDiscount(
  coupon: Pick<CouponRules, "discountType" | "discountValue">,
  eligibleTotal: number
): number {
  const value = Number(coupon.discountValue ?? 0)
  if (!Number.isFinite(value) || value <= 0) return 0
  if (!Number.isFinite(eligibleTotal) || eligibleTotal <= 0) return 0

  // The enum carries both casings for historical reasons ('percentage' and
  // 'Percentage'); treat them the same rather than silently charging full price.
  const type = String(coupon.discountType || "").toLowerCase()
  const raw = type === "percentage" ? (eligibleTotal * value) / 100 : value

  return Math.round(Math.min(Math.max(raw, 0), eligibleTotal) * 100) / 100
}
