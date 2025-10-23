import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import {
  getPendingScripts,
  getApprovedScripts,
  getRejectedScripts,
  approveScript,
  rejectScript,
} from '@/lib/database-new'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userRoles = (session.user as any).roles || []
    if (!userRoles.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let scripts: any[] = []
    if (!status || status === 'all') {
      const [pending, approved, rejected] = await Promise.all([
        getPendingScripts(1000),
        getApprovedScripts(1000),
        getRejectedScripts(1000),
      ])
      scripts = [
        ...pending.map((s: any) => ({
          ...s,
          status: 'pending',
          seller_name: s.seller_name,
          seller_email: s.seller_email,
          seller_id: s.sellerId,
          original_price: s.originalPrice,
          cover_image: s.coverImage,
          created_at: s.createdAt || s.submittedAt,
          updated_at: s.updatedAt,
        })),
        ...approved.map((s: any) => ({
          ...s,
          status: 'approved',
          seller_name: s.seller_name,
          seller_email: s.seller_email,
          seller_id: s.sellerId,
          original_price: s.originalPrice,
          cover_image: s.coverImage,
          created_at: s.createdAt || s.approvedAt,
          updated_at: s.updatedAt,
        })),
        ...rejected.map((s: any) => ({
          ...s,
          status: 'rejected',
          seller_name: s.seller_name,
          seller_email: s.seller_email,
          seller_id: s.sellerId,
          original_price: s.originalPrice,
          cover_image: s.coverImage,
          created_at: s.createdAt || s.rejectedAt,
          updated_at: s.updatedAt,
          rejection_reason: s.rejectionReason,
        })),
      ]
    } else if (status === 'pending') {
      scripts = (await getPendingScripts(1000)).map((s: any) => ({
        ...s,
        status: 'pending',
        seller_name: s.seller_name,
        seller_email: s.seller_email,
        seller_id: s.sellerId,
        original_price: s.originalPrice,
        cover_image: s.coverImage,
        created_at: s.createdAt || s.submittedAt,
        updated_at: s.updatedAt,
      }))
    } else if (status === 'approved') {
      scripts = (await getApprovedScripts(1000)).map((s: any) => ({
        ...s,
        status: 'approved',
        seller_name: s.seller_name,
        seller_email: s.seller_email,
        seller_id: s.sellerId,
        original_price: s.originalPrice,
        cover_image: s.coverImage,
        created_at: s.createdAt || s.approvedAt,
        updated_at: s.updatedAt,
      }))
    } else if (status === 'rejected') {
      scripts = (await getRejectedScripts(1000)).map((s: any) => ({
        ...s,
        status: 'rejected',
        seller_name: s.seller_name,
        seller_email: s.seller_email,
        seller_id: s.sellerId,
        original_price: s.originalPrice,
        cover_image: s.coverImage,
        created_at: s.createdAt || s.rejectedAt,
        updated_at: s.updatedAt,
        rejection_reason: s.rejectionReason,
      }))
    }

    return NextResponse.json({ scripts })
  } catch (error) {
    console.error('Error in admin scripts API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userRoles = (session.user as any).roles || []
    if (!userRoles.includes('admin')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { scriptId, status, reason, adminNotes } = body
    if (!scriptId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (status === 'approved') {
      const result = await approveScript(Number(scriptId), (session.user as any).id, adminNotes)
      return NextResponse.json({ success: true, result })
    }
    if (status === 'rejected') {
      if (!reason) {
        return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
      }
      const result = await rejectScript(Number(scriptId), (session.user as any).id, reason, adminNotes)
      return NextResponse.json({ success: true, result })
    }

    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  } catch (error) {
    console.error('Error in admin scripts PATCH API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}















