import { NextRequest, NextResponse } from 'next/server'
import { priceDataCollector } from '@/lib/price-data-collector'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const marketId = searchParams.get('marketId')
    const outputSize = searchParams.get('outputSize') || 'compact'
    const allMarkets = searchParams.get('all') === 'true'

    if (allMarkets) {
      // Collect for all markets with rate limiting
      const results = await priceDataCollector.collectForAllMarkets(outputSize as 'compact' | 'full')
      
      return NextResponse.json({
        success: true,
        message: `Price data collection for all markets completed`,
        data: results,
        timestamp: new Date().toISOString()
      })
    } else if (marketId) {
      // Get market symbol first
      const { data: market } = await supabase
        .from('markets')
        .select('symbol')
        .eq('id', parseInt(marketId))
        .single()
      
      if (!market) {
        return NextResponse.json({
          success: false,
          message: `Market with ID ${marketId} not found`
        }, { status: 404 })
      }
      
      // Collect for specific market
      const result = await priceDataCollector.collectForMarket(parseInt(marketId), market.symbol, outputSize as 'compact' | 'full')
      
      return NextResponse.json({
        success: true,
        message: `Price data collection for market ${marketId} (${market.symbol}) completed`,
        data: result,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Either marketId or all=true parameter required'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Price collection API error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Price collection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}