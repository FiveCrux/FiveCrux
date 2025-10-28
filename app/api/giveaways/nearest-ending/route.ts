import { NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { approvedGiveaways } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET() {
  try {
    const now = new Date()
    
    // Find all active giveaways with autoAnnounce
    const allGiveaways = await db
      .select({
        id: approvedGiveaways.id,
        title: approvedGiveaways.title,
        endDate: approvedGiveaways.endDate,
      })
      .from(approvedGiveaways)
      .where(
        and(
          eq(approvedGiveaways.status, 'active'),
          eq(approvedGiveaways.autoAnnounce, true)
        )
      )
    
    // Filter for not-yet-ended giveaways and find the nearest one
    const futureGiveaways = allGiveaways
      .filter(g => new Date(g.endDate) > now)
      .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())

    if (futureGiveaways.length === 0) {
      return NextResponse.json({ 
        hasGiveaways: false,
        message: 'No active giveaways ending soon'
      })
    }

    const giveaway = futureGiveaways[0]
    const endTime = new Date(giveaway.endDate).getTime()
    const timeLeft = endTime - Date.now()

    return NextResponse.json({
      hasGiveaways: true,
      giveawayId: giveaway.id,
      title: giveaway.title,
      endTime: giveaway.endDate,
      timeLeft: Math.max(0, timeLeft),
      endsIn: formatTimeLeft(timeLeft)
    })
  } catch (error) {
    console.error('Error fetching nearest ending giveaway:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch nearest ending giveaway',
      hasGiveaways: false 
    }, { status: 500 })
  }
}

function formatTimeLeft(ms: number): string {
  if (ms < 0) return 'ended'
  
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m`
  return `${seconds}s`
}

