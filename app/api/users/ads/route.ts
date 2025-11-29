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

    const userId = (session.user as any).id;
    const userEmail = session.user.email;
    console.log("User ads API - User:", { id: userId, email: userEmail });

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

    console.log("User ads API - Found ads:", { 
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
        created_at: a.createdAt || a.submittedAt,
        updated_at: a.updatedAt
      })),
      ...userApproved.map(a => ({ 
        ...a, 
        status: 'approved',
        created_at: a.createdAt || a.approvedAt,
        updated_at: a.updatedAt
      })),
      ...userRejected.map(a => ({ 
        ...a, 
        status: 'rejected',
        rejection_reason: a.rejectionReason,
        created_at: a.createdAt || a.rejectedAt,
        updated_at: a.updatedAt
      }))
    ];

    return NextResponse.json({ ads: allAds });
  } catch (error) {
    console.error('Error fetching user ads:', error);
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
      startDate: body.start_date,
      endDate: body.end_date,
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
    console.error('Error creating user ad:', error);
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
        ? "Ad updated successfully! It has been moved to pending status and will require admin approval before going live again."
        : "Ad updated successfully!"
    });
  } catch (error) {
    console.error('Error updating user ad:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Allow users to delete their ads
export async function DELETE(request: NextRequest) {
  try {
    console.log("DELETE /api/users/ads - Request received");
    
    const session = await getServerSession(authOptions);
    console.log("DELETE /api/users/ads - Session:", session?.user?.id);
    
    if (!session?.user) {
      console.log("DELETE /api/users/ads - No session, returning 401");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const adId = searchParams.get('id');
    console.log("DELETE /api/users/ads - Ad ID:", adId);
    
    if (!adId) {
      console.log("DELETE /api/users/ads - No adId provided");
      return NextResponse.json({ error: 'adId is required' }, { status: 400 });
    }

    const { getAdById, deleteAd } = await import('@/lib/database-new');
    const ad = await getAdById(Number(adId));
    console.log("DELETE /api/users/ads - Found ad:", ad?.id, "Created by:", ad?.createdBy);
    
    if (!ad || ad.createdBy !== (session.user as any).id) {
      console.log("DELETE /api/users/ads - Ad not found or forbidden");
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    console.log("DELETE /api/users/ads - Attempting to delete ad:", adId);
    const ok = await deleteAd(Number(adId));
    console.log("DELETE /api/users/ads - Delete result:", ok);
    
    return NextResponse.json({ success: ok });
  } catch (error) {
    console.error('Error deleting user ad:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
