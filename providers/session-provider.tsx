"use client"

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react"

export default function SessionProvider({ children }: { children: React.ReactNode }) {
	return (
		<NextAuthSessionProvider 
			refetchInterval={0} // Disable automatic refetching
			refetchOnWindowFocus={false} // Disable refetch on window focus
		>
			{children}
		</NextAuthSessionProvider>
	)
}



