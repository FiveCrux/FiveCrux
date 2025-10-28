import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { getApprovedAds, getPendingAds, getRejectedAds, approveAd, rejectAd, getAdById, getUserById } from '@/lib/database-new'
import { announceAdApproval, announceAdRejection } from '@/lib/discord'

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
    const offset = url.searchParams.get('offset') ? Number(url.searchParams.get('offset')) : 0

    if (type === 'approved') {
      console.log("Fetching approved ads...")
      const allData = await getApprovedAds(limit ? limit + offset + 1 : undefined)
      const dataWithStatus = allData.map(ad => ({ ...ad, status: ad.status || 'approved' }))
      const data = dataWithStatus.slice(offset, limit ? offset + limit : undefined)
      const hasMore = limit ? allData.length > offset + limit : false
      console.log("Approved ads found:", data.length)
      return NextResponse.json({ data, hasMore })
    }
    if (type === 'rejected') {
      console.log("Fetching rejected ads...")
      const allData = await getRejectedAds(limit ? limit + offset + 1 : undefined)
      const dataWithStatus = allData.map(ad => ({ ...ad, status: 'rejected' }))
      const data = dataWithStatus.slice(offset, limit ? offset + limit : undefined)
      const hasMore = limit ? allData.length > offset + limit : false
      console.log("Rejected ads found:", data.length)
      return NextResponse.json({ data, hasMore })
    }
    if (type === 'pending') {
      console.log("Fetching pending ads...")
      const allData = await getPendingAds(limit ? limit + offset + 1 : undefined)
      const dataWithStatus = allData.map(ad => ({ ...ad, status: 'pending' }))
      const data = dataWithStatus.slice(offset, limit ? offset + limit : undefined)
      const hasMore = limit ? allData.length > offset + limit : false
      console.log("Pending ads found:", data.length)
      return NextResponse.json({ data, hasMore })
    }
    // For 'all' type, fetch from all tables
    console.log("Fetching all ads...")
    const [pendingData, approvedData, rejectedData] = await Promise.all([
      getPendingAds(limit ? limit + offset + 1 : undefined),
      getApprovedAds(limit ? limit + offset + 1 : undefined),
      getRejectedAds(limit ? limit + offset + 1 : undefined)
    ])
    console.log("All ads - Pending:", pendingData.length, "Approved:", approvedData.length, "Rejected:", rejectedData.length)
    
    // Add status field to each ad based on its source
    const allData = [
      ...pendingData.map(ad => ({ ...ad, status: 'pending' })),
      ...approvedData.map(ad => ({ ...ad, status: ad.status || 'approved' })),
      ...rejectedData.map(ad => ({ ...ad, status: 'rejected' }))
    ]
    const data = allData.slice(offset, limit ? offset + limit : undefined)
    const hasMore = limit ? allData.length > offset + limit : false
    return NextResponse.json({ data, hasMore })
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
      
      // Send Discord notification for ad approval
      try {
        const ad = await getAdById(adId)
        if (ad && ad.createdBy) {
          const creator = await getUserById(ad.createdBy)
          if (creator) {
            await announceAdApproval(
              {
                id: ad.id,
                title: ad.title,
                description: ad.description,
                category: ad.category,
                linkUrl: ad.linkUrl,
                imageUrl: ad.imageUrl,
                createdBy: ad.createdBy,
              },
              {
                id: creator.id,
                name: creator.name,
              },
              {
                id: adminId,
                name: session.user?.name || null,
              }
            )
          }
        }
      } catch (discordError) {
        console.error('Failed to send Discord notification for ad approval:', discordError)
        // Don't fail the approval if Discord notification fails
      }
      
      return NextResponse.json({ success: true })
    }

    if (!rejectionReason) {
      return NextResponse.json({ error: 'rejectionReason is required for reject' }, { status: 400 })
    }
    
    await rejectAd(adId, adminId, rejectionReason, adminNotes)
    
    // Send Discord notification for ad rejection
    try {
      const ad = await getAdById(adId)
      if (ad && ad.createdBy) {
        const creator = await getUserById(ad.createdBy)
        if (creator) {
          await announceAdRejection(
            {
              id: ad.id,
              title: ad.title,
              description: ad.description,
              category: ad.category,
              imageUrl: ad.imageUrl,
              createdBy: ad.createdBy,
            },
            {
              id: creator.id,
              name: creator.name,
            },
            rejectionReason,
            {
              id: adminId,
              name: session.user?.name || null,
            }
          )
        }
      }
    } catch (discordError) {
      console.error('Failed to send Discord notification for ad rejection:', discordError)
      // Don't fail the rejection if Discord notification fails
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating advertisement status:', error)
    return NextResponse.json({ error: 'Failed to update advertisement' }, { status: 500 })
  }
}
