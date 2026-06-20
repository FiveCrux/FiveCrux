"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"
import { getActiveImpersonationPreset } from "@/lib/dev-impersonation"

// TODO: remove before production — local-only mock login + role impersonation so
// auth-gated pages can be tested without Discord/DB. Enabled via
// NEXT_PUBLIC_MOCK_AUTH=true. The active identity is chosen in the dev
// Impersonation widget and persisted in localStorage (see lib/dev-impersonation).
const MOCK_AUTH = process.env.NEXT_PUBLIC_MOCK_AUTH === "true"
const DEV_LOGIN = process.env.NEXT_PUBLIC_ALLOW_DEV_LOGIN === "true"

export default function SessionProvider({ children }: { children: React.ReactNode }) {
	// null = guest (logged out, no fetch); undefined = real next-auth fetch.
	// In real dev-login mode we let next-auth fetch the genuine session (issued by
	// the dev Credentials provider) instead of injecting a client-only mock.
	const mockSession = MOCK_AUTH && !DEV_LOGIN ? getActiveImpersonationPreset().session : undefined

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
