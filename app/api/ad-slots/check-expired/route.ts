import { NextResponse } from 'next/server'
import { checkAndDeactivateExpiredSlots, checkAndDeactivateExpiredFeaturedScriptSlots } from '@/lib/database-new'

export async function GET() {
  try {
    // Check both ad slots and featured script slots
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
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error checking expired slots:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to check expired slots',
      success: false
    }, { status: 500 })
  }
}

