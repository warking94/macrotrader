import { NextResponse } from 'next/server'
import { marketService, dbHealthCheck } from '@/lib/database'

export async function GET() {
  try {
    // Test database connection
    const isHealthy = await dbHealthCheck()
    
    if (!isHealthy) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Database connection failed',
          message: 'Check your Supabase configuration in .env.local' 
        },
        { status: 500 }
      )
    }

    // Test basic query - get all markets
    const markets = await marketService.getAll()
    
    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      data: {
        marketCount: markets.length,
        markets: markets.map(m => ({
          symbol: m.symbol,
          name: m.name,
          category: m.category,
          cftc_code: m.cftc_contract_market_code
        })),
        timestamp: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('Database test error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database query failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        help: 'Make sure you have run the database schema SQL in Supabase'
      },
      { status: 500 }
    )
  }
}