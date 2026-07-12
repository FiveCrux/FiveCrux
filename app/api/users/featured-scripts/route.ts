import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserFeaturedScripts, createFeaturedScript, deleteFeaturedScript, getFeaturedScriptById, getFeaturedScriptSlotByUniqueId, isFeaturedSlotUniqueIdInUse, getScriptById } from '@/lib/database-new';

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

// Allow users to feature one of THEIR OWN approved scripts into a slot THEY
// actually purchased. Previously this trusted script_id/slot_unique_id/dates
// straight from the client with no ownership or slot-existence check at all —
// any logged-in user could feature ANY script (including someone else's) for
// free, with or without a real slot, by just POSTing arbitrary ids.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as any).id;

    const body = await request.json();
    const scriptId = Number(body.script_id);
    const slotUniqueId = typeof body.slot_unique_id === "string" ? body.slot_unique_id : null;

    if (!scriptId || !Number.isFinite(scriptId)) {
      return NextResponse.json({ error: "script_id is required" }, { status: 400 });
    }
    if (!slotUniqueId) {
      return NextResponse.json({ error: "slot_unique_id is required" }, { status: 400 });
    }

    // The slot must be a real, currently-active slot this user actually bought.
    const slot = await getFeaturedScriptSlotByUniqueId(slotUniqueId);
    if (!slot || slot.featuredUserId !== userId || slot.featuredSlotStatus !== "active") {
      return NextResponse.json({ error: "That slot doesn't belong to you or isn't active" }, { status: 403 });
    }
    // The slot must not already be filled by another active featured script.
    if (await isFeaturedSlotUniqueIdInUse(slotUniqueId)) {
      return NextResponse.json({ error: "That slot is already in use" }, { status: 409 });
    }

    // The script must be this user's OWN approved script — never someone else's.
    const script = await getScriptById(scriptId);
    if (!script || (script as any).sellerId !== userId || (script as any).status !== "approved") {
      return NextResponse.json({ error: "You can only feature your own approved scripts" }, { status: 403 });
    }

    // start/end dates come from the slot itself (see createFeaturedScript),
    // never from the client — a purchased slot's paid window is authoritative.
    const featuredScriptId = await createFeaturedScript({
      scriptId,
      slot_unique_id: slotUniqueId,
      created_by: userId,
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

