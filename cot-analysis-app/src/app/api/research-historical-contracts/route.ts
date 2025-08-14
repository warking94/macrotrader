import { NextResponse } from 'next/server'
import { cftcApi } from '@/lib/cftc-api'

// Alternative historical CFTC contract codes to research
const HISTORICAL_CONTRACTS = {
  'CRUDE': [
    '067411', // Current: CRUDE OIL, LIGHT SWEET-WTI (2009-2025)
    '067651', // Alternative crude oil contract
    '067401', // Historical crude oil
    '067661', // WTI crude variations
    '065501', // Early crude oil contracts
    '067311', // Legacy crude
    '133741'  // NYMEX crude oil
  ],
  'GOLD': [
    '088606', // Current: GOLD, 100 TROY OZ (2006-2008 limited)
    '088651', // Alternative gold contract
    '088601', // Historical gold
    '088661', // Gold variations  
    '086641', // COMEX gold
    '088611', // Legacy gold contracts
    '088631', // Mini gold
    '133211'  // Alternative gold code
  ],
  'NATGAS': [
    '023611', // Current: NATURAL GAS (1995-1999 old snapshot)
    '023651', // Alternative natural gas
    '023621', // Historical natgas
    '023601', // Legacy natgas
    '023661', // NYMEX natural gas
    '132521', // Alternative natgas code
    '023631'  // Henry Hub natgas
  ],
  'SILVER': [
    '084605', // Current: SILVER, 5000 TROY OZ (2006-2007 limited)
    '084651', // Alternative silver
    '084601', // Historical silver
    '084661', // Silver variations
    '084611', // Legacy silver
    '084631', // Mini silver
    '086651', // COMEX silver
    '133451'  // Alternative silver code
  ]
}

export async function GET() {
  try {
    const researchResults = []
    const summary = {
      totalCodesTestedByMarket: {} as Record<string, number>,
      workingCodesByMarket: {} as Record<string, number>,
      bestCandidatesByMarket: {} as Record<string, any>
    }

    console.log('Starting historical contract code research...')

    // Research each problematic market
    for (const [symbol, codes] of Object.entries(HISTORICAL_CONTRACTS)) {
      console.log(`\\n🔍 Researching ${symbol} historical contracts...`)
      
      const marketResults = {
        symbol,
        totalCodesTested: codes.length,
        workingCodes: [],
        bestCandidate: null as any,
        allResults: [] as any[]
      }

      let bestCoverage = 0
      let bestCode = null

      // Test each historical code
      for (const code of codes) {
        const codeResult = {
          code,
          success: false,
          recordCount: 0,
          dateRange: null as any,
          yearsOfData: 0,
          tier1Potential: false,
          error: null as string | null
        }

        try {
          console.log(`  Testing ${symbol} code: ${code}`)
          
          // Test with extended lookback (up to 1300 weeks for full historical)
          const data = await cftcApi.fetchCOTData(code, 1300)
          
          if (data.length > 0) {
            codeResult.success = true
            codeResult.recordCount = data.length
            codeResult.dateRange = {
              latest: data[0].reportDate,
              oldest: data[data.length - 1].reportDate
            }
            
            // Calculate years of coverage
            const yearsSpan = (new Date(data[0].reportDate).getTime() - 
                             new Date(data[data.length - 1].reportDate).getTime()) 
                             / (1000 * 60 * 60 * 24 * 365.25)
            codeResult.yearsOfData = Math.round(yearsSpan * 10) / 10
            codeResult.tier1Potential = data.length >= 900 // 17+ years
            
            marketResults.workingCodes.push(codeResult)
            
            // Track best candidate (most historical coverage)
            if (data.length > bestCoverage) {
              bestCoverage = data.length
              bestCode = codeResult
            }
            
            console.log(`    ✅ ${code}: ${data.length} records, ${codeResult.yearsOfData} years`)
          } else {
            console.log(`    ❌ ${code}: No data`)
          }
          
          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 250))
          
        } catch (error) {
          codeResult.error = error instanceof Error ? error.message : 'Unknown error'
          console.log(`    ❌ ${code}: ${codeResult.error}`)
        }
        
        marketResults.allResults.push(codeResult)
      }

      marketResults.bestCandidate = bestCode
      researchResults.push(marketResults)
      
      summary.totalCodesTestedByMarket[symbol] = marketResults.totalCodesTested
      summary.workingCodesByMarket[symbol] = marketResults.workingCodes.length
      summary.bestCandidatesByMarket[symbol] = bestCode ? {
        code: bestCode.code,
        records: bestCode.recordCount,
        years: bestCode.yearsOfData,
        tier1: bestCode.tier1Potential
      } : null

      console.log(`\\n📊 ${symbol} Summary: ${marketResults.workingCodes.length}/${marketResults.totalCodesTested} working codes`)
      if (bestCode) {
        console.log(`   Best: ${bestCode.code} (${bestCode.recordCount} records, ${bestCode.yearsOfData} years)`)
      }
    }

    // Generate recommendations
    const recommendations = []
    const updatedContracts = []
    
    for (const result of researchResults) {
      if (result.bestCandidate && result.bestCandidate.tier1Potential) {
        recommendations.push(`${result.symbol}: Use code ${result.bestCandidate.code} for Tier 1 coverage`)
        updatedContracts.push({
          symbol: result.symbol,
          currentCode: HISTORICAL_CONTRACTS[result.symbol as keyof typeof HISTORICAL_CONTRACTS][0],
          recommendedCode: result.bestCandidate.code,
          improvement: `${result.bestCandidate.recordCount} records vs current limited coverage`
        })
      } else if (result.workingCodes.length > 0) {
        const best = result.workingCodes.reduce((prev, curr) => 
          curr.recordCount > prev.recordCount ? curr : prev
        )
        recommendations.push(`${result.symbol}: Best available is ${best.code} (${best.recordCount} records, ${best.yearsOfData} years)`)
      } else {
        recommendations.push(`${result.symbol}: No working historical contracts found`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Historical contract research completed for ${researchResults.length} markets`,
      researchResults,
      summary,
      recommendations,
      updatedContracts,
      nextSteps: updatedContracts.length > 0 ? [
        'Update database with recommended CFTC codes',
        'Run comprehensive data collection',
        'Validate Tier 1 coverage achievement'
      ] : [
        'Some markets may need alternative data sources',
        'Consider partial historical coverage for incomplete markets'
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error researching historical contracts:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to research historical contracts',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}