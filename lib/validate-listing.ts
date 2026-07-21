// Shared value-validation for asset listings, used by BOTH the create
// (POST /api/scripts) and edit (PATCH /api/scripts/[id]) trust boundaries.
// Presence-only checks let bad values through: a non-numeric price threw a
// 500, a negative price went live, and an unknown category slug produced an
// orphan listing that no browse chip ever matched. Validate the actual values.

export type ListingValidationResult = { ok: true } | { ok: false; error: string };

// `partial` = PATCH mode: only validate fields that were actually supplied
// (an undefined field means "keep existing"). On create, callers still enforce
// required-field presence separately; this only checks the values.
export function validateListingFields(
  body: { title?: unknown; price?: unknown; category?: unknown },
  validCategorySlugs: string[],
  opts: { partial?: boolean } = {}
): ListingValidationResult {
  const partial = opts.partial ?? false;

  if (!partial || body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return { ok: false, error: "Title can't be empty." };
    }
  }

  if (!partial || body.price !== undefined) {
    const price = Number(body.price);
    if (!Number.isFinite(price)) {
      return { ok: false, error: "Price must be a valid number." };
    }
    if (price < 0) {
      return { ok: false, error: "Price can't be negative." };
    }
  }

  if (!partial || body.category !== undefined) {
    const cat = typeof body.category === "string" ? body.category : "";
    if (!validCategorySlugs.includes(cat)) {
      return { ok: false, error: "Unknown category." };
    }
  }

  return { ok: true };
}
