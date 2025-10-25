import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { 
  getPendingScripts, 
  getApprovedScripts, 
  getRejectedScripts,
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
    console.log("User scripts API - User:", { id: userId, email: userEmail, limit, offset });

    // Fetch scripts from all tables where the user is the seller
    let pending: any[] = [];
    let approved: any[] = [];
    let rejected: any[] = [];
    
    try {
      [pending, approved, rejected] = await Promise.all([
        getPendingScripts(1000),
        getApprovedScripts(1000),
        getRejectedScripts(1000)
      ]);
    } catch (error) {
      console.log("Approval tables don't exist yet, falling back to main scripts table");
      // Fallback to main scripts table if approval tables don't exist
      const { getScripts } = await import('@/lib/database-new');
      const allScripts = await getScripts({ limit: 1000 });
      approved = allScripts; // Treat all scripts as approved for now
    }

    // Filter scripts by user email
    const userPending = pending.filter(s => s.seller_email === userEmail);
    const userApproved = approved.filter(s => s.seller_email === userEmail);
    const userRejected = rejected.filter(s => s.seller_email === userEmail);

    console.log("User scripts API - Found scripts:", { 
      total: pending.length + approved.length + rejected.length,
      userPending: userPending.length, 
      userApproved: userApproved.length, 
      userRejected: userRejected.length 
    });

    // Combine and format the scripts
    const allScripts = [
      ...userPending.map(s => {
        console.log('Pending script coverImage:', s.coverImage);
        return {
          ...s, 
          status: 'pending',
          seller_id: userId,
          cover_image: s.coverImage,
          original_price: s.originalPrice,
          demo_url: s.demoUrl,
          documentation_url: s.documentationUrl,
          support_url: s.supportUrl,
          last_updated: s.lastUpdated,
          review_count: s.reviewCount,
          created_at: s.createdAt || s.submittedAt,
          updated_at: s.updatedAt
        };
      }),
      ...userApproved.map(s => {
        console.log('Approved script coverImage:', s.coverImage);
        return {
          ...s, 
          status: 'approved',
          seller_id: userId,
          cover_image: s.coverImage,
          original_price: s.originalPrice,
          demo_url: s.demoUrl,
          documentation_url: s.documentationUrl,
          support_url: s.supportUrl,
          last_updated: s.lastUpdated,
          review_count: s.reviewCount,
          created_at: s.createdAt || s.approvedAt,
          updated_at: s.updatedAt
        };
      }),
      ...userRejected.map(s => {
        console.log('Rejected script coverImage:', s.coverImage);
        return {
          ...s, 
          status: 'rejected',
          rejection_reason: s.rejectionReason,
          seller_id: userId,
          cover_image: s.coverImage,
          original_price: s.originalPrice,
          demo_url: s.demoUrl,
          documentation_url: s.documentationUrl,
          support_url: s.supportUrl,
          last_updated: s.lastUpdated,
          review_count: s.reviewCount,
          created_at: s.createdAt || s.rejectedAt,
          updated_at: s.updatedAt
        };
      })
    ];

    // Sort by created date (newest first)
    allScripts.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    // Apply pagination
    const total = allScripts.length;
    const paginatedScripts = allScripts.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    console.log('User scripts API - Returning:', { total, returned: paginatedScripts.length, hasMore });
    return NextResponse.json({ 
      scripts: paginatedScripts,
      total,
      hasMore
    });
  } catch (error) {
    console.error('Error fetching user scripts:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Allow users to create scripts using the existing database function
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userEmail = session.user.email;
    const body = await request.json();

    // Use the existing createScript function from database-new.ts
    const { createScript } = await import('@/lib/database-new');
    
    const scriptData = {
      title: body.title,
      description: body.description,
      price: body.price,
      original_price: body.original_price,
      category: body.category,
      framework: body.framework,
      seller_name: body.seller_name || session.user.name || 'Unknown Seller',
      seller_email: userEmail,
      sellerId: userId,
      features: body.features || [],
      requirements: body.requirements || [],
      images: body.images || [],
      videos: body.videos || [],
      screenshots: body.screenshots || [],
      cover_image: body.cover_image,
      demo_url: body.demo_url,
      documentation_url: body.documentation_url,
      support_url: body.support_url,
      featured: body.featured || false
    } as any;

    const scriptId = await createScript(scriptData);

    if (scriptId) {
      return NextResponse.json({ 
        success: true, 
        scriptId: scriptId,
        message: "Script created successfully"
      });
    } else {
      return NextResponse.json({ error: "Failed to create script" }, { status: 500 });
    }
  } catch (error) {
    console.error('Error creating user script:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Allow users to update their scripts
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const body = await request.json();
    const { scriptId, ...updateData } = body;

    if (!scriptId) {
      return NextResponse.json({ error: "Script ID is required" }, { status: 400 });
    }

    // Ownership check would require fetching from pending/approved by seller_email
    const { updateScript } = await import('@/lib/database-new');
    const updated = await updateScript(Number(scriptId), updateData);
    return NextResponse.json({ success: !!updated });
  } catch (error) {
    console.error('Error updating user script:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Allow users to delete their scripts
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userEmail = session.user.email;
    const { searchParams } = new URL(request.url);
    const scriptId = searchParams.get('id');

    if (!scriptId) {
      return NextResponse.json({ error: "Script ID is required" }, { status: 400 });
    }

    const { deleteScript } = await import('@/lib/database-new');
    const ok = await deleteScript(Number(scriptId));
    return NextResponse.json({ success: ok });
  } catch (error) {
    console.error('Error deleting user script:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
