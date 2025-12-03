import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { getUserFeaturedScripts, createFeaturedScript, updateFeaturedScript, deleteFeaturedScript, getFeaturedScriptById } from '@/lib/database-new';

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

// Allow users to create featured scripts
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const featuredScriptId = await createFeaturedScript({
      scriptId: body.script_id,
      slot_unique_id: body.slot_unique_id || null,
      start_date: body.start_date,
      end_date: body.end_date,
      created_by: (session.user as any).id,
    } as any);
    
    return NextResponse.json({ success: true, featuredScriptId });
  } catch (error) {
    console.error('Error creating user featured script:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Allow users to update their featured scripts
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { featuredScriptId, ...updateData } = body;
    if (!featuredScriptId) return NextResponse.json({ error: 'featuredScriptId is required' }, { status: 400 });

    const featuredScript = await getFeaturedScriptById(Number(featuredScriptId));
    if (!featuredScript || featuredScript.featuredCreatedBy !== (session.user as any).id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedFeaturedScript = await updateFeaturedScript(Number(featuredScriptId), updateData);

    return NextResponse.json({ 
      success: !!updatedFeaturedScript,
      message: "Featured script updated successfully!"
    });
  } catch (error) {
    console.error('Error updating user featured script:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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

