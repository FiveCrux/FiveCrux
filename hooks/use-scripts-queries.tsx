"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

interface Script {
  id: number
  title: string
  description: string
  price: number
  original_price?: number
  category: string
  framework?: string | string[]
  status: string
  seller_name: string
  seller_email: string
  seller_id?: string
  features: string[]
  requirements: string[]
  link?: string
  images: string[]
  videos: string[]
  screenshots: string[]
  cover_image?: string
  featured: boolean
  downloads: number
  rating: number
  review_count: number
  created_at: string
  updated_at: string
}

// Fetch all scripts
export function useScripts() {
  return useQuery<Script[]>({
    queryKey: ['scripts'],
    queryFn: async () => {
      const res = await fetch('/api/scripts', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch scripts')
      const data = await res.json()
      return data.scripts || []
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

// Fetch script ads
export function useScriptAds() {
  return useQuery({
    queryKey: ['ads-scripts'],
    queryFn: async () => {
      const res = await fetch('/api/ads/scripts', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch ads')
      const data = await res.json()
      return data.ads || []
    },
    staleTime: 120000, // 2 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

// Fetch single script by ID
export function useScript(scriptId: string | null) {
  return useQuery<Script>({
    queryKey: ['script', scriptId],
    queryFn: async () => {
      if (!scriptId) throw new Error('No script ID provided')
      const res = await fetch(`/api/scripts/${scriptId}`)
      if (!res.ok) throw new Error('Failed to fetch script')
      return res.json()
    },
    enabled: !!scriptId,
    staleTime: 60000,
  })
}

// Submit new script
export function useSubmitScript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (scriptData: any) => {
      const res = await fetch('/api/scripts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scriptData)
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to submit script')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
      queryClient.invalidateQueries({ queryKey: ['user-scripts'] })
      toast.success('Script submitted successfully!', {
        description: 'Your script is now pending approval.'
      })
    },
    onError: (error: any) => {
      toast.error('Failed to submit script', {
        description: error.message
      })
    }
  })
}

// Update existing script
export function useUpdateScript(scriptId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (scriptData: any) => {
      if (!scriptId) throw new Error('No script ID provided')
      const res = await fetch(`/api/scripts/${scriptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scriptData)
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update script')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['script', scriptId] })
      queryClient.invalidateQueries({ queryKey: ['scripts'] })
      queryClient.invalidateQueries({ queryKey: ['user-scripts'] })
      toast.success('Script updated successfully!')
    },
    onError: (error: any) => {
      toast.error('Failed to update script', {
        description: error.message
      })
    }
  })
}

// Fetch user's scripts
export function useUserScripts(limit: number = 3, offset: number = 0) {
  const { data: session } = useSession()

  return useQuery({
    queryKey: ['user-scripts', { limit, offset }],
    queryFn: async () => {
      const res = await fetch(`/api/users/scripts?limit=${limit}&offset=${offset}`, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch user scripts')
      return res.json()
    },
    enabled: !!session?.user,
    staleTime: 30000,
    refetchInterval: 30000, // Refetch every 30 seconds for status updates
    refetchOnWindowFocus: true,
  })
}

// Delete user script
export function useDeleteUserScript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (scriptId: number) => {
      const res = await fetch(`/api/users/scripts?id=${scriptId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to delete script')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-scripts'] })
      toast.success('Script deleted successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to delete script', {
        description: error.message
      })
    }
  })
}

