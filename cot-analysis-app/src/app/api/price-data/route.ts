import { NextRequest, NextResponse } from 'next/server'
import { priceDataCollector } from '@/lib/price-data-collector'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || 'stats'
    const marketId = searchParams.get('marketId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '30')

    switch (action) {
      case 'stats':
        // Return price data statistics
        const stats = await priceDataCollector.getPriceDataStats()
        return NextResponse.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        })

      case 'latest':
        // Get latest price data for a market
        if (!marketId) {
          return NextResponse.json({
            success: false,
            message: 'marketId parameter required for latest price data'
          }, { status: 400 })
        }

        const latestData = await priceDataCollector.getLatestPriceData(parseInt(marketId), limit)
        
        return NextResponse.json({
          success: true,
          data: latestData,
          count: latestData.length,
          timestamp: new Date().toISOString()
        })

      case 'range':
        // Get price data for a specific date range
        if (!marketId || !startDate || !endDate) {
          return NextResponse.json({
            success: false,
            message: 'marketId, startDate, and endDate parameters required for range query'
          }, { status: 400 })
        }

        const rangeData = await priceDataCollector.getPriceDataInRange(
          parseInt(marketId), 
          startDate, 
          endDate
        )
        
        return NextResponse.json({
          success: true,
          data: rangeData,
          count: rangeData.length,
          dateRange: { startDate, endDate },
          timestamp: new Date().toISOString()
        })

      case 'combined':
        // Get combined COT and price data for correlation analysis
        if (!marketId || !startDate || !endDate) {
          return NextResponse.json({
            success: false,
            message: 'marketId, startDate, and endDate parameters required for combined data'
          }, { status: 400 })
        }

        const combinedData = await priceDataCollector.getCombinedCOTAndPriceData(
          parseInt(marketId),
          startDate,
          endDate
        )
        
        return NextResponse.json({
          success: true,
          data: combinedData,
          count: combinedData.length,
          dateRange: { startDate, endDate },
          message: `Combined COT and price data with ${combinedData.length} matching records`,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Use: stats, latest, range, or combined'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Price data API error:', error)
    
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
    const { action, marketSymbol, marketId, outputSize = 'compact' } = body

    switch (action) {
      case 'collect':
        if (marketSymbol && marketId) {
          // Collect for specific market
          const result = await priceDataCollector.collectForMarket(
            parseInt(marketId),
            marketSymbol,
            outputSize
          )
          
          return NextResponse.json({
            success: true,
            message: `Price data collection completed for ${marketSymbol}`,
            result,
            timestamp: new Date().toISOString()
          })
        } else {
          // Collect for all markets
          const results = await priceDataCollector.collectForAllMarkets(outputSize)
          
          // Calculate summary statistics
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
            message: `Price data collection completed: ${totalNew} new records, ${totalSkipped} skipped, ${totalErrors} errors`,
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

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action for POST request. Use: collect'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Price data POST error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}