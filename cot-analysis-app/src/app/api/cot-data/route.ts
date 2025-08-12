import { NextRequest, NextResponse } from 'next/server'
import { cotCollector } from '@/lib/cot-collector'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || 'stats'
    const marketId = searchParams.get('marketId')
    const weeks = parseInt(searchParams.get('weeks') || '52')

    switch (action) {
      case 'stats':
        // Return COT data statistics
        const stats = await cotCollector.getCOTStats()
        return NextResponse.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        })

      case 'collect':
        // Collect new COT data
        if (marketId) {
          // Collect for specific market (would need market lookup)
          return NextResponse.json({
            success: false,
            message: 'Single market collection not implemented yet'
          })
        } else {
          // Collect for all markets
          const results = await cotCollector.collectForAllMarkets(weeks)
          
          // Summary statistics
          let totalNew = 0
          let totalSkipped = 0
          let totalErrors = 0
          
          Object.values(results).forEach(result => {
            totalNew += result.newRecords
            totalSkipped += result.skippedRecords
            totalErrors += result.errors.length
          })

          return NextResponse.json({
            success: true,
            message: `COT data collection completed: ${totalNew} new records, ${totalSkipped} skipped, ${totalErrors} errors`,
            summary: {
              totalNew,
              totalSkipped,
              totalErrors,
              marketsProcessed: Object.keys(results).length
            },
            details: results,
            timestamp: new Date().toISOString()
          })
        }

      case 'latest':
        // Get latest COT data for a market
        if (!marketId) {
          return NextResponse.json({
            success: false,
            message: 'marketId parameter required for latest data'
          }, { status: 400 })
        }

        const limit = parseInt(searchParams.get('limit') || '10')
        const latestData = await cotCollector.getLatestCOTData(parseInt(marketId), limit)
        
        return NextResponse.json({
          success: true,
          data: latestData,
          count: latestData.length,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Use: stats, collect, or latest'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('COT data API error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, marketId, weeks = 52 } = body

    if (action === 'collect') {
      const results = await cotCollector.collectForAllMarkets(weeks)
      
      return NextResponse.json({
        success: true,
        message: 'COT data collection initiated',
        results,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json({
      success: false,
      message: 'Invalid action for POST request'
    }, { status: 400 })

  } catch (error) {
    console.error('COT data POST error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}