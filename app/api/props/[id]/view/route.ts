import { NextResponse } from "next/server";
import { incrementPropViewCount } from "@/lib/database-new";

// Fire-and-forget view ping — the prop detail page calls this once on mount to
// count a detail-page view (creator analytics). Public, no body.
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await incrementPropViewCount(String(id));
  return NextResponse.json({ ok: true });
}
