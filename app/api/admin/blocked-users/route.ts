import { type NextRequest, NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"

import { requireStaff } from "@/lib/api-auth"
import { db } from "@/lib/db/client"
import { users } from "@/lib/db/schema"

/**
 * Blocked / blacklisted accounts.
 *
 * Exists for chargeback fraud: buy, pay, reverse the payment, keep the goods,
 * repeat. A reversal blocks the account automatically; this is where staff see
 * who was caught and can block or clear someone by hand.
 *
 * A block is read-only, not a ban — the account can still sign in and browse,
 * it just cannot buy, submit, or enter anything.
 *
 * GET   -> the blacklist
 * PATCH -> { userId, blocked: boolean, reason?: string }
 *
 * Staff-gated in middleware as well; the checks here are defence in depth.
 */

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const auth = await requireStaff()
  if (!auth.ok) return auth.response

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      username: users.username,
      email: users.email,
      isBlocked: users.isBlocked,
      blockedReason: users.blockedReason,
      blockedSource: users.blockedSource,
      blockedAt: users.blockedAt,
      blockedBy: users.blockedBy,
    })
    .from(users)
    .where(eq(users.isBlocked, true))
    .orderBy(desc(users.blockedAt))

  return NextResponse.json({ users: rows, total: rows.length })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireStaff()
  if (!auth.ok) return auth.response

  const body = await request.json().catch(() => ({}))
  const userId = String(body?.userId || "").trim()
  const blocked = body?.blocked

  if (!userId || typeof blocked !== "boolean") {
    return NextResponse.json(
      { error: "Expected { userId, blocked: boolean }" },
      { status: 400 }
    )
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, roles: true },
  })
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Blocking staff would let one moderator lock out another, or lock out the
  // owner. Role changes are the proper tool for that.
  const STAFF = ["admin", "founder", "moderator"]
  if (blocked && (target.roles || []).some((r) => STAFF.includes(r))) {
    return NextResponse.json(
      { error: "Staff accounts cannot be blocked. Remove their role first." },
      { status: 400 }
    )
  }

  // And nobody blocks themselves out of the admin panel.
  if (blocked && userId === auth.userId) {
    return NextResponse.json({ error: "You cannot block yourself." }, { status: 400 })
  }

  await db
    .update(users)
    .set(
      blocked
        ? {
            isBlocked: true,
            blockedReason:
              String(body?.reason || "").trim() ||
              "Your account is restricted. Contact support.",
            blockedSource: "manual",
            blockedAt: new Date(),
            blockedBy: auth.userId,
            updatedAt: new Date(),
          }
        : {
            isBlocked: false,
            blockedReason: null,
            blockedSource: null,
            blockedAt: null,
            blockedBy: null,
            updatedAt: new Date(),
          }
    )
    .where(eq(users.id, userId))

  return NextResponse.json({ ok: true, userId, blocked })
}
