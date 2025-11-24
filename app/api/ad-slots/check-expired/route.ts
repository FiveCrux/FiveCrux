import { NextResponse } from 'next/server'
import { checkAndDeactivateExpiredSlots } from '@/lib/database-new'

export async function GET() {
  try {
    const result = await checkAndDeactivateExpiredSlots()
    
    return NextResponse.json({
      success: true,
      checked: result.checked,
      slotsDeactivated: result.deactivated,
      adsDeactivated: result.adsDeactivated,
      message: `Checked ${result.checked} slot(s), deactivated ${result.deactivated} slot(s) and ${result.adsDeactivated} ad(s)`,
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

