import { NextRequest, NextResponse } from "next/server"
import { getScripts } from "@/lib/database-new"

export async function GET(request: NextRequest) {
  try {
    // Get all approved scripts
    const scripts = await getScripts({ limit: 50 })
    
    // Group by framework
    const frameworkGroups = scripts.reduce((acc: any, script: any) => {
      const framework = script.framework || 'No Framework'
      if (!acc[framework]) {
        acc[framework] = []
      }
      acc[framework].push({
        id: script.id,
        title: script.title,
        framework: script.framework
      })
      return acc
    }, {})
    
    // Get unique frameworks
    const uniqueFrameworks = [...new Set(scripts.map((s: any) => s.framework).filter(Boolean))]
    
    return NextResponse.json({ 
      success: true,
      totalScripts: scripts.length,
      uniqueFrameworks,
      frameworkGroups,
      sampleScripts: scripts.slice(0, 5).map((s: any) => ({
        id: s.id,
        title: s.title,
        framework: s.framework,
        category: s.category
      }))
    })
  } catch (error) {
    console.error("Error testing framework data:", error)
    return NextResponse.json({ 
      error: "Failed to test framework data",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}




