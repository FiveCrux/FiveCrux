import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import {
  getPendingGiveaways,
  getApprovedGiveaways,
  getRejectedGiveaways,
  deleteGiveaway,
  getGiveawayById,
  hasRole,
  hasAnyRole
} from '@/lib/database-new';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // User must be authenticated
    const user = session.user as any

    // Get pagination params from query string
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    const userId = (session.user as any).id;
    const userEmail = session.user.email;
    console.log("User giveaways API - User:", { id: userId, email: userEmail, limit, offset });

    // Fetch giveaways from approval system tables
    const [pending, approved, rejected] = await Promise.all([
      getPendingGiveaways(),
      getApprovedGiveaways(),
      getRejectedGiveaways()
    ]);

    // Filter giveaways by user email
    const userPending = pending.filter(g => g.creatorEmail === userEmail);
    const userApproved = approved.filter(g => g.creatorEmail === userEmail);
    const userRejected = rejected.filter(g => g.creatorEmail === userEmail);

    console.log("User giveaways API - Found giveaways:", { 
      total: pending.length + approved.length + rejected.length,
      userPending: userPending.length, 
      userApproved: userApproved.length, 
      userRejected: userRejected.length 
    });

    // Combine and format the giveaways
    const allGiveaways = [
      ...userPending.map(g => ({ 
        ...g, 
        status: 'pending',
        creator_id: userId,
        creator_name: g.creatorName,
        creator_email: g.creatorEmail,
        total_value: g.totalValue,
        end_date: g.endDate,
        max_entries: g.maxEntries,
        entries_count: g.entriesCount || 0,
        cover_image: g.coverImage,
        youtube_video_link: g.youtubeVideoLink,
        auto_announce: g.autoAnnounce,
        created_at: g.createdAt || g.submittedAt,
        updated_at: g.updatedAt,
        currency: g.currency,
        currency_symbol: g.currencySymbol,
      })),
      ...userApproved.map(g => ({ 
        ...g, 
        status: 'approved',
        creator_id: userId,
        creator_name: g.creatorName,
        creator_email: g.creatorEmail,
        total_value: g.totalValue,
        end_date: g.endDate,
        max_entries: g.maxEntries,
        entries_count: g.entriesCount || 0,
        cover_image: g.coverImage,
        youtube_video_link: g.youtubeVideoLink,
        auto_announce: g.autoAnnounce,
        created_at: g.createdAt || g.approvedAt,
        updated_at: g.updatedAt,
        currency: g.currency,
        currency_symbol: g.currencySymbol,
      })),
      ...userRejected.map(g => ({ 
        ...g, 
        status: 'rejected',
        creator_id: userId,
        creator_name: g.creatorName,
        creator_email: g.creatorEmail,
        total_value: g.totalValue,
        end_date: g.endDate,
        max_entries: g.maxEntries,
        entries_count: g.entriesCount || 0,
        cover_image: g.coverImage,
        youtube_video_link: g.youtubeVideoLink,
        auto_announce: g.autoAnnounce,
        created_at: g.createdAt || g.rejectedAt,
        updated_at: g.updatedAt,
        rejection_reason: g.rejectionReason,
        currency: g.currency,
        currency_symbol: g.currencySymbol,
      }))
    ];

    // Sort by created date (newest first)
    allGiveaways.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    // Apply pagination
    const total = allGiveaways.length;
    const paginatedGiveaways = allGiveaways.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    console.log('User giveaways API - Returning:', { total, returned: paginatedGiveaways.length, hasMore });
    return NextResponse.json({ 
      giveaways: paginatedGiveaways,
      total,
      hasMore
    });
  } catch (error) {
    console.error('Error fetching user giveaways:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// NOTE: POST was removed (2026-07-13) — it had no legitimate frontend caller
// (giveaway creation goes through POST /api/giveaways, which correctly puts
// new giveaways in the pending-approval queue). This route's POST instead
// inserted directly with status:'active' — skipping moderation entirely —
// and let the client set `featured` with no admin gate.

// NOTE: PATCH was removed (2026-07-13) — it had no ownership check (any logged-in
// user could edit any creator's giveaway) and no legitimate frontend caller used it.
// Giveaway edits go through /api/giveaways/[id] (PATCH), which enforces isOwner || isAdmin.

// Allow users to delete their own giveaways
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const giveawayId = searchParams.get('id');
    if (!giveawayId) return NextResponse.json({ error: "Giveaway ID is required" }, { status: 400 });

    const giveaway = await getGiveawayById(Number(giveawayId));
    if (!giveaway) return NextResponse.json({ error: "Giveaway not found" }, { status: 404 });

    const user = session.user as any;
    const isAdmin = hasAnyRole(user.roles || [], ['admin', 'founder']);
    const isOwner = (giveaway as any).creatorId === user.id;
    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const ok = await deleteGiveaway(Number(giveawayId));
    return NextResponse.json({ success: ok });
  } catch (error) {
    console.error('Error deleting user giveaway:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
