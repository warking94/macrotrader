import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('Testing Supabase connection...')
    
    // Test 1: Basic connection
    const { error: basicError } = await supabase.from('markets').select('count', { count: 'exact' }).limit(1)
    
    if (basicError) {
      return NextResponse.json({
        success: false,
        test: 'basic_connection',
        error: basicError.message,
        errorCode: basicError.code,
        errorDetails: basicError
      })
    }

    // Test 2: Actual data query
    const { data, error: dataError } = await supabase
      .from('markets')
      .select('id, symbol, name')
      .limit(3)
    
    if (dataError) {
      return NextResponse.json({
        success: false,
        test: 'data_query',
        error: dataError.message,
        errorCode: dataError.code,
        errorDetails: dataError
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      marketCount: data?.length || 0,
      sampleMarkets: data,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      test: 'catch_block',
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.constructor?.name,
      stack: error instanceof Error ? error.stack : undefined
    })
  }
}