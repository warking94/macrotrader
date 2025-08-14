import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Correct CFTC contract market codes based on database schema and research
const CFTC_CODES = {
  'EUR/USD': {
    cftc_contract_market_code: '099741',
    cftc_market_name: 'EURO FX',
    commodity_name: 'EUROPEAN CURRENCY UNIT'
  },
  'GBP/USD': {
    cftc_contract_market_code: '096742',
    cftc_market_name: 'BRITISH POUND',
    commodity_name: 'POUND STERLING'
  },
  'USD/JPY': {
    cftc_contract_market_code: '097741',
    cftc_market_name: 'JAPANESE YEN',
    commodity_name: 'JAPANESE YEN'
  },
  'AUD/USD': {
    cftc_contract_market_code: '232741',
    cftc_market_name: 'AUSTRALIAN DOLLAR',
    commodity_name: 'AUSTRALIAN DOLLAR'
  },
  'USD/CAD': {
    cftc_contract_market_code: '090741',
    cftc_market_name: 'CANADIAN DOLLAR',
    commodity_name: 'CANADIAN DOLLAR'
  },
  'GOLD': {
    cftc_contract_market_code: '088606',
    cftc_market_name: 'GOLD, 100 TROY OZ',
    commodity_name: 'GOLD'
  },
  'SILVER': {
    cftc_contract_market_code: '084605',
    cftc_market_name: 'SILVER, 5000 TROY OZ',
    commodity_name: 'SILVER'
  },
  'CRUDE': {
    cftc_contract_market_code: '067411',
    cftc_market_name: 'CRUDE OIL, LIGHT SWEET-WTI',
    commodity_name: 'CRUDE OIL'
  },
  'COPPER': {
    cftc_contract_market_code: '084691', // Updated code (not 085691)
    cftc_market_name: 'COPPER - HIGH GRADE',
    commodity_name: 'COPPER'
  },
  'NATGAS': {
    cftc_contract_market_code: '023611',
    cftc_market_name: 'NATURAL GAS',
    commodity_name: 'NATURAL GAS'
  }
}

export async function POST() {
  try {
    const results = []
    const errors = []

    // Update each market with its CFTC codes
    for (const [symbol, codes] of Object.entries(CFTC_CODES)) {
      try {
        console.log(`Updating CFTC codes for ${symbol}...`)
        
        const { data, error } = await supabase
          .from('markets')
          .update(codes)
          .eq('symbol', symbol)
          .select()

        if (error) {
          throw error
        }

        if (data && data.length > 0) {
          results.push({
            symbol,
            success: true,
            updatedRecord: data[0]
          })
          console.log(`✅ Updated ${symbol} with CFTC code ${codes.cftc_contract_market_code}`)
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
      message: `CFTC codes population completed: ${results.length} updated, ${errors.length} errors`,
      results,
      errors,
      summary: {
        totalMarkets: Object.keys(CFTC_CODES).length,
        successfulUpdates: results.length,
        failedUpdates: errors.length
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error populating CFTC codes:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to populate CFTC codes',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}