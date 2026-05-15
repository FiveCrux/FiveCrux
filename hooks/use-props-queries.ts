"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

export interface Prop {
  id: string
  name: string
  description: string
  price: number
  discountPercentage: number
  discountedPrice: number | null
  images: string[]
  zipFile: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

// Fetch all props
export function useProps() {
  return useQuery<Prop[]>({
    queryKey: ['props'],
    queryFn: async () => {
      const res = await fetch('/api/props', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to fetch props')
      const data = await res.json()
      return data.props || []
    },
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

// Fetch single prop by ID
export function useProp(propId: string | null) {
  return useQuery<Prop>({
    queryKey: ['prop', propId],
    queryFn: async () => {
      if (!propId) throw new Error('No prop ID provided')
      const res = await fetch(`/api/props/${propId}`)
      if (!res.ok) throw new Error('Failed to fetch prop')
      return res.json()
    },
    enabled: !!propId,
    staleTime: 60000,
  })
}

// Submit new prop
export function useSubmitProp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (propData: any) => {
      const res = await fetch('/api/props', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propData)
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create prop')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['props'] })
      queryClient.invalidateQueries({ queryKey: ['user-props'] })
      toast.success('Prop created successfully!')
    },
    onError: (error: any) => {
      toast.error('Failed to create prop', {
        description: error.message
      })
    }
  })
}

// Update existing prop
export function useUpdateProp(propId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (propData: any) => {
      if (!propId) throw new Error('No prop ID provided')
      const res = await fetch(`/api/props/${propId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(propData)
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update prop')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prop', propId] })
      queryClient.invalidateQueries({ queryKey: ['props'] })
      queryClient.invalidateQueries({ queryKey: ['user-props'] })
      toast.success('Prop updated successfully!')
    },
    onError: (error: any) => {
      toast.error('Failed to update prop', {
        description: error.message
      })
    }
  })
}

// Fetch user's props
export function useUserProps(limit: number = 10, offset: number = 0) {
  const { data: session } = useSession()

  return useQuery({
    queryKey: ['user-props', { limit, offset }],
    queryFn: async () => {
      const res = await fetch(`/api/users/props?limit=${limit}&offset=${offset}`, {
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to fetch user props')
      return res.json()
    },
    enabled: !!session?.user,
    staleTime: 30000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  })
}

// Delete user prop
export function useDeleteUserProp() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (propId: string) => {
      const res = await fetch(`/api/users/props?id=${propId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!res.ok) throw new Error('Failed to delete prop')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-props'] })
      queryClient.invalidateQueries({ queryKey: ['props'] })
      toast.success('Prop deleted successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to delete prop', {
        description: error.message
      })
    }
  })
}
