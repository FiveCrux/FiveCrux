import { NextRequest, NextResponse } from "next/server";

import { getCategories } from "@/lib/database-new";

// Public category list — the single source for home chips, the /scripts filter,
// the submit-form dropdown, and category pages.
//   ?home=true        → only categories flagged show_on_home (home chips)
//   ?appliesTo=props  → categories for props (incl. 'both'); default scripts+both
export const revalidate = 60;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const home = searchParams.get("home") === "true";
    const at = searchParams.get("appliesTo");
    const appliesTo = at === "props" ? "props" : at === "scripts" ? "scripts" : undefined;
    const cats = await getCategories({ home, appliesTo });
    return NextResponse.json(
      { categories: cats },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch (e) {
    console.error("GET /api/categories error:", e);
    return NextResponse.json({ categories: [] }, { status: 200 });
  }
}
