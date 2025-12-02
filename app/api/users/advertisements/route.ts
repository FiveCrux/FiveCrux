import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { 
  getPendingAds, 
  getApprovedAds, 
  getRejectedAds,
  hasRole,
  hasAnyRole
} from '@/lib/database-new';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pagination params from query string
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const userId = (session.user as any).id;
    const userEmail = session.user.email;
    console.log("User advertisements API - User:", { id: userId, email: userEmail, limit, offset });

    // Fetch ads from all tables where the user is the creator
    let pending: any[] = [];
    let approved: any[] = [];
    let rejected: any[] = [];
    
    try {
      [pending, approved, rejected] = await Promise.all([
        getPendingAds(1000),
        getApprovedAds(1000),
        getRejectedAds(1000)
      ]);
    } catch (error) {
      console.log("Approval tables don't exist yet, falling back to main ads table");
      // Fallback to main ads table if approval tables don't exist
      const { getAds } = await import('@/lib/database-new');
      const allAds = await getAds({ limit: 1000 });
      approved = allAds; // Treat all ads as approved for now
    }

    // Filter ads by user ID (createdBy)
    const userPending = pending.filter(a => a.createdBy === userId);
    const userApproved = approved.filter(a => a.createdBy === userId);
    const userRejected = rejected.filter(a => a.createdBy === userId);

    console.log("User advertisements API - Found ads:", { 
      total: pending.length + approved.length + rejected.length,
      userPending: userPending.length, 
      userApproved: userApproved.length, 
      userRejected: userRejected.length 
    });

    // Combine and format the ads
    const allAds = [
      ...userPending.map(a => ({ 
        ...a, 
        status: 'pending',
        image_url: a.imageUrl,
        link_url: a.linkUrl,
        slot_unique_id: a.slotUniqueId || null,  // ✅ Add this
        click_count: 0, // Pending ads don't have click counts
        created_at: a.createdAt,
        updated_at: a.updatedAt
      })),
      ...userApproved
        .filter(a => a.status !== 'inactive')
        .map(a => ({ 
        ...a, 
          status: a.status || 'approved',
        image_url: a.imageUrl,
        link_url: a.linkUrl,
          slot_unique_id: a.slotUniqueId || null,  // ✅ Add this
        click_count: a.clickCount || 0, // Include click count for approved ads
        view_count: a.viewCount || 0, // Include view count for approved ads
        created_at: a.createdAt || a.approvedAt,
        updated_at: a.updatedAt
      })),
      ...userRejected.filter(a => a.status !== 'inactive').map(a => ({ 
        ...a, 
        status: a.status || 'rejected',
        rejection_reason: a.rejectionReason,
        image_url: a.imageUrl,
        link_url: a.linkUrl,
        slot_unique_id: a.slotUniqueId || null,  // ✅ Add this
        click_count: 0, // Rejected ads don't have click counts
        created_at: a.createdAt || a.rejectedAt,
        updated_at: a.updatedAt
      }))
    ];

    // Sort by created date (newest first)
    allAds.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    // Apply pagination
    const total = allAds.length;
    const paginatedAds = allAds.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    console.log('User advertisements API - Returning:', { total, returned: paginatedAds.length, hasMore });
    return NextResponse.json({ 
      ads: paginatedAds,
      total,
      hasMore
    });
  } catch (error) {
    console.error('Error fetching user advertisements:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Allow users to create ads
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { createPendingAd } = await import('@/lib/database-new');
    const adId = await createPendingAd({
      title: body.title,
      description: body.description,
      imageUrl: body.image_url,
      linkUrl: body.link_url,
      category: body.category,
      slot_unique_id: body.slot_unique_id || null, // Pass slot_unique_id if provided
      startDate: body.start_date,
      endDate: body.end_date, // Will be overridden by slot's endDate if slot_unique_id is provided
      createdBy: (session.user as any).id,
    } as any);
    
    // Send Discord notification for ALL ad creations
    try {
      const { announceAdPending } = await import('@/lib/discord');
      await announceAdPending(
        {
          id: adId,
          title: body.title,
          description: body.description,
          category: body.category,
          linkUrl: body.link_url || null,
          imageUrl: body.image_url || null,
          createdBy: (session.user as any).id,
        },
        {
          id: (session.user as any).id,
          name: session.user?.name || null,
        },
        false // isUpdate = false for new submissions
      )
    } catch (discordError) {
      console.error('Failed to send Discord notification for ad creation:', discordError)
      // Don't fail the submission if Discord notification fails
    }
    
    return NextResponse.json({ success: true, adId });
  } catch (error) {
    console.error('Error creating user advertisement:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Allow users to update their ads
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { adId, ...updateData } = body;
    if (!adId) return NextResponse.json({ error: 'adId is required' }, { status: 400 });

    const { 
      updateAd, 
      updatePendingAd, 
      updateApprovedAdForReapproval, 
      updateRejectedAdForReapproval,
      getAdById 
    } = await import('@/lib/database-new');
    
    const ad = await getAdById(Number(adId));
    if (!ad || ad.createdBy !== (session.user as any).id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Determine which flow to use based on current status
    let updatedAd;
    const needsReapproval = ad.status === "approved" || ad.status === "rejected";
    
    if (ad.status === "approved") {
      // Approved -> move to pending with updates
      updatedAd = await updateApprovedAdForReapproval(Number(adId), updateData);
    } else if (ad.status === "rejected") {
      // Rejected -> move to pending with updates
      updatedAd = await updateRejectedAdForReapproval(Number(adId), updateData);
    } else {
      // Pending -> in-place update (refresh submittedAt for ordering)
      updatedAd = await updatePendingAd(Number(adId), updateData);
    }

    // Send Discord notification for ad updates that need re-approval
    if (needsReapproval) {
      try {
        const { announceAdPending } = await import('@/lib/discord');
        await announceAdPending(
          {
            id: Number(adId),
            title: updateData.title || ad.title,
            description: updateData.description || ad.description,
            category: updateData.category || ad.category,
            linkUrl: updateData.link_url || ad.linkUrl,
            imageUrl: updateData.image_url || ad.imageUrl,
            createdBy: ad.createdBy,
          },
          {
            id: (session.user as any).id,
            name: session.user?.name || null,
          },
          true // isUpdate = true for re-approvals
        )
      } catch (discordError) {
        console.error('Failed to send Discord notification for ad update:', discordError)
        // Don't fail the update if Discord notification fails
      }
    }

    return NextResponse.json({ 
      success: !!updatedAd,
      needsReapproval,
      message: needsReapproval
        ? "Advertisement updated successfully! It has been moved to pending status and will require admin approval before going live again."
        : "Advertisement updated successfully!"
    });
  } catch (error) {
    console.error('Error updating user advertisement:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Allow users to delete their ads
export async function DELETE(request: NextRequest) {
  try {
    console.log("DELETE /api/users/advertisements - Request received");
    
    const session = await getServerSession(authOptions);
    console.log("DELETE /api/users/advertisements - Session:", session?.user?.id);
    
    if (!session?.user) {
      console.log("DELETE /api/users/advertisements - No session, returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const adId = searchParams.get('id');
    console.log("DELETE /api/users/advertisements - Ad ID:", adId);
    
    if (!adId) {
      console.log("DELETE /api/users/advertisements - No adId provided");
      return NextResponse.json({ error: 'adId is required' }, { status: 400 });
    }

    const { getAdById, deleteAd } = await import('@/lib/database-new');
    const ad = await getAdById(Number(adId));
    console.log("DELETE /api/users/advertisements - Found ad:", ad?.id, "Created by:", ad?.createdBy);
    
    if (!ad || ad.createdBy !== (session.user as any).id) {
      console.log("DELETE /api/users/advertisements - Ad not found or forbidden");
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    console.log("DELETE /api/users/advertisements - Attempting to delete ad:", adId);
    const ok = await deleteAd(Number(adId));
    console.log("DELETE /api/users/advertisements - Delete result:", ok);
    
    return NextResponse.json({ success: ok });
  } catch (error) {
    console.error('Error deleting user advertisement:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


