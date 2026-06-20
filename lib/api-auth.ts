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
