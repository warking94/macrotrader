import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST() {
  try {
    // Update the copper market with the correct CFTC code
    const { data, error } = await supabase
      .from('markets')
      .update({ 
        cftc_contract_market_code: '084691',
        cftc_market_name: 'COPPER - HIGH GRADE',
        commodity_name: 'COPPER'
      })
      .eq('symbol', 'COPPER')
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Copper market updated successfully',
      updatedRecord: data?.[0],
      oldCode: '085691',
      newCode: '084691',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error updating copper market:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Failed to update copper market',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}