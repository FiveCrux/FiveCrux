import { NextResponse } from "next/server";

import { getFrameworks } from "@/lib/database-new";

// Public framework list — the single source for the /scripts + props filter
// facets and the submit-form framework picker.
export const revalidate = 60;

export async function GET() {
  try {
    const frameworks = await getFrameworks();
    return NextResponse.json(
      { frameworks },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (e) {
    console.error("GET /api/frameworks error:", e);
    return NextResponse.json({ frameworks: [] }, { status: 200 });
  }
}
