import { NextResponse } from "next/server";

import { getFrameworks } from "@/lib/database-new";

// Public framework list — the single source for the /scripts + props filter
// facets and the submit-form framework picker.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const frameworks = await getFrameworks();
    return NextResponse.json(
      { frameworks },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error("GET /api/frameworks error:", e);
    return NextResponse.json({ frameworks: [] }, { status: 200 });
  }
}
