"use client"

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

// Types
interface User {
  id: string
  name: string | null
  email: string | null
  image: string | null
  username: string | null
  roles: string[]
  created_at?: string
}

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
  rejection_reason?: string
}

interface Giveaway {
  id: number
  title: string
  description: string
  total_value: string
  category: string
  difficulty: string
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
  rejection_reason?: string
  entriesCount?: number
  submittedAt?: string
  approvedAt?: string
  rejectedAt?: string
  approvedBy?: string
  rejectedBy?: string
  adminNotes?: string
}

interface Ad {
  id: number
  title: string
  description: string
  image: string
  link: string
  banner_type: string
  status?: "active" | "inactive" | "pending" | "approved" | "rejected" | string
  created_at: string
  updated_at: string
  creator_name: string
  creator_email: string
  rejection_reason?: string
  category?: string
}

// Fetch Users with pagination
export function useAdminUsers() {
  const { data: session } = useSession()
  const userRoles = (session?.user as any)?.roles || []
  const hasAccess = userRoles.includes('admin') || userRoles.includes('founder') || userRoles.includes('moderator')

  return useInfiniteQuery<{ users: User[], hasMore: boolean }>({
    queryKey: ['admin-users'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/admin/users?limit=10&offset=${pageParam}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      return { users: data.users || [], hasMore: data.hasMore || false }
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.hasMore) {
        return pages.reduce((acc, page) => acc + page.users.length, 0)
      }
      return undefined
    },
    enabled: !!session?.user && hasAccess,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    initialPageParam: 0,
  })
}

// Fetch Scripts with pagination
export function useAdminScripts() {
  const { data: session } = useSession()
  const userRoles = (session?.user as any)?.roles || []
  const hasAccess = userRoles.includes('admin') || userRoles.includes('founder')

  return useInfiniteQuery<{ scripts: Script[], hasMore: boolean }>({
    queryKey: ['admin-scripts'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/admin/scripts?limit=10&offset=${pageParam}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch scripts')
      const data = await res.json()
      return { scripts: data.scripts || [], hasMore: data.hasMore || false }
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.hasMore) {
        return pages.reduce((acc, page) => acc + page.scripts.length, 0)
      }
      return undefined
    },
    enabled: !!session?.user && hasAccess,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    initialPageParam: 0,
  })
}

// Fetch Giveaways with pagination
export function useAdminGiveaways() {
  const { data: session } = useSession()
  const userRoles = (session?.user as any)?.roles || []
  const hasAccess = userRoles.includes('admin') || userRoles.includes('founder')

  return useInfiniteQuery<{ giveaways: Giveaway[], hasMore: boolean }>({
    queryKey: ['admin-giveaways'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/admin/giveaways?limit=10&offset=${pageParam}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch giveaways')
      const data = await res.json()
      return { giveaways: data.giveaways || [], hasMore: data.hasMore || false }
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.hasMore) {
        return pages.reduce((acc, page) => acc + page.giveaways.length, 0)
      }
      return undefined
    },
    enabled: !!session?.user && hasAccess,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    initialPageParam: 0,
  })
}

