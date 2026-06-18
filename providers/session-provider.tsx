"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import type { Session } from "next-auth"

// TODO: remove before production — local-only mock login so auth-gated pages can be
// reviewed without Discord/DB. Enabled via NEXT_PUBLIC_MOCK_AUTH=true in .env.local.
const MOCK_AUTH = process.env.NEXT_PUBLIC_MOCK_AUTH === "true"
const mockSession: Session | undefined = MOCK_AUTH
	? ({
			user: {
				id: "mock-dev",
				name: "Dev Tester",
				email: "dev@fivecrux.local",
				image: null,
				username: "devtester",
				roles: ["admin", "founder", "moderator", "prop_lister"],
				profilePicture: null,
				Profile_picture: null,
			},
			expires: "2999-01-01T00:00:00.000Z",
		} as unknown as Session)
	: undefined

export default function SessionProvider({ children }: { children: React.ReactNode }) {
	return (
		<NextAuthSessionProvider
			session={mockSession}
			refetchInterval={0} // Disable automatic refetching
			refetchOnWindowFocus={false} // Disable refetch on window focus
		>
			{children}
		</NextAuthSessionProvider>
	)
}
