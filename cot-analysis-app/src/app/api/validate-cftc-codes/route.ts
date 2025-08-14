import { NextResponse } from 'next/server'
import { cftcApi } from '@/lib/cftc-api'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get all markets with their CFTC codes
    const { data: markets, error } = await supabase
      .from('markets')
      .select('id, symbol, cftc_contract_market_code, cftc_market_name')
      .not('cftc_contract_market_code', 'is', null)
      .order('symbol')

    if (error) throw error

    if (!markets || markets.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No markets with CFTC codes found'
      }, { status: 404 })
    }

    const validationResults = []
    const summary = {
      totalTested: 0,
      successful: 0,
      failed: 0,
      withHistoricalData: 0,
      tier1Candidates: 0 // Markets with 900+ weeks potential
    }

    console.log(`Testing ${markets.length} CFTC codes...`)

    // Test each market's CFTC code
    for (const market of markets) {
      const result = {
        marketId: market.id,
        symbol: market.symbol,
        cftcCode: market.cftc_contract_market_code,
        cftcMarketName: market.cftc_market_name,
        success: false,
        dataFound: false,
        recordCount: 0,
        dateRange: null as any,
        tier1Potential: false,
        errors: [] as string[]
      }

      try {
        console.log(`Testing ${market.symbol} (${market.cftc_contract_market_code})...`)
        
        // Test with small sample first (1 week)
        const sampleData = await cftcApi.fetchCOTData(market.cftc_contract_market_code, 1)
        
        if (sampleData.length > 0) {
          result.success = true
          result.dataFound = true
          
          // Test larger dataset to assess historical coverage
          console.log(`✅ ${market.symbol} returns data, testing historical coverage...`)
          const historicalData = await cftcApi.fetchCOTData(market.cftc_contract_market_code, 1000)
          
          result.recordCount = historicalData.length
          
          if (historicalData.length > 0) {
            result.dateRange = {
              latest: historicalData[0].reportDate,
              oldest: historicalData[historicalData.length - 1].reportDate,
              yearsOfData: Math.round(
                (new Date(historicalData[0].reportDate).getTime() - 
                 new Date(historicalData[historicalData.length - 1].reportDate).getTime()) 
                / (1000 * 60 * 60 * 24 * 365.25) * 10
              ) / 10
            }
            
            // Check if it's a Tier 1 candidate (900+ weeks ≈ 17+ years)
            result.tier1Potential = historicalData.length >= 900
            
            if (result.tier1Potential) {
              summary.tier1Candidates++
            }
            
            summary.withHistoricalData++
          }
          
          summary.successful++
          console.log(`✅ ${market.symbol}: ${result.recordCount} records, ${result.dateRange?.yearsOfData || 0} years`)
          
        } else {
          result.errors.push('No data returned from CFTC API')
          console.log(`❌ ${market.symbol}: No data returned`)
        }
        
        // Rate limiting between API calls
        await new Promise(resolve => setTimeout(resolve, 300))
        
      } catch (error) {
        result.errors.push(error instanceof Error ? error.message : 'Unknown error')
        summary.failed++
        console.error(`❌ ${market.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
      
      validationResults.push(result)
      summary.totalTested++
    }

    // Identify problematic markets that need historical contract research
    const problematicMarkets = validationResults.filter(r => 
      !r.success || !r.tier1Potential
    )

    const recommendations = []
    
    if (problematicMarkets.length > 0) {
      recommendations.push(`${problematicMarkets.length} markets need historical contract research`)
    }
    
    if (summary.tier1Candidates < 10) {
      recommendations.push(`Only ${summary.tier1Candidates}/10 markets are Tier 1 candidates`)
    }

    return NextResponse.json({
      success: summary.failed === 0,
      message: `CFTC code validation completed: ${summary.successful} successful, ${summary.failed} failed`,
      validationResults,
      summary,
      problematicMarkets: problematicMarkets.map(m => ({
        symbol: m.symbol,
        cftcCode: m.cftcCode,
        issues: [
          !m.success && 'Code returns no data',
          m.success && !m.tier1Potential && 'Insufficient historical coverage',
          m.recordCount < 100 && 'Very limited data'
        ].filter(Boolean)
      })),
      recommendations,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error validating CFTC codes:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to validate CFTC codes',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}