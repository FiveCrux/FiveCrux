import type { NextAuthOptions } from "next-auth"
import Discord from "next-auth/providers/discord"
import Credentials from "next-auth/providers/credentials"
import { upsertUser, getUserById, getUserProfilePicture } from "@/lib/database-new"
import { ensureDevUser } from "@/lib/dev-auth"

// TODO: remove before production — local-only dev login. When ALLOW_DEV_LOGIN=true
// the Impersonation widget can issue a REAL next-auth session (JWT cookie) for a
// fixed test identity, so server routes (getServerSession) recognise it too.
//
// SECURITY: hard-gated to non-production. Even if ALLOW_DEV_LOGIN=true leaks into
// a production deploy, the provider stays OFF — otherwise anyone could POST to
// /api/auth/callback/dev-credentials and obtain an admin session with no password.
const ALLOW_DEV_LOGIN = process.env.ALLOW_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production"

// SECURITY: refuse to boot in production with the throwaway dev secret — a known
// NEXTAUTH_SECRET lets anyone forge admin session JWTs.
if (process.env.NODE_ENV === "production") {
	const secret = process.env.NEXTAUTH_SECRET
	if (!secret || secret === "dev-secret-change-me") {
		throw new Error("NEXTAUTH_SECRET must be set to a strong, unique value in production.")
	}
	if (
		process.env.ALLOW_DEV_LOGIN === "true" ||
		process.env.USE_PGLITE === "true" ||
		process.env.NEXT_PUBLIC_MOCK_AUTH === "true"
	) {
		throw new Error("Dev test-harness flags (ALLOW_DEV_LOGIN / USE_PGLITE / NEXT_PUBLIC_MOCK_AUTH) must be OFF in production.")
	}
	// The Tebex endpoint must point at the real API in production.
	if (process.env.TEBEX_HEADLESS_BASE_URL && !process.env.TEBEX_HEADLESS_BASE_URL.includes("tebex.io")) {
		throw new Error("TEBEX_HEADLESS_BASE_URL must point to the real Tebex API in production (unset it to use the default).")
	}
}

const devProviders = ALLOW_DEV_LOGIN
	? [
			Credentials({
				id: "dev-credentials",
				name: "Dev Login",
				credentials: { key: { label: "Preset", type: "text" } },
				async authorize(credentials) {
					const u = await ensureDevUser(String(credentials?.key || ""))
					if (!u) return null
					return { id: u.id, name: u.name, email: u.email, username: u.username, roles: u.roles }
				},
			}),
	  ]
	: []

export const authOptions: NextAuthOptions = {
	providers: [
		Discord({
			clientId: process.env.DISCORD_CLIENT_ID as string,
			clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
			authorization: {
				params: {
					scope: "identify email guilds connections",
				},
			},
		}),
		...devProviders,
	],
	callbacks: {
		async signIn({ user, profile }) {
			try {
				const username = (profile as any)?.username || user.name || null
				await upsertUser({
					id: String((user as any).id || (user as any).sub || (profile as any)?.id || ""),
					name: user.name || null,
					email: user.email || null,
					image: user.image || null,
					username: username ? String(username) : null,
					forceAdminUsernames: ["sidakftw", "naarcoss._49546"],
				})
				return true
			} catch (e) {
				// Don't hard-fail login just because the user upsert hit a transient
				// error (e.g. DB unreachable). Allow sign-in; profile/roles will sync
				// on a later request once the DB is reachable.
				console.error("signIn upsert error (allowing login anyway)", e)
				return true
			}
		},
		async jwt({ token, account, user }) {
			if (account) {
				;(token as any).accessToken = (account as any).access_token
				;(token as any).accessTokenExpiresAt = (account as any).expires_at
					? Number((account as any).expires_at) * 1000
					: undefined
				;(token as any).refreshToken = (account as any).refresh_token
			}
			// Persist roles on the JWT so edge middleware can authorize without a DB
			// hit. On first sign-in use the authorize() result (dev-credentials) or
			// fall back to the DB row (Discord). The session callback still refreshes
			// roles from the DB on every request, so this only needs to be seeded.
			if (user) {
				const fromUser = (user as any).roles as string[] | undefined
				if (fromUser) {
					;(token as any).roles = fromUser
				} else if (token.sub) {
					try {
						const dbUser = await getUserById(token.sub)
						;(token as any).roles = dbUser?.roles ?? []
					} catch {
						;(token as any).roles = (token as any).roles ?? []
					}
				}
			}
			return token
		},
		async session({ session, token }) {
			if (session?.user && token?.sub) {
				;(session.user as any).id = token.sub
				try {
					const dbUser = await getUserById(token.sub)
					if (dbUser) {
						console.log("Auth callback - User roles from DB:", dbUser.roles)
						;(session.user as any).roles = dbUser.roles
						;(session.user as any).username = dbUser.username
						// Use name from database if available, otherwise use Discord name
						if (dbUser.name) {
							session.user.name = dbUser.name
						}
						// Set profile picture with priority: Profile_picture (database column) first, then image (Discord)
						// Store both fields in session for flexibility
						;(session.user as any).Profile_picture = dbUser.profilePicture || null
						;(session.user as any).profilePicture = dbUser.profilePicture || null
						// Keep Discord image as fallback
						if (!dbUser.profilePicture && session.user.image) {
							;(session.user as any).image = session.user.image
						}
					}
				} catch (e) {
					console.error("Auth callback - Error fetching user:", e)
				}
			}
			;(session as any).accessToken = (token as any).accessToken
			;(session as any).accessTokenExpiresAt = (token as any).accessTokenExpiresAt
			return session
		},
	},
	secret: process.env.NEXTAUTH_SECRET,
}

