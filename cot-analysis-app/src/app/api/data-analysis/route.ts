import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get detailed breakdown by market
    const { data: marketBreakdown, error: marketError } = await supabase
      .from('cot_reports')
      .select(`
        market_id,
        market:markets(symbol, name),
        report_date
      `)
      .order('market_id')
      .order('report_date', { ascending: false })

    if (marketError) throw marketError

    // Process the data to get statistics per market
    const marketStats = marketBreakdown?.reduce((acc, record) => {
      const marketId = record.market_id
      const symbol = record.market?.symbol || 'Unknown'
      const name = record.market?.name || 'Unknown'
      
      if (!acc[marketId]) {
        acc[marketId] = {
          marketId,
          symbol,
          name,
          recordCount: 0,
          latestDate: null,
          oldestDate: null,
          dates: []
        }
      }
      
      acc[marketId].recordCount++
      acc[marketId].dates.push(record.report_date)
      
      if (!acc[marketId].latestDate || record.report_date > acc[marketId].latestDate) {
        acc[marketId].latestDate = record.report_date
      }
      
      if (!acc[marketId].oldestDate || record.report_date < acc[marketId].oldestDate) {
        acc[marketId].oldestDate = record.report_date
      }
      
      return acc
    }, {} as any) || {}

    // Sort dates and calculate coverage
    Object.keys(marketStats).forEach(marketId => {
      const stats = marketStats[marketId]
      stats.dates.sort()
      
      // Calculate date range in weeks
      if (stats.latestDate && stats.oldestDate) {
        const latest = new Date(stats.latestDate)
        const oldest = new Date(stats.oldestDate)
        const diffTime = Math.abs(latest.getTime() - oldest.getTime())
        const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
        stats.weeksCovered = diffWeeks
        stats.coverage = `${stats.recordCount}/${diffWeeks} weeks (${Math.round(stats.recordCount/diffWeeks*100)}%)`
      }
      
      // Remove the dates array from response (too large)
      delete stats.dates
    })

    // Get overall totals
    const { data: totalStats, error: totalError } = await supabase
      .from('cot_reports')
      .select('report_date, market_id')
      .order('report_date', { ascending: false })

    if (totalError) throw totalError

    const uniqueMarkets = new Set(totalStats?.map(r => r.market_id))
    const totalRecords = totalStats?.length || 0
    const latestDate = totalRecords > 0 ? totalStats[0].report_date : null
    const oldestDate = totalRecords > 0 ? totalStats[totalRecords - 1].report_date : null

    // Calculate overall time span
    let overallWeeks = 0
    if (latestDate && oldestDate) {
      const latest = new Date(latestDate)
      const oldest = new Date(oldestDate)
      const diffTime = Math.abs(latest.getTime() - oldest.getTime())
      overallWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRecords,
        uniqueMarkets: uniqueMarkets.size,
        latestDate,
        oldestDate,
        overallWeeks,
        avgRecordsPerMarket: Math.round(totalRecords / uniqueMarkets.size)
      },
      marketBreakdown: Object.values(marketStats).sort((a: any, b: any) => b.recordCount - a.recordCount),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Data analysis error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to analyze data',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}