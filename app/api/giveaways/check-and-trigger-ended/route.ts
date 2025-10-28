import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db/client'
import { approvedGiveaways, giveawayPrizes } from '@/lib/db/schema'
import { and, lt, eq } from 'drizzle-orm'

// For GitHub Actions cron, verify secret
const CRON_SECRET = process.env.CRON_SECRET

export async function GET(request: NextRequest) {
  try {
    // If called from GitHub Actions, verify authorization
    const authHeader = request.headers.get('authorization')
    const isCronCall = authHeader?.startsWith('Bearer ')
    
    if (isCronCall && authHeader) {
      const token = authHeader.replace('Bearer ', '')
      if (token !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const now = new Date()
    
    // Find ended giveaways without winners
    const endedGiveaways = await db
      .select({
        id: approvedGiveaways.id,
        title: approvedGiveaways.title,
        endDate: approvedGiveaways.endDate,
      })
      .from(approvedGiveaways)
      .where(
        and(
          lt(approvedGiveaways.endDate, now.toISOString()),
          eq(approvedGiveaways.status, 'active'),
          eq(approvedGiveaways.autoAnnounce, true)
        )
      )
      .limit(5) // Process up to 5 at once

    if (endedGiveaways.length === 0) {
      return NextResponse.json({ 
        needsProcessing: false,
        message: 'No ended giveaways found',
        checked: 0
      })
    }

    // Check each giveaway to see if it needs winner selection
    const processed = []
    
    for (const giveaway of endedGiveaways) {
      try {
        // Check if already has winners
        const prizes = await db
          .select()
          .from(giveawayPrizes)
          .where(eq(giveawayPrizes.giveawayId, giveaway.id))
          .limit(1)

        // Skip if no prizes or already has winners
        if (prizes.length === 0 || prizes[0].winnerName) {
          continue
        }

        // Trigger winner selection using existing endpoint
        const baseUrl = process.env.NEXTAUTH_URL || 
                       (typeof window !== 'undefined' ? window.location.origin : '')
        
        if (!baseUrl) {
          console.error('NEXTAUTH_URL not configured')
          continue
        }

        const response = await fetch(
          `${baseUrl}/api/giveaways/${giveaway.id}/trigger-winner-selection`,
          { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          }
        )

        if (response.ok) {
          const data = await response.json()
          processed.push({
            giveawayId: giveaway.id,
            title: giveaway.title,
            success: true,
            winnersCount: data.winners?.length || 0,
            discordAnnounced: data.discordAnnounced
          })
        } else {
          const errorData = await response.json().catch(() => ({}))
          processed.push({
            giveawayId: giveaway.id,
            title: giveaway.title,
            success: false,
            error: errorData.error || `HTTP ${response.status}`
          })
        }
      } catch (error) {
        console.error(`Failed to process giveaway ${giveaway.id}:`, error)
        processed.push({
          giveawayId: giveaway.id,
          title: giveaway.title,
          success: false,
          error: String(error)
        })
      }
    }

    return NextResponse.json({
      needsProcessing: true,
      found: endedGiveaways.length,
      processed: processed.length,
      successful: processed.filter(p => p.success).length,
      results: processed,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Check and trigger error:', error)
    return NextResponse.json({ 
      error: String(error),
      needsProcessing: false 
    }, { status: 500 })
  }
}

