import { and, eq, ne } from "drizzle-orm"

import { db } from "@/lib/db/client"
import { categories } from "@/lib/db/schema"

/**
 * Validate the two ordering fields on a category.
 *
 * Both were read as `Number(value) || 0`, which accepts anything: -2 stayed
 * -2, and two categories could sit on the same number with nothing to say
 * which comes first. Order is a position, so it has to be a whole number, not
 * below zero, and held by one category at a time.
 *
 * Returns a message to refuse with, or null when the values are usable.
 * `excludeId` is the row being edited — it is allowed to keep its own numbers.
 */
export async function validateCategoryOrder(
  input: { sortOrder?: unknown; homeOrder?: unknown },
  excludeId?: number
): Promise<string | null> {
  const fields: [keyof typeof input, string][] = [
    ["sortOrder", "Sort order"],
    ["homeOrder", "Home order"],
  ]

  for (const [key, label] of fields) {
    const raw = input[key]
    if (raw === undefined || raw === null || raw === "") continue

    const n = Number(raw)
    if (!Number.isInteger(n) || n < 0) {
      return `${label} must be a whole number of 0 or more.`
    }

    // Zero is the "unset" default every row starts on, so it is not treated as
    // taken — otherwise the first category saved would block all the others.
    if (n === 0) continue

    const clash = await db.query.categories.findFirst({
      where:
        excludeId == null
          ? eq(categories[key === "sortOrder" ? "sortOrder" : "homeOrder"], n)
          : and(
              eq(categories[key === "sortOrder" ? "sortOrder" : "homeOrder"], n),
              ne(categories.id, excludeId)
            ),
      columns: { name: true },
    })

    if (clash) {
      return `${label} ${n} is already used by "${clash.name}". Pick a different number.`
    }
  }

  return null
}
