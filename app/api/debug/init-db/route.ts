import { type NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Add seller_id columns only (skip framework conversion for now)
    await db.execute(sql`ALTER TABLE pending_scripts ADD COLUMN IF NOT EXISTS seller_id text;`)
    await db.execute(sql`ALTER TABLE approved_scripts ADD COLUMN IF NOT EXISTS seller_id text;`)
    await db.execute(sql`ALTER TABLE rejected_scripts ADD COLUMN IF NOT EXISTS seller_id text;`)

    return NextResponse.json({
      success: true,
      message: "seller_id columns added successfully",
    })
  } catch (error) {
    console.error("Error applying migration:", error)
    return NextResponse.json({
      error: "Failed to apply migration",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
