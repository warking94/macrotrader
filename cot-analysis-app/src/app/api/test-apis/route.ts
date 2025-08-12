import { NextResponse } from 'next/server'
import { cftcApi } from '@/lib/cftc-api'
import { alphaVantageApi } from '@/lib/alpha-vantage-api'

export async function GET() {
  try {
    console.log('Starting API tests...')
    
    // Test CFTC API connection
    const cftcTest = await cftcApi.testConnection()
    
    // Test Alpha Vantage API connection
    const alphaVantageTest = await alphaVantageApi.testConnection()
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {
        cftc: {
          success: cftcTest.success,
          message: cftcTest.message,
          sampleData: cftcTest.sampleData
        },
        alphaVantage: {
          success: alphaVantageTest.success,
          message: alphaVantageTest.message,
          sampleData: alphaVantageTest.sampleData
        }
      },
      overall: {
        success: cftcTest.success && alphaVantageTest.success,
        message: cftcTest.success && alphaVantageTest.success 
          ? 'All API connections successful!' 
          : 'One or more API connections failed'
      }
    }
    
    return NextResponse.json(results)
    
  } catch (error) {
    console.error('API test error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'API test failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { testType, symbol } = await request.json()
    
    if (testType === 'cftc') {
      // Test fetching COT data for a specific contract
      const contractCode = symbol || '088606' // Default to Gold
      const data = await cftcApi.fetchCOTData(contractCode, 5)
      
      return NextResponse.json({
        success: true,
        message: `Successfully fetched ${data.length} COT records`,
        data: data.slice(0, 3), // Return first 3 records
        contractCode
      })
      
    } else if (testType === 'alpha-vantage') {
      // Test fetching price data for a specific market
      const marketSymbol = symbol || 'EUR/USD' // Default to EUR/USD
      const data = await alphaVantageApi.fetchPriceDataForMarket(marketSymbol)
      
      return NextResponse.json({
        success: true,
        message: `Successfully fetched ${data.length} price records`,
        data: data.slice(0, 3), // Return first 3 records
        marketSymbol
      })
      
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid test type. Use "cftc" or "alpha-vantage"'
        },
        { status: 400 }
      )
    }
    
  } catch (error) {
    console.error('Specific API test error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Specific API test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}