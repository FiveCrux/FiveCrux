import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { db } from '@/lib/db/client'
import { approvedGiveaways } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { drawWinnersForGiveaway } from '@/lib/giveaway-winners'

function hasAnyRole(userRoles: string[] | undefined, allowedRoles: string[]): boolean {
  if (!Array.isArray(userRoles)) return false
  return userRoles.some((r) => allowedRoles.includes(r))
}

// Creator-facing "Draw Winners" — no automatic/scheduled trigger exists
// anymore; a giveaway's own creator explicitly presses this once it has
// ended. Admins/founders may also use it (e.g. to help a creator).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = session.user as any

    const { id } = await params
    const giveawayId = Number(id)
    if (!Number.isFinite(giveawayId)) {
      return NextResponse.json({ error: 'Invalid giveaway id' }, { status: 400 })
    }

    const giveawayRows = await db.select().from(approvedGiveaways).where(eq(approvedGiveaways.id, giveawayId)).limit(1)
    if (giveawayRows.length === 0) {
      return NextResponse.json({ error: 'Giveaway not found' }, { status: 404 })
    }
    const giveaway = giveawayRows[0]

    const isOwner = giveaway.creatorId === user.id
    const isStaff = hasAnyRole(user.roles, ['founder', 'admin'])
    if (!isOwner && !isStaff) {
      return NextResponse.json({ error: 'Only this giveaway\'s creator can draw its winners' }, { status: 403 })
    }

    if (!giveaway.endDate || new Date(giveaway.endDate) > new Date()) {
      return NextResponse.json({ error: 'This giveaway has not ended yet' }, { status: 400 })
    }

    const result = await drawWinnersForGiveaway(giveawayId, { announce: true, overwriteExisting: false })
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    return NextResponse.json({ success: true, winners: result.winners, announced: result.announced })
  } catch (error) {
    console.error('Error drawing winners:', error)
    return NextResponse.json({ error: 'Failed to draw winners' }, { status: 500 })
  }
}
