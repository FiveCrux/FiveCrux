import { NextResponse, type NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/auth'
import { checkAndDeactivateExpiredSlots, checkAndDeactivateExpiredFeaturedScriptSlots } from '@/lib/database-new'

/**
 * Housekeeping: deactivate ad slots, featured slots and ads whose time is up.
 *
 * This WRITES. It had no authentication at all, and the hook in the root layout
 * called it from every visitor's browser — so any anonymous visitor, crawler or
 * script could drive a site-wide deactivation sweep, as often as they liked,
 * just by requesting a URL.
 *
 * Now it needs either the cron secret or a signed-in account. It stays safe to
 * call repeatedly — it only ever deactivates things that have genuinely
 * expired, and expired items are already filtered at read time, so this is
 * tidying the status column rather than something the site depends on.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function isAuthorized(request: NextRequest): Promise<boolean> {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') === `Bearer ${secret}`) return true
  const session = await getServerSession(authOptions)
  return Boolean(session?.user)
}

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const [adSlotsResult, featuredSlotsResult] = await Promise.all([
      checkAndDeactivateExpiredSlots(),
      checkAndDeactivateExpiredFeaturedScriptSlots()
    ])

    const totalChecked = adSlotsResult.checked + featuredSlotsResult.checked
    const totalSlotsDeactivated = adSlotsResult.deactivated + featuredSlotsResult.deactivated

    return NextResponse.json({
      success: true,
      checked: totalChecked,
      slotsDeactivated: totalSlotsDeactivated,
      adsDeactivated: adSlotsResult.adsDeactivated,
      featuredScriptsDeactivated: featuredSlotsResult.featuredScriptsDeactivated,
      scriptsUpdated: featuredSlotsResult.scriptsUpdated,
      message: `Checked ${totalChecked} slot(s), deactivated ${totalSlotsDeactivated} slot(s), ${adSlotsResult.adsDeactivated} ad(s), ${featuredSlotsResult.featuredScriptsDeactivated} featured script(s), and updated ${featuredSlotsResult.scriptsUpdated} script(s) featured status`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[check-expired] failed:', error)
    return NextResponse.json({ success: false, error: 'Check failed' }, { status: 500 })
  }
}
