"use client"

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

export function useRoleValidation() {
  const { data: session, status } = useSession()
  const previousRolesRef = useRef<string[]>([])

  // Query to fetch current session
  const { data: currentSession } = useQuery({
    queryKey: ['session-roles', session?.user?.id],
    queryFn: async () => {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch session')
      return response.json()
    },
    enabled: !!session?.user && status === 'authenticated',
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: false, // Don't poll when tab is not active
  })

  useEffect(() => {
    if (!session?.user || !currentSession?.user) return

    const currentRoles = (session.user as any)?.roles || []
    const newRoles = (currentSession.user as any)?.roles || []

    // Initialize previous roles on first load
    if (previousRolesRef.current.length === 0) {
      previousRolesRef.current = currentRoles
      return
    }

    // Compare roles
    const currentRolesSorted = [...currentRoles].sort().join(',')
    const newRolesSorted = [...newRoles].sort().join(',')

    if (currentRolesSorted !== newRolesSorted) {
      console.log('Roles changed:', { old: currentRoles, new: newRoles })
      
      toast.info('Your roles have been updated. Refreshing page...', {
        duration: 2000,
      })

      // Update ref
      previousRolesRef.current = newRoles

      // Refresh page after a short delay to allow toast to show
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    }
  }, [session, currentSession])

  return {
    isValidating: status === 'loading',
    currentRoles: (session?.user as any)?.roles || [],
  }
}

