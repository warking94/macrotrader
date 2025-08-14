import { alphaVantageApi, type PriceData } from './alpha-vantage-api'
import { supabase } from './supabase'

export interface PriceCollectionResult {
  success: boolean
  message: string
  newRecords: number
  skippedRecords: number
  errors: string[]
  dateRange?: {
    oldest: string
    latest: string
  }
}

class PriceDataCollector {
  /**
   * Collects and stores price data for a specific market
   */
  async collectForMarket(
    marketId: number, 
    marketSymbol: string, 
    outputSize: 'compact' | 'full' = 'compact'
  ): Promise<PriceCollectionResult> {
    const result: PriceCollectionResult = {
      success: false,
      message: '',
      newRecords: 0,
      skippedRecords: 0,
      errors: []
    }

    try {
      console.log(`Fetching price data for ${marketSymbol} (market ID: ${marketId})`)
      
      // Fetch price data from Alpha Vantage
      const priceData = await alphaVantageApi.fetchPriceDataForMarket(marketSymbol, outputSize)
      
      if (priceData.length === 0) {
        result.message = `No price data found for ${marketSymbol}`
        return result
      }

      console.log(`Retrieved ${priceData.length} price records for ${marketSymbol}`)

      // Process each price record
      for (const record of priceData) {
        try {
          // Check if this record already exists (for this market and date)
          const exists = await this.priceRecordExists(marketId, record.date)
          
          if (exists) {
            result.skippedRecords++
            continue
          }

          // Insert new price record
          await this.insertPriceRecord(marketId, record)
          result.newRecords++
          
        } catch (error) {
          const errorMsg = `Failed to process price record ${record.date}: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      // Set date range for successful results
      if (priceData.length > 0) {
        result.dateRange = {
          oldest: priceData[priceData.length - 1].date,
          latest: priceData[0].date
        }
      }

      result.success = true
      result.message = `Processed ${priceData.length} price records for ${marketSymbol}: ${result.newRecords} new, ${result.skippedRecords} skipped, ${result.errors.length} errors`
      
    } catch (error) {
      result.message = `Failed to collect price data for ${marketSymbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
      result.errors.push(result.message)
    }

    return result
  }

  /**
   * Collects price data for all markets in the database
   */
  async collectForAllMarkets(outputSize: 'compact' | 'full' = 'compact'): Promise<Record<string, PriceCollectionResult>> {
    const results: Record<string, PriceCollectionResult> = {}
    
    try {
      // Get all markets that have Alpha Vantage symbol mappings
      const { data: markets, error } = await supabase
        .from('markets')
        .select('id, symbol')
        .order('symbol')

      if (error) throw error

      console.log(`Found ${markets?.length || 0} markets for price data collection`)

      // Process each market with rate limiting
      for (const market of markets || []) {
        console.log(`Processing price data for market: ${market.symbol}`)
        
        results[market.symbol] = await this.collectForMarket(
          market.id,
          market.symbol,
          outputSize
        )

        // Alpha Vantage rate limiting (free tier: 5 requests/minute)
        // Wait 12 seconds between requests (except for the last one)
        const isLastMarket = markets?.indexOf(market) === (markets?.length || 0) - 1
        if (!isLastMarket) {
          console.log('Rate limiting: waiting 12 seconds...')
          await new Promise(resolve => setTimeout(resolve, 12000))
        }
      }

    } catch (error) {
      const errorResult: PriceCollectionResult = {
        success: false,
        message: `Failed to collect price data for all markets: ${error instanceof Error ? error.message : 'Unknown error'}`,
        newRecords: 0,
        skippedRecords: 0,
        errors: []
      }
      
      results['error'] = errorResult
    }

    return results
  }

  /**
   * Checks if a price record already exists for a market and date
   */
  private async priceRecordExists(marketId: number, date: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('price_data')
        .select('id')
        .eq('market_id', marketId)
        .eq('date', date)
        .eq('timeframe', 'daily')
        .limit(1)
      
      if (error) throw error
      return (data && data.length > 0)
    } catch (error) {
      console.error('Error checking if price record exists:', error)
      return false
    }
  }

  /**
   * Inserts a new price record into the database
   */
  private async insertPriceRecord(marketId: number, data: PriceData): Promise<void> {
    const recordData = {
      market_id: marketId,
      date: data.date,
      timeframe: 'daily',
      open_price: data.open,
      high_price: data.high,
      low_price: data.low,
      close_price: data.close,
      volume: data.volume || null
    }

    const { error } = await supabase
      .from('price_data')
      .insert(recordData)
    
    if (error) throw error
  }

  /**
   * Gets the latest price data for a market from the database
   */
  async getLatestPriceData(marketId: number, limit: number = 30): Promise<any[]> {
    const { data, error } = await supabase
      .from('price_data')
      .select(`
        *,
        market:markets(symbol, name)
      `)
      .eq('market_id', marketId)
      .eq('timeframe', 'daily')
      .order('date', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  }

  /**
   * Gets price data for a specific date range
   */
  async getPriceDataInRange(
    marketId: number, 
    startDate: string, 
    endDate: string
  ): Promise<any[]> {
    const { data, error } = await supabase
      .from('price_data')
      .select(`
        date,
        open_price,
        high_price,
        low_price,
        close_price,
        volume
      `)
      .eq('market_id', marketId)
      .eq('timeframe', 'daily')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
    
    if (error) throw error
    return data || []
  }

  /**
   * Gets combined COT and price data for correlation analysis
   */
  async getCombinedCOTAndPriceData(
    marketId: number, 
    startDate: string, 
    endDate: string
  ): Promise<any[]> {
    // Get COT data
    const { data: cotData, error: cotError } = await supabase
      .from('cot_reports')
      .select('report_date, commercial_long, commercial_short, noncommercial_long, noncommercial_short')
      .eq('market_id', marketId)
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .order('report_date', { ascending: true })

    if (cotError) throw cotError

    // Get price data
    const priceData = await this.getPriceDataInRange(marketId, startDate, endDate)

    // Combine the datasets by finding matching or nearest dates
    const combined = []
    
    for (const cotRecord of cotData || []) {
      // Find the closest price data to this COT report date
      const cotDate = new Date(cotRecord.report_date)
      let closestPriceRecord = null
      let minDiffDays = Infinity

      for (const priceRecord of priceData) {
        const priceDate = new Date(priceRecord.date)
        const diffDays = Math.abs((cotDate.getTime() - priceDate.getTime()) / (1000 * 60 * 60 * 24))
        
        if (diffDays < minDiffDays) {
          minDiffDays = diffDays
          closestPriceRecord = priceRecord
        }
      }

      if (closestPriceRecord && minDiffDays <= 7) { // Only include if within 7 days
        combined.push({
          date: cotRecord.report_date,
          commercial_net: cotRecord.commercial_long - cotRecord.commercial_short,
          noncommercial_net: cotRecord.noncommercial_long - cotRecord.noncommercial_short,
          price_close: closestPriceRecord.close_price,
          price_open: closestPriceRecord.open_price,
          price_high: closestPriceRecord.high_price,
          price_low: closestPriceRecord.low_price,
          price_date: closestPriceRecord.date,
          days_difference: minDiffDays
        })
      }
    }

    return combined
  }

  /**
   * Gets price data statistics
   */
  async getPriceDataStats(): Promise<{
    totalRecords: number
    latestDate: string | null
    oldestDate: string | null
    marketsWithData: number
    avgRecordsPerMarket: number
  }> {
    try {
      const [statsResult, marketsResult] = await Promise.all([
        supabase
          .from('price_data')
          .select('date, market_id')
          .eq('timeframe', 'daily')
          .order('date', { ascending: false }),
        supabase
          .from('price_data')
          .select('market_id')
          .eq('timeframe', 'daily')
      ])

      if (statsResult.error) throw statsResult.error
      if (marketsResult.error) throw marketsResult.error

      const uniqueMarkets = new Set((marketsResult.data || []).map(r => r.market_id))
      const totalRecords = statsResult.data?.length || 0
      const latestDate = totalRecords > 0 ? statsResult.data![0].date : null
      const oldestDate = totalRecords > 0 ? statsResult.data![totalRecords - 1].date : null

      return {
        totalRecords,
        latestDate,
        oldestDate,
        marketsWithData: uniqueMarkets.size,
        avgRecordsPerMarket: uniqueMarkets.size > 0 ? Math.round(totalRecords / uniqueMarkets.size) : 0
      }
    } catch (error) {
      console.error('Error getting price data stats:', error)
      return {
        totalRecords: 0,
        latestDate: null,
        oldestDate: null,
        marketsWithData: 0,
        avgRecordsPerMarket: 0
      }
    }
  }
}

export const priceDataCollector = new PriceDataCollector()