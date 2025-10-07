import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getAds } from '@/lib/database-new';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userEmail = session.user.email;
    console.log("User ads API - User:", { id: userId, email: userEmail });

    // Fetch approved ads created by this user (createdBy == (session.user as any).id)
    const all = await getAds({ limit: 1000 });
    const mine = all.filter((a: any) => a.createdBy === (session.user as any).id);
    return NextResponse.json({ ads: mine });
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
      priority: body.priority ?? 1,
      startDate: body.start_date,
      endDate: body.end_date,
      createdBy: (session.user as any).id,
    } as any);
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

    const { updateAd, getAdById } = await import('@/lib/database-new');
    const ad = await getAdById(Number(adId));
    if (!ad || ad.createdBy !== (session.user as any).id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const updated = await updateAd(Number(adId), updateData);
    return NextResponse.json({ success: !!updated });
  } catch (error) {
    console.error('Error updating user ad:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Allow users to delete their ads
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const adId = searchParams.get('id');
    if (!adId) return NextResponse.json({ error: 'adId is required' }, { status: 400 });

    const { getAdById, deleteAd } = await import('@/lib/database-new');
    const ad = await getAdById(Number(adId));
    if (!ad || ad.createdBy !== (session.user as any).id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const ok = await deleteAd(Number(adId));
    return NextResponse.json({ success: ok });
  } catch (error) {
    console.error('Error deleting user ad:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
