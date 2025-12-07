import { NextRequest, NextResponse } from 'next/server';
import { getFeaturedScriptsWithDetails } from '@/lib/database-new';

// Public API to get all featured scripts (no authentication required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active'; // Default to active
    const limit = searchParams.get('limit');

    const filters = {
      status: status || undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    console.log('Featured Scripts API - Request params:', { status, limit });

    const featuredScripts = await getFeaturedScriptsWithDetails(filters);

    console.log('Featured Scripts API - Found:', featuredScripts.length);

    return NextResponse.json({ 
      featuredScripts,
      total: featuredScripts.length
    });
  } catch (error: any) {
    console.error('Error fetching featured scripts:', error);
    
    // Handle specific database connection errors
    if (error.message?.includes('XATA_CONCURRENCY_LIMIT') || error.cause?.code === 'XATA_CONCURRENCY_LIMIT') {
      return NextResponse.json({ 
        error: "Database is temporarily overloaded. Please try again in a few seconds." 
      }, { status: 503 });
    }
    
    return NextResponse.json({ error: "Failed to fetch featured scripts" }, { status: 500 });
  }
}

