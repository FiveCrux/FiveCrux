"use client"

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

// Fetch user's advertisements
export function useUserAdvertisements(limit: number = 3, offset: number = 0) {
  const { data: session } = useSession()

  return useQuery({
    queryKey: ['user-advertisements', { limit, offset }],
    queryFn: async () => {
      const res = await fetch(`/api/users/advertisements?limit=${limit}&offset=${offset}`, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch user advertisements')
      return res.json()
    },
    enabled: !!session?.user,
    staleTime: 30000,
    refetchInterval: 30000, // Refetch every 30 seconds for status updates
    refetchOnWindowFocus: true,
  })
}

