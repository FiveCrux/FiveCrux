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

    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    let scripts: any[] = []
    let hasMore = false
    
    if (!status || status === 'all') {
      // Fetch extra items to check if there are more
      const [pending, approved, rejected] = await Promise.all([
        getPendingScripts(limit + offset + 1),
        getApprovedScripts(limit + offset + 1),
        getRejectedScripts(limit + offset + 1),
      ])
      
      const allScripts = [
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
      
      // Apply pagination
      scripts = allScripts.slice(offset, offset + limit)
      hasMore = allScripts.length > offset + limit
    } else if (status === 'pending') {
      const allScripts = (await getPendingScripts(limit + offset + 1)).map((s: any) => ({
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
      scripts = allScripts.slice(offset, offset + limit)
      hasMore = allScripts.length > offset + limit
    } else if (status === 'approved') {
      const allScripts = (await getApprovedScripts(limit + offset + 1)).map((s: any) => ({
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
      scripts = allScripts.slice(offset, offset + limit)
      hasMore = allScripts.length > offset + limit
    } else if (status === 'rejected') {
      const allScripts = (await getRejectedScripts(limit + offset + 1)).map((s: any) => ({
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
      scripts = allScripts.slice(offset, offset + limit)
      hasMore = allScripts.length > offset + limit
    }

    return NextResponse.json({ scripts, hasMore })
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















