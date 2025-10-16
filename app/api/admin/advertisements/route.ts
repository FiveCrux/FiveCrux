import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { getApprovedAds, getPendingAds, getRejectedAds, approveAd, rejectAd } from '@/lib/database-new'

export async function GET(request: NextRequest) {
  try {
    console.log("Admin advertisements API called")
    const session = await getServerSession(authOptions)
    console.log("Session:", session ? "exists" : "none")
    
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if user has admin role
    const userRoles = (session.user as any).roles || []
    console.log("User roles:", userRoles)
    
    if (!userRoles.includes('admin') && !userRoles.includes('founder')) {
      console.log("User is not admin or founder")
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

    console.log("User is admin, fetching advertisements...")
    const url = new URL(request.url)
    const type = url.searchParams.get('type') || 'all'
    const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined

    if (type === 'approved') {
      console.log("Fetching approved ads...")
      const data = await getApprovedAds(limit)
      console.log("Approved ads found:", data.length)
      return NextResponse.json({ data })
    }
    if (type === 'rejected') {
      console.log("Fetching rejected ads...")
      const data = await getRejectedAds(limit)
      console.log("Rejected ads found:", data.length)
      return NextResponse.json({ data })
    }
    if (type === 'pending') {
      console.log("Fetching pending ads...")
      const data = await getPendingAds(limit)
      console.log("Pending ads found:", data.length)
      return NextResponse.json({ data })
    }
    // For 'all' type, fetch from all tables
    console.log("Fetching all ads...")
    const [pendingData, approvedData, rejectedData] = await Promise.all([
      getPendingAds(limit),
      getApprovedAds(limit),
      getRejectedAds(limit)
    ])
    console.log("All ads - Pending:", pendingData.length, "Approved:", approvedData.length, "Rejected:", rejectedData.length)
    const allData = [...pendingData, ...approvedData, ...rejectedData]
    return NextResponse.json({ data: allData })
  } catch (error) {
    console.error('Error fetching admin advertisements:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json({ error: 'Failed to fetch advertisements' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check if user has admin role
    const userRoles = (session.user as any).roles || []
    if (!userRoles.includes('admin') && !userRoles.includes('founder')) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 })
    }

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
    console.error('Error updating advertisement status:', error)
    return NextResponse.json({ error: 'Failed to update advertisement' }, { status: 500 })
  }
}
