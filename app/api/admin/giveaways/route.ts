import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { 
  getPendingGiveaways, 
  getApprovedGiveaways, 
  getRejectedGiveaways,
  approveGiveaway,
  rejectGiveaway,
  getGiveawayRequirements,
  getGiveawayPrizes
} from '@/lib/database-new';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    const userRoles = (session.user as any).roles || [];
    if (!userRoles.includes('admin')) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let giveaways: any[] = [];
    
    if (!status || status === "all") {
      const [pending, approved, rejected] = await Promise.all([
        getPendingGiveaways(1000),
        getApprovedGiveaways(1000),
        getRejectedGiveaways(1000)
      ]);
      
      // Fetch requirements and prizes for all giveaways
      const allGiveaways = [...pending, ...approved, ...rejected];
      const giveawayIds = allGiveaways.map(g => g.id);
      
      const [allRequirements, allPrizes] = await Promise.all([
        Promise.all(giveawayIds.map(id => getGiveawayRequirements(id))),
        Promise.all(giveawayIds.map(id => getGiveawayPrizes(id)))
      ]);
      
      // Create maps for easy lookup
      const requirementsMap = new Map();
      const prizesMap = new Map();
      
      giveawayIds.forEach((id, index) => {
        requirementsMap.set(id, allRequirements[index]);
        prizesMap.set(id, allPrizes[index]);
      });
      
      giveaways = [
        ...pending.map(g => ({ 
          ...g, 
          status: 'pending',
          creator_name: g.creatorName,
          total_value: g.totalValue,
          created_at: g.createdAt || g.submittedAt,
          requirements: requirementsMap.get(g.id) || [],
          prizes: prizesMap.get(g.id) || []
        })),
        ...approved.map(g => ({ 
          ...g, 
          status: 'approved',
          creator_name: g.creatorName,
          total_value: g.totalValue,
          created_at: g.createdAt || g.approvedAt,
          requirements: requirementsMap.get(g.id) || [],
          prizes: prizesMap.get(g.id) || []
        })),
        ...rejected.map(g => ({ 
          ...g, 
          status: 'rejected',
          creator_name: g.creatorName,
          total_value: g.totalValue,
          created_at: g.createdAt || g.rejectedAt,
          requirements: requirementsMap.get(g.id) || [],
          prizes: prizesMap.get(g.id) || []
        }))
      ];
    } else if (status === "pending") {
      giveaways = await getPendingGiveaways(1000);
      
      // Fetch requirements and prizes for pending giveaways
      const giveawayIds = giveaways.map(g => g.id);
      const [allRequirements, allPrizes] = await Promise.all([
        Promise.all(giveawayIds.map(id => getGiveawayRequirements(id))),
        Promise.all(giveawayIds.map(id => getGiveawayPrizes(id)))
      ]);
      
      // Create maps for easy lookup
      const requirementsMap = new Map();
      const prizesMap = new Map();
      
      giveawayIds.forEach((id, index) => {
        requirementsMap.set(id, allRequirements[index]);
        prizesMap.set(id, allPrizes[index]);
      });
      
      giveaways = giveaways.map(g => ({ 
        ...g, 
        status: 'pending',
        creator_name: g.creatorName,
        total_value: g.totalValue,
        created_at: g.createdAt || g.submittedAt,
        requirements: requirementsMap.get(g.id) || [],
        prizes: prizesMap.get(g.id) || []
      }));
    } else if (status === "approved") {
      giveaways = await getApprovedGiveaways(1000);
      
      // Fetch requirements and prizes for approved giveaways
      const giveawayIds = giveaways.map(g => g.id);
      const [allRequirements, allPrizes] = await Promise.all([
        Promise.all(giveawayIds.map(id => getGiveawayRequirements(id))),
        Promise.all(giveawayIds.map(id => getGiveawayPrizes(id)))
      ]);
      
      // Create maps for easy lookup
      const requirementsMap = new Map();
      const prizesMap = new Map();
      
      giveawayIds.forEach((id, index) => {
        requirementsMap.set(id, allRequirements[index]);
        prizesMap.set(id, allPrizes[index]);
      });
      
      giveaways = giveaways.map(g => ({ 
        ...g, 
        status: 'approved',
        creator_name: g.creatorName,
        total_value: g.totalValue,
        created_at: g.createdAt || g.approvedAt,
        requirements: requirementsMap.get(g.id) || [],
        prizes: prizesMap.get(g.id) || []
      }));
    } else if (status === "rejected") {
      giveaways = await getRejectedGiveaways(1000);
      
      // Fetch requirements and prizes for rejected giveaways
      const giveawayIds = giveaways.map(g => g.id);
      const [allRequirements, allPrizes] = await Promise.all([
        Promise.all(giveawayIds.map(id => getGiveawayRequirements(id))),
        Promise.all(giveawayIds.map(id => getGiveawayPrizes(id)))
      ]);
      
      // Create maps for easy lookup
      const requirementsMap = new Map();
      const prizesMap = new Map();
      
      giveawayIds.forEach((id, index) => {
        requirementsMap.set(id, allRequirements[index]);
        prizesMap.set(id, allPrizes[index]);
      });
      
      giveaways = giveaways.map(g => ({ 
        ...g, 
        status: 'rejected',
        creator_name: g.creatorName,
        total_value: g.totalValue,
        created_at: g.createdAt || g.rejectedAt,
        requirements: requirementsMap.get(g.id) || [],
        prizes: prizesMap.get(g.id) || []
      }));
    }

    return NextResponse.json({ giveaways });
  } catch (error) {
    console.error('Error in admin giveaways API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin role
    const userRoles = (session.user as any).roles || [];
    if (!userRoles.includes('admin')) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { giveawayId, status, reason, adminNotes } = body;

    if (!giveawayId || !status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    let result: boolean;
    
    if (status === 'approved') {
      result = await approveGiveaway(giveawayId, (session.user as any).id, adminNotes);
    } else if (status === 'rejected') {
      if (!reason) {
        return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 });
      }
      result = await rejectGiveaway(giveawayId, (session.user as any).id, reason, adminNotes);
    } else {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (result) {
      return NextResponse.json({ success: true, message: `Giveaway ${status} successfully` });
    } else {
      return NextResponse.json({ error: "Failed to update giveaway" }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in admin giveaways PATCH API:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

