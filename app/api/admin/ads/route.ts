import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { getApprovedAds, getPendingAds, getRejectedAds, approveAd, rejectAd } from '@/lib/database-new'

// SECURITY: this is an admin moderation endpoint — without a role gate any
// logged-in user could approve/reject any ad. Staff only.
function isStaff(session: any): boolean {
  const roles = (session?.user as any)?.roles || []
  return roles.includes('admin') || roles.includes('founder') || roles.includes('moderator')
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isStaff(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const url = new URL(request.url)
    const type = url.searchParams.get('type') || 'all'
    const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined

    if (type === 'approved') {
      const data = await getApprovedAds(limit)
      return NextResponse.json({ data })
    }
    if (type === 'rejected') {
      const data = await getRejectedAds(limit)
      return NextResponse.json({ data })
    }
    if (type === 'pending') {
      const data = await getPendingAds(limit)
      return NextResponse.json({ data })
    }
    // For 'all' type, fetch from all tables
    const [pendingData, approvedData, rejectedData] = await Promise.all([
      getPendingAds(limit),
      getApprovedAds(limit),
      getRejectedAds(limit)
    ])
    const allData = [...pendingData, ...approvedData, ...rejectedData]
    return NextResponse.json({ data: allData })
  } catch (error) {
    console.error('Error fetching admin ads:', error)
    return NextResponse.json({ error: 'Failed to fetch ads' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isStaff(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { action, adId, adminNotes, rejectionReason } = body as {
      action: 'approve' | 'reject'
      adId: number
      adminNotes?: string
      rejectionReason?: string
    }

    if (!action || !adId) {
      return NextResponse.json({ error: 'Missing required fields: action, adId' }, { status: 400 })
    }

    const adminId = String((session.user as any)?.id || '')

    if (action === 'approve') {
      await approveAd(adId, adminId, adminNotes)
      return NextResponse.json({ success: true })
    }

    if (!rejectionReason) {
      return NextResponse.json({ error: 'rejectionReason is required for reject' }, { status: 400 })
    }
    await rejectAd(adId, adminId, rejectionReason, adminNotes)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating ad status:', error)
    return NextResponse.json({ error: 'Failed to update ad' }, { status: 500 })
  }
}


