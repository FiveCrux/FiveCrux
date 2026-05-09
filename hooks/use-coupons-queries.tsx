"use client"

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Coupon, CouponPayload } from '@/types/api'

export function useCoupons() {
  const { data: session } = useSession()

  return useQuery<Coupon[]>({
    queryKey: ['coupons'],
    queryFn: async () => {
      const res = await fetch('/api/coupons', {
        credentials: 'include',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to load coupons')
      }
      return res.json()
    },
    enabled: !!session?.user,
    staleTime: 30000,
    refetchOnWindowFocus: true,
  })
}

export function useCreateCoupon() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CouponPayload) => {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create coupon')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      toast.success('Coupon created successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create coupon')
    },
  })
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ couponId, payload }: { couponId: number; payload: CouponPayload }) => {
      const res = await fetch(`/api/coupons/${couponId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update coupon')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      toast.success('Coupon updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update coupon')
    },
  })
}

export function useDeleteCoupon() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (couponId: number) => {
      const res = await fetch(`/api/coupons/${couponId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to delete coupon')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      toast.success('Coupon deleted successfully')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete coupon')
    },
  })
}
