import { NextRequest, NextResponse } from "next/server"
import { resolveGuildInfo } from "@/lib/discord-verify"

// Lightweight client-callable wrapper around resolveGuildInfo, so the
// giveaway create/edit form can show the server's real name + icon live, as
// the creator types the invite — same resolver the submit API uses server-side.
export async function GET(request: NextRequest) {
  const link = new URL(request.url).searchParams.get("link")
  if (!link) {
    return NextResponse.json({ error: "Missing link" }, { status: 400 })
  }
  // resolveGuildInfo does network I/O — a Discord hiccup / bad invite must not
  // 500 this public typeahead endpoint; degrade to a soft null shape.
  try {
    const info = await resolveGuildInfo(link)
    return NextResponse.json(info)
  } catch {
    return NextResponse.json({ ok: false, guild: null })
  }
}
