import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { 
  getPendingGiveaways, 
  getApprovedGiveaways, 
  getRejectedGiveaways,
  createGiveaway,
  updateGiveaway,
  deleteGiveaway,
  hasRole,
  hasAnyRole
} from '@/lib/database-new';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has permission to view giveaways (founder, admin, verified_creator)
    const user = session.user as any
    if (!user.roles || !hasAnyRole(user.roles, ['founder', 'admin', 'verified_creator'])) {
      return NextResponse.json({ 
        error: "You need founder, admin, or verified creator access to view giveaways." 
      }, { status: 403 });
    }

    const userId = (session.user as any).id;
    const userEmail = session.user.email;
    console.log("User giveaways API - User:", { id: userId, email: userEmail });

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
        total_value: g.totalValue,
        created_at: g.createdAt || g.submittedAt,
        updated_at: g.updatedAt
      })),
      ...userApproved.map(g => ({ 
        ...g, 
        status: 'approved',
        creator_id: userId,
        creator_name: g.creatorName,
        total_value: g.totalValue,
        created_at: g.createdAt || g.approvedAt,
        updated_at: g.updatedAt
      })),
      ...userRejected.map(g => ({ 
        ...g, 
        status: 'rejected',
        creator_id: userId,
        creator_name: g.creatorName,
        total_value: g.totalValue,
        created_at: g.createdAt || g.rejectedAt,
        updated_at: g.updatedAt
      }))
    ];

    return NextResponse.json({ giveaways: allGiveaways });
  } catch (error) {
    console.error('Error fetching user giveaways:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Allow users to create giveaways using the existing database function
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Check if user has permission to create giveaways (founder, admin, verified_creator)
    const user = session.user as any
    if (!user.roles || !hasAnyRole(user.roles, ['founder', 'admin', 'verified_creator'])) {
      return NextResponse.json({ 
        error: "You need founder, admin, or verified creator access to create giveaways." 
      }, { status: 403 });
    }

    const body = await request.json();

    const giveawayId = await createGiveaway({
      title: body.title,
      description: body.description,
      totalValue: body.total_value,
      category: body.category,
      endDate: body.end_date,
      maxEntries: body.max_entries,
      difficulty: body.difficulty,
      featured: body.featured ?? false,
      autoAnnounce: body.auto_announce ?? false,
      creatorName: (session.user as any).name || 'Unknown Creator',
      creatorEmail: (session.user as any).email || '',
      creatorId: (session.user as any).id,
      images: body.images || [],
      videos: body.videos || [],
      coverImage: body.cover_image || null,
      rules: body.rules || [],
      status: 'active',
    } as any);

    return NextResponse.json({ success: true, giveawayId });
  } catch (error) {
    console.error('Error creating user giveaway:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Allow users to update their giveaways
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { giveawayId, ...updateData } = body;
    if (!giveawayId) return NextResponse.json({ error: "Giveaway ID is required" }, { status: 400 });

    // Update giveaway using the approval system
    const updated = await updateGiveaway(Number(giveawayId), updateData);
    return NextResponse.json({ success: !!updated });
  } catch (error) {
    console.error('Error updating user giveaway:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Allow users to delete their giveaways
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const giveawayId = searchParams.get('id');
    if (!giveawayId) return NextResponse.json({ error: "Giveaway ID is required" }, { status: 400 });

    const ok = await deleteGiveaway(Number(giveawayId));
    return NextResponse.json({ success: ok });
  } catch (error) {
    console.error('Error deleting user giveaway:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
