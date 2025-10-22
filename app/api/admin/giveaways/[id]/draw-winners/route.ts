import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { db } from '@/lib/db/client'
import { approvedGiveaways, giveawayEntries, giveawayPrizes } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { announceGiveawayWinners } from '@/lib/discord'

function hasAnyRole(userRoles: string[] | undefined, allowedRoles: string[]): boolean {
  if (!Array.isArray(userRoles)) return false
  return userRoles.some((r) => allowedRoles.includes(r))
}

function shuffleInPlace<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

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
    if (!hasAnyRole(user.roles, ['founder', 'admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const giveawayId = Number(id)
    if (!Number.isFinite(giveawayId)) {
      return NextResponse.json({ error: 'Invalid giveaway id' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({})) as {
      announce?: boolean
      overwriteExisting?: boolean
    }
    const announce = body.announce !== false
    const overwriteExisting = body.overwriteExisting === true

    // Load giveaway
    const giveawayRows = await db
      .select()
      .from(approvedGiveaways)
      .where(eq(approvedGiveaways.id, giveawayId))
      .limit(1)

    if (giveawayRows.length === 0) {
      return NextResponse.json({ error: 'Giveaway not found' }, { status: 404 })
    }
    const giveaway = giveawayRows[0]

    // Load prizes (ordered by position)
    const prizes = await db
      .select()
      .from(giveawayPrizes)
      .where(eq(giveawayPrizes.giveawayId, giveawayId))
      .orderBy(asc(giveawayPrizes.position))

    if (prizes.length === 0) {
      return NextResponse.json({ error: 'No prizes configured for this giveaway' }, { status: 400 })
    }

    // Load entries (active)
    const entries = await db
      .select()
      .from(giveawayEntries)
      .where(
        and(
          eq(giveawayEntries.giveawayId, giveawayId),
          eq(giveawayEntries.status, 'active'),
        ),
      )

    if (entries.length === 0) {
      return NextResponse.json({ error: 'No entries found for this giveaway' }, { status: 400 })
    }

    // Rank by points desc; for ties, random order within the tie group
    // Group entries by points
    const pointsToEntries = new Map<number, typeof entries>()
    for (const e of entries) {
      const p = e.pointsEarned ?? 0
      const arr = pointsToEntries.get(p) ?? []
      arr.push(e)
      pointsToEntries.set(p, arr)
    }

    const sortedPoints = Array.from(pointsToEntries.keys()).sort((a, b) => b - a)
    const ranked: typeof entries = []
    for (const pts of sortedPoints) {
      const tieGroup = pointsToEntries.get(pts) ?? []
      shuffleInPlace(tieGroup)
      ranked.push(...tieGroup)
    }

    // Assign winners for each prize position, ensuring unique winners
    const assignedUserIds = new Set<string>()
    const winnersForPrizes: Array<{
      prizeId: number
      position: number
      userId: string
      userName: string | null
      userEmail: string | null
      prizeName: string
      prizeValue: string
    }> = []

    for (const prize of prizes) {
      if (!overwriteExisting && (prize as any).winnerName) {
        // Skip if already has a winner and not overwriting
        continue
      }

      const winner = ranked.find((e) => !assignedUserIds.has(e.userId))
      if (!winner) break
      assignedUserIds.add(winner.userId)

      winnersForPrizes.push({
        prizeId: prize.id,
        position: prize.position,
        userId: winner.userId,
        userName: winner.userName ?? null,
        userEmail: winner.userEmail ?? null,
        prizeName: prize.name,
        prizeValue: prize.value,
      })
    }

    if (winnersForPrizes.length === 0) {
      return NextResponse.json({ error: 'No eligible winners could be assigned' }, { status: 400 })
    }

    // Persist winners to prizes
    for (const w of winnersForPrizes) {
      await db
        .update(giveawayPrizes)
        .set({
          winnerName: w.userName ?? 'Unknown',
          winnerEmail: w.userEmail ?? '',
          claimed: false,
        })
        .where(eq(giveawayPrizes.id, w.prizeId))
    }

    // Announce to Discord if configured
    if (announce && giveaway.autoAnnounce) {
      await announceGiveawayWinners(
        { id: giveaway.id, title: giveaway.title, coverImage: giveaway.coverImage ?? null },
        winnersForPrizes.map((w) => ({
          position: w.position,
          userName: w.userName ?? 'Unknown',
          userId: w.userId,
          prizeName: w.prizeName,
          prizeValue: w.prizeValue,
        })),
      )
    }

    return NextResponse.json({
      success: true,
      winners: winnersForPrizes.map((w) => ({
        position: w.position,
        userId: w.userId,
        userName: w.userName,
        userEmail: w.userEmail,
        prizeName: w.prizeName,
        prizeValue: w.prizeValue,
      })),
      announced: Boolean(announce && giveaway.autoAnnounce),
    })
  } catch (error) {
    console.error('Error drawing winners:', error)
    return NextResponse.json({ error: 'Failed to draw winners' }, { status: 500 })
  }
}


