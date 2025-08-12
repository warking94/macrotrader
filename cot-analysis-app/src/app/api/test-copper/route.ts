import { NextResponse } from 'next/server'
import { cftcApi } from '@/lib/cftc-api'

export async function GET() {
  // Common copper CFTC codes to test
  const copperCodes = [
    '085691', // Original code we tried
    '084691', // From web search
    '067651', // Alternative copper code
    '085678', // High grade copper
    '085691', // Standard copper
    '086651', // Copper futures
    '132741', // CMX copper
    '074691'  // Another variation
  ]

  const results = []

  for (const code of copperCodes) {
    try {
      console.log(`Testing CFTC code: ${code}`)
      const testData = await cftcApi.fetchCOTData(code, 1)
      
      if (testData.length > 0) {
        results.push({
          code,
          success: true,
          latestDate: testData[0].reportDate,
          openInterest: testData[0].openInterest,
          sample: testData[0]
        })
      } else {
        results.push({
          code,
          success: false,
          error: 'No data returned'
        })
      }
    } catch (error) {
      results.push({
        code,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }

    // Rate limiting between tests
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return NextResponse.json({
    message: 'Copper CFTC code testing completed',
    results,
    workingCodes: results.filter(r => r.success),
    timestamp: new Date().toISOString()
  })
}