"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

interface Giveaway {
  id: number
  title: string
  description: string
  total_value: string
  category: string
  status: string
  creator_name: string
  creator_email: string
  creator_id?: string
  end_date: string
  maxEntries?: number
  featured: boolean
  auto_announce: boolean
  images: string[]
  videos: string[]
  coverImage?: string
  tags: string[]
  rules: string[]
  requirements: any[]
  prizes: any[]
  created_at: string
  updated_at: string
  entriesCount?: number
}

// Fetch all giveaways
export function useGiveaways() {
  return useQuery<Giveaway[]>({
    queryKey: ['giveaways'],
    queryFn: async () => {
      const res = await fetch('/api/giveaways', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch giveaways')
      const data = await res.json()
      return data.giveaways || []
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: true,
  })
}

// Fetch promoted giveaway ads
export function usePromotedGiveaways() {
  return useQuery({
    queryKey: ['promoted-giveaways'],
    queryFn: async () => {
      const res = await fetch('/api/promotions/giveaways', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch promoted giveaways')
      const data = await res.json()
      return data.ads || []
    },
    staleTime: 120000, // 2 minutes
  })
}

// Fetch user's giveaway entries
export function useUserGiveawayEntries() {
  const { data: session } = useSession()

  return useQuery({
    queryKey: ['user-giveaway-entries'],
    queryFn: async () => {
      const res = await fetch('/api/users/giveaway-entries', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch user entries')
      return res.json()
    },
    enabled: !!session?.user,
    staleTime: 30000,
  })
}

// Fetch single giveaway by ID
export function useGiveaway(giveawayId: string) {
  return useQuery({
    queryKey: ['giveaway', giveawayId],
    queryFn: async () => {
      const res = await fetch(`/api/giveaways/${giveawayId}`)
      if (!res.ok) throw new Error('Giveaway not found')
      return res.json()
    },
    enabled: !!giveawayId,
    staleTime: 30000,
    refetchOnWindowFocus: false, // Prevent unwanted refetches
  })
}

// Fetch related giveaways
export function useRelatedGiveaways(giveawayId: string) {
  return useQuery({
    queryKey: ['related-giveaways', giveawayId],
    queryFn: async () => {
      const res = await fetch(`/api/giveaways/${giveawayId}/related`)
      if (!res.ok) throw new Error('Failed to fetch related giveaways')
      return res.json()
    },
    enabled: !!giveawayId,
    staleTime: 120000,
  })
}

// Enter giveaway
export function useEnterGiveaway(giveawayId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (completedRequirements: number[]) => {
      const res = await fetch(`/api/giveaways/${giveawayId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedRequirements })
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to enter giveaway')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['giveaway', giveawayId] })
      queryClient.invalidateQueries({ queryKey: ['user-giveaway-entries'] })
      toast.success('Successfully entered giveaway!', {
        description: 'Good luck!'
      })
    },
    onError: (error: any) => {
      toast.error('Failed to enter giveaway', {
        description: error.message
      })
    }
  })
}

// Create new giveaway
export function useCreateGiveaway() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (giveawayData: any) => {
      const res = await fetch('/api/giveaways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(giveawayData)
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create giveaway')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['giveaways'] })
      queryClient.invalidateQueries({ queryKey: ['user-giveaways'] })
      toast.success('Giveaway created successfully!', {
        description: 'Your giveaway is now pending approval.'
      })
    },
    onError: (error: any) => {
      toast.error('Failed to create giveaway', {
        description: error.message
      })
    }
  })
}

// Fetch user's giveaways
export function useUserGiveaways(limit: number = 3, offset: number = 0) {
  const { data: session } = useSession()

  return useQuery({
    queryKey: ['user-giveaways', { limit, offset }],
    queryFn: async () => {
      const res = await fetch(`/api/users/giveaways?limit=${limit}&offset=${offset}`, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch user giveaways')
      return res.json()
    },
    enabled: !!session?.user,
    staleTime: 30000,
    refetchInterval: 30000, // Refetch every 30 seconds for status updates
    refetchOnWindowFocus: true,
  })
}

// Delete user giveaway
export function useDeleteUserGiveaway() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (giveawayId: number) => {
      const res = await fetch(`/api/users/giveaways?id=${giveawayId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to delete giveaway')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-giveaways'] })
      toast.success('Giveaway deleted successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to delete giveaway', {
        description: error.message
      })
    }
  })
}

// Fetch user's creator giveaway entries (entries to giveaways they created)
export function useUserCreatorGiveawayEntries(limit: number = 0, offset: number = 0) {
  const { data: session } = useSession()

  return useQuery({
    queryKey: ['user-creator-giveaway-entries', { limit, offset }],
    queryFn: async () => {
      const res = await fetch(`/api/users/creator-giveaway-entries?limit=${limit}&offset=${offset}`, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch creator entries')
      return res.json()
    },
    enabled: !!session?.user,
    staleTime: 30000,
    refetchInterval: 30000, // Refetch every 30 seconds for status updates
    refetchOnWindowFocus: true,
  })
}

