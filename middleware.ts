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

  // ── Fraud block ───────────────────────────────────────────────────────
  // A blocked account (chargeback fraud, or blocked by an admin) keeps read
  // access but must not be able to write. Every mutating API call is refused
  // here, which covers all ~62 write routes at once instead of relying on each
  // one to remember the check.
  //
  // This reads the JWT copy of the flag, so it can lag until the token
  // refreshes. The paths that actually cost money — checkout, capture, cart —
  // ALSO check the database directly (requireActiveUser in lib/api-auth.ts),
  // so a freshly blocked user is stopped there immediately.
  const isBlocked = Boolean((token as any)?.isBlocked)
  const isWrite = req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS"
  if (
    isBlocked &&
    isWrite &&
    pathname.startsWith("/api/") &&
    // Never block sign-out: trapping someone in a session they cannot use is
    // just a broken account with no way out.
    !pathname.startsWith("/api/auth")
  ) {
    return NextResponse.json(
      {
        error:
          "Your account is restricted and cannot make purchases or submissions. Contact support.",
        blocked: true,
      },
      { status: 403 }
    )
  }

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
  matcher: ["/api/:path*", "/admin/:path*"],
}
