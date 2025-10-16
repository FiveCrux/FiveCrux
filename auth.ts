import type { NextAuthOptions } from "next-auth"
import Discord from "next-auth/providers/discord"
import { upsertUser, getUserById } from "@/lib/database-new"

export const authOptions: NextAuthOptions = {
	providers: [
		Discord({
			clientId: process.env.DISCORD_CLIENT_ID as string,
			clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
			authorization: {
				params: {
					scope: "identify email guilds guilds.join connections",
				},
			},
		}),
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
					forceAdminIfUsername: "sidakftw",
				})
				return true
			} catch (e) {
				console.error("signIn upsert error", e)
				return false
			}
		},
		async jwt({ token, account }) {
			if (account) {
				;(token as any).accessToken = (account as any).access_token
				;(token as any).accessTokenExpiresAt = (account as any).expires_at
					? Number((account as any).expires_at) * 1000
					: undefined
				;(token as any).refreshToken = (account as any).refresh_token
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

