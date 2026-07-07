import { NextResponse } from "next/server";
import { incrementScriptViewCount } from "@/lib/database-new";

// Fire-and-forget view ping — the script detail page calls this once on mount to
// count a detail-page view (creator analytics). Public, no body.
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await incrementScriptViewCount(Number(id));
  return NextResponse.json({ ok: true });
}
