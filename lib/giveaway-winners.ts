// Shared winner-selection algorithm — ranks entrants by points (ties broken
// randomly), assigns one unique winner per prize slot, and persists them.
// Used by both the admin draw-winners route and the giveaway-creator's own
// "Draw Winners" button (no automatic/scheduled trigger — always explicit).
import { db } from "@/lib/db/client"
import { approvedGiveaways, giveawayEntries, giveawayPrizes, giveawayPrizeWinners } from "@/lib/db/schema"
import { eq, and, asc, inArray } from "drizzle-orm"
import { announceGiveawayWinners } from "@/lib/discord"

function shuffleInPlace<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
}

export type DrawWinnersResult =
  | { ok: true; winners: Array<{ position: number; userId: string; userName: string | null; userEmail: string | null; prizeName: string; prizeValue: string }>; announced: boolean }
  | { ok: false; error: string; status: number }

export async function drawWinnersForGiveaway(
  giveawayId: number,
  opts: { announce?: boolean; overwriteExisting?: boolean } = {}
): Promise<DrawWinnersResult> {
  const announce = opts.announce !== false
  const overwriteExisting = opts.overwriteExisting === true

  const giveawayRows = await db.select().from(approvedGiveaways).where(eq(approvedGiveaways.id, giveawayId)).limit(1)
  if (giveawayRows.length === 0) return { ok: false, error: "Giveaway not found", status: 404 }
  const giveaway = giveawayRows[0]

  const prizes = await db.select().from(giveawayPrizes).where(eq(giveawayPrizes.giveawayId, giveawayId)).orderBy(asc(giveawayPrizes.position))
  if (prizes.length === 0) return { ok: false, error: "No prizes configured for this giveaway", status: 400 }

  const entries = await db.select().from(giveawayEntries).where(and(eq(giveawayEntries.giveawayId, giveawayId), eq(giveawayEntries.status, "active")))
  if (entries.length === 0) return { ok: false, error: "No entries found for this giveaway", status: 400 }

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

  const assignedUserIds = new Set<string>()
  const winnersForPrizes: Array<{ prizeId: number; position: number; userId: string; userName: string | null; userEmail: string | null; prizeName: string; prizeValue: string }> = []

  // When NOT overwriting, seed the assigned set with everyone who ALREADY won a
  // prize in this giveaway — otherwise a re-draw (e.g. after adding a new prize)
  // could hand a second prize to someone who already won.
  if (!overwriteExisting) {
    const prizeIds = prizes.map((p) => p.id)
    if (prizeIds.length) {
      const priorWinners = await db.select().from(giveawayPrizeWinners).where(inArray(giveawayPrizeWinners.prizeId, prizeIds))
      for (const w of priorWinners) if (w.userId) assignedUserIds.add(w.userId)
    }
  }

  for (const prize of prizes) {
    if (!overwriteExisting && (prize as any).winnerName) continue
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

  if (winnersForPrizes.length === 0) return { ok: false, error: "No eligible winners could be assigned", status: 400 }

  for (let wi = 0; wi < winnersForPrizes.length; wi++) {
    const w = winnersForPrizes[wi]
    await db.update(giveawayPrizes).set({ winnerName: w.userName ?? "Unknown", winnerEmail: w.userEmail ?? "", claimed: false }).where(eq(giveawayPrizes.id, w.prizeId))
    if (overwriteExisting) {
      await db.delete(giveawayPrizeWinners).where(eq(giveawayPrizeWinners.prizeId, w.prizeId))
    }
    await db.insert(giveawayPrizeWinners).values({
      id: Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 100000) + wi,
      prizeId: w.prizeId,
      userId: w.userId,
      userName: w.userName ?? null,
      userEmail: w.userEmail ?? null,
      claimed: false,
    })
  }

  if (announce && giveaway.autoAnnounce) {
    await announceGiveawayWinners(
      { id: giveaway.id, title: giveaway.title, coverImage: giveaway.coverImage ?? null },
      winnersForPrizes.map((w) => ({ position: w.position, userName: w.userName ?? "Unknown", userId: w.userId, prizeName: w.prizeName, prizeValue: w.prizeValue }))
    )
  }

  return {
    ok: true,
    winners: winnersForPrizes.map((w) => ({ position: w.position, userId: w.userId, userName: w.userName, userEmail: w.userEmail, prizeName: w.prizeName, prizeValue: w.prizeValue })),
    announced: Boolean(announce && giveaway.autoAnnounce),
  }
}
