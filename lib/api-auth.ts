// Centralized API route authorization helpers. Use these in route handlers so
// auth/role checks are consistent (the per-route hand-rolled checks were where
// the earlier authz holes crept in). Complements middleware.ts (first-line gate).
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/auth"
import { hasAnyRole, type ValidRole } from "@/lib/database-new"

export type AuthOk = { ok: true; userId: string; roles: string[]; session: Awaited<ReturnType<typeof getServerSession>> }
export type AuthErr = { ok: false; response: NextResponse }

/** Require any authenticated user. Returns the session or a 401 response. */
export async function requireUser(): Promise<AuthOk | AuthErr> {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  const u = session.user as any
  return { ok: true, userId: u.id, roles: u.roles || [], session }
}

/** Require the user to hold at least one of `roles`. Returns 401/403 otherwise. */
export async function requireRole(roles: ValidRole[]): Promise<AuthOk | AuthErr> {
  const res = await requireUser()
  if (!res.ok) return res
  if (!hasAnyRole(res.roles, roles)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return res
}

/** Staff = admin | founder | moderator (the common admin-area gate). */
export function requireStaff() {
  return requireRole(["admin", "founder", "moderator"])
}

/**
 * Refuse a write from a blocked user.
 *
 * Blocking exists for chargeback fraud: buy, pay, reverse the payment, keep the
 * goods, repeat. A blocked account keeps read access — it can still sign in and
 * browse — but must not be able to act.
 *
 * This reads the CURRENT database value rather than the session/JWT copy, so a
 * block takes effect on the very next request. The JWT copy that middleware
 * uses can lag until the token refreshes; this is the authoritative check and
 * belongs on every path that moves money or creates content.
 */
export async function assertNotBlocked(userId: string): Promise<AuthErr | null> {
  const { db } = await import("@/lib/db/client")
  const { users } = await import("@/lib/db/schema")
  const { eq } = await import("drizzle-orm")

  const row = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { isBlocked: true, blockedReason: true },
  })

  if (!row?.isBlocked) return null

  return {
    ok: false,
    response: NextResponse.json(
      {
        error:
          row.blockedReason ||
          "Your account is restricted and cannot make purchases or submissions. Contact support.",
        blocked: true,
      },
      { status: 403 }
    ),
  }
}

/**
 * requireUser + the block check, for any route that writes. Returns the same
 * shape as requireUser so it is a drop-in replacement.
 */
export async function requireActiveUser(): Promise<AuthOk | AuthErr> {
  const res = await requireUser()
  if (!res.ok) return res
  const blocked = await assertNotBlocked(res.userId)
  return blocked ?? res
}
