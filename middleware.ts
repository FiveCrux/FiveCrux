import { NextResponse, type NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

// Centralized first-line authorization. Runs on the edge and reads roles from the
// JWT (seeded in the auth.ts jwt callback) — no DB hit. Per-route checks remain
// as defense-in-depth, but this guarantees the admin surface is gated in one
// place so a forgotten per-route check can't expose it.
const STAFF_ROLES = ["admin", "founder", "moderator"]

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const roles = ((token as any)?.roles as string[] | undefined) || []
  const isStaff = roles.some((r) => STAFF_ROLES.includes(r))
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/api/admin")) {
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!isStaff) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    return NextResponse.next()
  }

  if (pathname.startsWith("/admin")) {
    if (!isStaff) {
      // Bounce non-staff to the homepage (login handled by the page if needed).
      return NextResponse.redirect(new URL("/", req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/admin/:path*", "/admin/:path*"],
}
