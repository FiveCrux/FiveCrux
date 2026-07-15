import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserFeaturedScripts, createFeaturedScript, deleteFeaturedScript, getFeaturedScriptById, getFeaturedScriptSlotByUniqueId, isFeaturedSlotUniqueIdInUse } from '@/lib/database-new';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');

    const userId = (session.user as any).id;
    console.log("User featured scripts API - User:", { id: userId, limit });

    const featuredScripts = await getUserFeaturedScripts(userId, limit);

    console.log('User featured scripts API - Returning:', { total: featuredScripts.length });
    return NextResponse.json({ 
      featuredScripts,
      total: featuredScripts.length
    });
  } catch (error) {
    console.error('Error fetching user featured scripts:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Fill a featured slot the user actually purchased with a custom banner
// (title/description/category/link/image). Slot ownership + not-already-in-use
// are enforced server-side; the paid window (dates) comes from the slot itself,
// never the client.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();
    const slotUniqueId = typeof body.slot_unique_id === "string" ? body.slot_unique_id : null;
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const category = String(body.category || "").trim();
    const link_url = String(body.link_url || "").trim();
    const image_url = String(body.image_url || "").trim();

    if (!slotUniqueId) {
      return NextResponse.json({ error: "slot_unique_id is required" }, { status: 400 });
    }
    if (!title || !description || !link_url || !image_url) {
      return NextResponse.json({ error: "title, description, link and image are required" }, { status: 400 });
    }

    // The slot must be a real, currently-active slot this user actually bought.
    const slot = await getFeaturedScriptSlotByUniqueId(slotUniqueId);
    if (!slot || slot.featuredUserId !== userId || slot.featuredSlotStatus !== "active") {
      return NextResponse.json({ error: "That slot doesn't belong to you or isn't active" }, { status: 403 });
    }
    // The slot must not already be filled by another active featured entry.
    if (await isFeaturedSlotUniqueIdInUse(slotUniqueId)) {
      return NextResponse.json({ error: "That slot is already in use" }, { status: 409 });
    }

    // start/end dates come from the slot itself (see createFeaturedScript),
    // never from the client — a purchased slot's paid window is authoritative.
    const featuredScriptId = await createFeaturedScript({
      slot_unique_id: slotUniqueId,
      created_by: userId,
      title,
      description,
      category,
      link_url,
      image_url,
    } as any);

    return NextResponse.json({ success: true, featuredScriptId });
  } catch (error) {
    console.error('Error creating user featured script:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH removed (SECURITY): let any owner of a featured_scripts row freely set
// an arbitrary featuredEndDate, extending their paid placement indefinitely
// for free. No legitimate frontend caller used this (only GET/POST/DELETE are
// called from the profile UI).

// Allow users to delete their featured scripts
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const featuredScriptId = searchParams.get('id');
    
    if (!featuredScriptId) {
      return NextResponse.json({ error: 'featuredScriptId is required' }, { status: 400 });
    }

    const featuredScript = await getFeaturedScriptById(Number(featuredScriptId));
    
    if (!featuredScript || featuredScript.featuredCreatedBy !== (session.user as any).id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const ok = await deleteFeaturedScript(Number(featuredScriptId));
    
    return NextResponse.json({ success: ok });
  } catch (error) {
    console.error('Error deleting user featured script:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

