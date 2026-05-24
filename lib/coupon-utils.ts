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
