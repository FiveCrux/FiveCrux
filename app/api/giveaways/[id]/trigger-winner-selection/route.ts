import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { approvedGiveaways, giveawayPrizes, giveawayEntries } from '@/lib/db/schema'
import { eq, and, asc } from 'drizzle-orm'
import { announceGiveawayWinners } from '@/lib/discord'

function shuffleInPlace<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const giveawayId = Number(id)

    if (!Number.isFinite(giveawayId)) {
      return NextResponse.json({ error: 'Invalid giveaway ID' }, { status: 400 })
    }

    // Get giveaway
    const giveawayRows = await db
      .select()
      .from(approvedGiveaways)
      .where(eq(approvedGiveaways.id, giveawayId))
      .limit(1)

    if (giveawayRows.length === 0) {
      return NextResponse.json({ error: 'Giveaway not found' }, { status: 404 })
    }

    const giveaway = giveawayRows[0]

    // Check if giveaway has ended
    const now = new Date()
    const endDate = new Date(giveaway.endDate)
    if (endDate.getTime() > now.getTime()) {
      return NextResponse.json({ error: 'Giveaway has not ended yet' }, { status: 400 })
    }

    // Check if auto-announce is enabled
    if (!giveaway.autoAnnounce) {
      return NextResponse.json({ error: 'Auto-announce not enabled for this giveaway' }, { status: 400 })
    }

    // Get prizes
    const prizes = await db
      .select()
      .from(giveawayPrizes)
      .where(eq(giveawayPrizes.giveawayId, giveawayId))
      .orderBy(asc(giveawayPrizes.position))

    if (prizes.length === 0) {
      return NextResponse.json({ error: 'No prizes configured' }, { status: 400 })
    }

    // Check if winners already assigned
    const hasWinners = prizes.some((p) => p.winnerName)
    if (hasWinners) {
      return NextResponse.json({ 
        message: 'Winners already selected',
        alreadyProcessed: true 
      }, { status: 200 })
    }

    // Get active entries
    const entries = await db
      .select()
      .from(giveawayEntries)
      .where(
        and(
          eq(giveawayEntries.giveawayId, giveawayId),
          eq(giveawayEntries.status, 'active')
        )
      )

    if (entries.length === 0) {
      return NextResponse.json({ error: 'No entries found' }, { status: 400 })
    }

    // Rank entries by points (descending), shuffle within tie groups
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

    // Assign winners
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

      // Update prize with winner
      await db
        .update(giveawayPrizes)
        .set({
          winnerName: winner.userName ?? 'Unknown',
          winnerEmail: winner.userEmail ?? '',
          claimed: false,
        })
        .where(eq(giveawayPrizes.id, prize.id))
    }

    if (winnersForPrizes.length === 0) {
      return NextResponse.json({ error: 'No eligible winners could be assigned' }, { status: 400 })
    }

    // Announce to Discord
    const discordResult = await announceGiveawayWinners(
      { id: giveaway.id, title: giveaway.title, coverImage: giveaway.coverImage ?? null },
      winnersForPrizes.map((w) => ({
        position: w.position,
        userName: w.userName ?? 'Unknown',
        userId: w.userId,
        prizeName: w.prizeName,
        prizeValue: w.prizeValue,
      }))
    )

    // Update giveaway status to 'ended'
    await db
      .update(approvedGiveaways)
      .set({ status: 'ended' })
      .where(eq(approvedGiveaways.id, giveawayId))

    return NextResponse.json({
      success: true,
      winners: winnersForPrizes.map((w) => ({
        position: w.position,
        userName: w.userName,
        prizeName: w.prizeName,
        prizeValue: w.prizeValue,
      })),
      discordAnnounced: discordResult.success,
    })
  } catch (error) {
    console.error('Error selecting winners:', error)
    return NextResponse.json(
      { error: 'Failed to select winners', details: String(error) },
      { status: 500 }
    )
  }
}

