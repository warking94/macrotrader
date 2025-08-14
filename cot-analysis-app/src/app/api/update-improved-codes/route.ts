import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Improved CFTC codes discovered through historical research
const IMPROVED_CODES = {
  'CRUDE': {
    old_code: '067411',
    new_code: '067651',
    cftc_market_name: 'CRUDE OIL, LIGHT SWEET-WTI (Extended)',
    improvement: '1300 records (24.9 years) vs 837 records (16 years)'
  },
  'NATGAS': {
    old_code: '023611', 
    new_code: '023651',
    cftc_market_name: 'NATURAL GAS (Extended)',
    improvement: '1300 records (24.9 years) vs 159 records (4 years historical)'
  }
}

export async function POST() {
  try {
    const results = []
    const errors = []

    console.log('Updating markets with improved CFTC codes...')

    // Update each market with improved codes
    for (const [symbol, codeInfo] of Object.entries(IMPROVED_CODES)) {
      try {
        console.log(`Updating ${symbol}: ${codeInfo.old_code} → ${codeInfo.new_code}`)
        
        const { data, error } = await supabase
          .from('markets')
          .update({
            cftc_contract_market_code: codeInfo.new_code,
            cftc_market_name: codeInfo.cftc_market_name
          })
          .eq('symbol', symbol)
          .select()

        if (error) {
          throw error
        }

        if (data && data.length > 0) {
          results.push({
            symbol,
            success: true,
            oldCode: codeInfo.old_code,
            newCode: codeInfo.new_code,
            improvement: codeInfo.improvement,
            updatedRecord: data[0]
          })
          console.log(`✅ Updated ${symbol}: ${codeInfo.improvement}`)
        } else {
          errors.push(`No market found for symbol: ${symbol}`)
        }

      } catch (error) {
        const errorMsg = `Failed to update ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(`❌ ${errorMsg}`)
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      message: `CFTC code improvements applied: ${results.length} updated, ${errors.length} errors`,
      results,
      errors,
      summary: {
        totalMarkets: Object.keys(IMPROVED_CODES).length,
        successfulUpdates: results.length,
        failedUpdates: errors.length,
        expectedTier1Improvement: `From 6/10 to ${6 + results.length}/10 Tier 1 markets`
      },
      nextSteps: [
        'Run comprehensive COT data collection with improved codes',
        'Validate Tier 1 coverage achievement',
        'Address remaining GOLD and SILVER limitations'
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error updating improved CFTC codes:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to update improved CFTC codes',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}