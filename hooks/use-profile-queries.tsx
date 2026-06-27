"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

// Fetch user's advertisements.
// `poll` (default true) keeps the 30s status polling; pass false to fetch once
// without continuous background refetches (e.g. when the tab isn't active).
export function useUserAdvertisements(limit: number = 3, offset: number = 0, poll: boolean = true) {
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
    refetchInterval: poll ? 30000 : false, // Refetch every 30 seconds for status updates
    refetchOnWindowFocus: poll,
  })
}

// Fetch user's featured script slots
export function useUserFeaturedScriptSlots() {
  const { data: session } = useSession()

  return useQuery({
    queryKey: ['user-featured-script-slots'],
    queryFn: async () => {
      const res = await fetch(`/api/user/featured-script-slots`, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch featured script slots')
      return res.json()
    },
    enabled: !!session?.user,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })
}

// Fetch user's featured scripts
export function useUserFeaturedScripts(limit: number = 100, poll: boolean = true) {
  const { data: session } = useSession()

  return useQuery({
    queryKey: ['user-featured-scripts', { limit }],
    queryFn: async () => {
      const res = await fetch(`/api/users/featured-scripts?limit=${limit}`, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch user featured scripts')
      return res.json()
    },
    enabled: !!session?.user,
    staleTime: 30000,
    refetchInterval: poll ? 30000 : false,
    refetchOnWindowFocus: poll,
  })
}

// Create featured script
export function useCreateFeaturedScript() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()

  return useMutation({
    mutationFn: async (data: { script_id: number; slot_unique_id: string | null }) => {
      const res = await fetch('/api/users/featured-scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create featured script')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-featured-scripts'] })
      queryClient.invalidateQueries({ queryKey: ['user-featured-script-slots'] })
      toast.success('Featured script created successfully!')
    },
    onError: (error: any) => {
      toast.error('Failed to create featured script', {
        description: error.message
      })
    }
  })
}

// Delete featured script
export function useDeleteFeaturedScript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (featuredScriptId: number) => {
      const res = await fetch(`/api/users/featured-scripts?id=${featuredScriptId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete featured script')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-featured-scripts'] })
      queryClient.invalidateQueries({ queryKey: ['user-featured-script-slots'] })
      toast.success('Featured script deleted successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to delete featured script', {
        description: error.message
      })
    }
  })
}