// Fetch Ads with pagination
export function useAdminAds() {
  const { data: session } = useSession()
  const userRoles = (session?.user as any)?.roles || []
  const hasAccess = userRoles.includes('admin') || userRoles.includes('founder') || userRoles.includes('moderator')

  return useInfiniteQuery<{ ads: Ad[], hasMore: boolean }>({
    queryKey: ['admin-ads'],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await fetch(`/api/admin/advertisements?limit=10&offset=${pageParam}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch ads')
      const response = await res.json()
      console.log('Admin ads response:', response)
      // API returns { data: [...] } not { ads: [...] }
      return { ads: response.data || response.ads || [], hasMore: response.hasMore || false }
    },
    getNextPageParam: (lastPage, pages) => {
      if (lastPage.hasMore) {
        return pages.reduce((acc, page) => acc + page.ads.length, 0)
      }
      return undefined
    },
    enabled: !!session?.user && hasAccess,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    initialPageParam: 0,
  })
}

// Update User Roles
export function useUpdateUserRoles() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, roles }: { userId: string, roles: string[] }) => {
      const res = await fetch(`/api/admin/users/${userId}/roles`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roles })
      })
      if (!res.ok) throw new Error('Failed to update user roles')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success('User roles updated successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to update user roles', {
        description: error.message
      })
    }
  })
}

// Approve/Reject Script
export function useUpdateScript() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ scriptId, status, reason }: { scriptId: number, status: string, reason?: string }) => {
      const updateData: any = { scriptId, status }
      if (reason) updateData.reason = reason

      const res = await fetch('/api/admin/scripts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData)
      })
      if (!res.ok) throw new Error('Failed to update script')
      return res.json()
    },
    onMutate: async ({ scriptId, status, reason }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin-scripts'] })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['admin-scripts'])

      // Optimistically update the cache for infinite query
      queryClient.setQueryData(['admin-scripts'], (old: any) => {
        if (!old?.pages) return old
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            scripts: page.scripts.map((script: Script) => 
              script.id === scriptId 
                ? { ...script, status, ...(reason && { rejection_reason: reason }) }
                : script
            )
          }))
        }
      })

      // Return context with the snapshot
      return { previousData }
    },
    onSuccess: (_, variables) => {
      if (variables.status === 'approved') {
        toast.success('Script approved successfully!', {
          description: 'The script is now live and visible to users.'
        })
      } else {
        toast.success('Script rejected', {
          description: 'The seller has been notified.'
        })
      }
    },
    onError: (error: any, variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousData) {
        queryClient.setQueryData(['admin-scripts'], context.previousData)
      }
      
      toast.error(
        variables.status === 'approved' ? 'Failed to approve script' : 'Failed to reject script',
        { description: 'Please try again.' }
      )
    },
    onSettled: () => {
      // Refetch in the background to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['admin-scripts'] })
    }
  })
}

// Approve/Reject Giveaway
export function useUpdateGiveaway() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ giveawayId, status, reason }: { giveawayId: number, status: string, reason?: string }) => {
      const updateData: any = { giveawayId, status }
      if (reason) updateData.reason = reason

      const res = await fetch('/api/admin/giveaways', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData)
      })
      if (!res.ok) throw new Error('Failed to update giveaway')
      return res.json()
    },
    onMutate: async ({ giveawayId, status, reason }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin-giveaways'] })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['admin-giveaways'])

      // Optimistically update the cache for infinite query
      queryClient.setQueryData(['admin-giveaways'], (old: any) => {
        if (!old?.pages) return old
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            giveaways: page.giveaways.map((giveaway: Giveaway) => 
              giveaway.id === giveawayId 
                ? { ...giveaway, status, ...(reason && { rejection_reason: reason }) }
                : giveaway
            )
          }))
        }
      })

      // Return context with the snapshot
      return { previousData }
    },
    onSuccess: (_, variables) => {
      if (variables.status === 'approved') {
        toast.success('Giveaway approved successfully!', {
          description: 'The giveaway is now live and visible to users.'
        })
      } else {
        toast.success('Giveaway rejected', {
          description: 'The creator has been notified.'
        })
      }
    },
    onError: (error: any, variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousData) {
        queryClient.setQueryData(['admin-giveaways'], context.previousData)
      }
      
      toast.error(
        variables.status === 'approved' ? 'Failed to approve giveaway' : 'Failed to reject giveaway',
        { description: 'Please try again.' }
      )
    },
    onSettled: () => {
      // Refetch in the background to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['admin-giveaways'] })
    }
  })
}

// Approve/Reject Ad
export function useUpdateAd() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ adId, status, rejectionReason }: { adId: number, status: string, rejectionReason?: string }) => {
      const updateData: any = {
        action: status === 'approved' ? 'approve' : 'reject',
        adId
      }
      if (rejectionReason) updateData.rejectionReason = rejectionReason

      const res = await fetch('/api/admin/advertisements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updateData)
      })
      if (!res.ok) throw new Error('Failed to update ad')
      return res.json()
    },
    onMutate: async ({ adId, status, rejectionReason }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['admin-ads'] })

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(['admin-ads'])

      // Optimistically update the cache for infinite query
      queryClient.setQueryData(['admin-ads'], (old: any) => {
        if (!old?.pages) return old
        
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            ads: page.ads.map((ad: Ad) => 
              ad.id === adId 
                ? { ...ad, status, ...(rejectionReason && { rejection_reason: rejectionReason }) }
                : ad
            )
          }))
        }
      })

      // Return context with the snapshot
      return { previousData }
    },
    onSuccess: (_, variables) => {
      if (variables.status === 'approved') {
        toast.success('Ad approved successfully!')
      } else {
        toast.success('Ad rejected', {
          description: 'The creator has been notified.'
        })
      }
    },
    onError: (error: any, variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousData) {
        queryClient.setQueryData(['admin-ads'], context.previousData)
      }
      
      toast.error(
        variables.status === 'approved' ? 'Failed to approve ad' : 'Failed to reject ad',
        { description: 'Please try again.' }
      )
    },
    onSettled: () => {
      // Refetch in the background to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] })
    }
  })
}

// Create Ad
export function useCreateAd() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (adData: any) => {
      const res = await fetch('/api/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adData)
      })
      if (!res.ok) throw new Error('Failed to create ad')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] })
      toast.success('Ad created successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to create ad', {
        description: error.message
      })
    }
  })
}

// Delete Ad
export function useDeleteAd() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (adId: number) => {
      const res = await fetch(`/api/ads/${adId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete ad')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-ads'] })
      toast.success('Ad deleted successfully')
    },
    onError: (error: any) => {
      toast.error('Failed to delete ad', {
        description: error.message
      })
    }
  })
}

