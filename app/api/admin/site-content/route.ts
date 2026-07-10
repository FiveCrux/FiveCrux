import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { hasAnyRole } from "@/lib/database-new"
import { DEFAULT_HOME_CONTENT, getHomeContent, saveHomeContent } from "@/lib/site-content"

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const user = session.user as any
  if (!hasAnyRole(user.roles, ["founder", "admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const key = new URL(request.url).searchParams.get("key") || "home"
  if (key !== "home") {
    return NextResponse.json({ error: "Unknown content key" }, { status: 400 })
  }

  const content = await getHomeContent()
  return NextResponse.json({ content })
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const user = session.user as any
  if (!hasAnyRole(user.roles, ["founder", "admin"])) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const key = body?.key || "home"
  if (key !== "home" || !body?.content || typeof body.content !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 })
  }

  // Shallow-shape-check against the default so a malformed save can't wipe a
  // section — missing top-level sections just fall back to defaults.
  const merged = {
    heroPromo: { ...DEFAULT_HOME_CONTENT.heroPromo, ...body.content.heroPromo },
    whyChooseUs: { ...DEFAULT_HOME_CONTENT.whyChooseUs, ...body.content.whyChooseUs },
    ecosystem: { ...DEFAULT_HOME_CONTENT.ecosystem, ...body.content.ecosystem },
    faq: { ...DEFAULT_HOME_CONTENT.faq, ...body.content.faq },
  }

  await saveHomeContent(merged)
  return NextResponse.json({ ok: true, content: merged })
}
