import { cftcApi, type COTData } from './cftc-api'
import { marketService, cotReportService } from './database'
import { supabase } from './supabase'

export interface COTCollectionResult {
  success: boolean
  message: string
  newRecords: number
  skippedRecords: number
  errors: string[]
}

class COTDataCollector {
  /**
   * Collects and stores COT data for a specific market
   * @param marketId - Database ID of the market
   * @param cftcCode - CFTC contract market code
   * @param weeksToFetch - Number of weeks of data to fetch (default: 52)
   */
  async collectForMarket(
    marketId: number, 
    cftcCode: string, 
    weeksToFetch: number = 52
  ): Promise<COTCollectionResult> {
    const result: COTCollectionResult = {
      success: false,
      message: '',
      newRecords: 0,
      skippedRecords: 0,
      errors: []
    }

    try {
      // 1. Fetch data from CFTC API
      console.log(`Fetching ${weeksToFetch} weeks of COT data for market ${marketId} (CFTC: ${cftcCode})`)
      const cotData = await cftcApi.fetchCOTData(cftcCode, weeksToFetch)
      
      if (cotData.length === 0) {
        result.message = `No COT data found for ${cftcCode}`
        return result
      }

      // 2. Process each record
      for (const record of cotData) {
        try {
          // Check if this record already exists
          const exists = await this.recordExists(marketId, record.reportDate)
          
          if (exists) {
            result.skippedRecords++
            continue
          }

          // Insert new record
          await this.insertCOTRecord(marketId, record)
          result.newRecords++
          
        } catch (error) {
          const errorMsg = `Failed to process record ${record.reportDate}: ${error instanceof Error ? error.message : 'Unknown error'}`
          result.errors.push(errorMsg)
          console.error(errorMsg)
        }
      }

      result.success = true
      result.message = `Processed ${cotData.length} records: ${result.newRecords} new, ${result.skippedRecords} skipped, ${result.errors.length} errors`
      
    } catch (error) {
      result.message = `Failed to collect COT data: ${error instanceof Error ? error.message : 'Unknown error'}`
      result.errors.push(result.message)
    }

    return result
  }

  /**
   * Collects COT data for all markets in the database
   */
  async collectForAllMarkets(weeksToFetch: number = 52): Promise<Record<string, COTCollectionResult>> {
    const results: Record<string, COTCollectionResult> = {}
    
    try {
      // Get all markets with CFTC codes
      const markets = await this.getMarketsWithCFTCCodes()

      console.log(`Found ${markets.length} markets with CFTC codes`)

      // Process each market
      for (const market of markets) {
        console.log(`Processing market: ${market.symbol} (${market.cftc_contract_market_code})`)
        
        results[market.symbol] = await this.collectForMarket(
          market.id,
          market.cftc_contract_market_code,
          weeksToFetch
        )

        // Rate limiting - wait 200ms between markets
        await new Promise(resolve => setTimeout(resolve, 200))
      }

    } catch (error) {
      const errorResult: COTCollectionResult = {
        success: false,
        message: `Failed to collect data for all markets: ${error instanceof Error ? error.message : 'Unknown error'}`,
        newRecords: 0,
        skippedRecords: 0,
        errors: []
      }
      
      results['error'] = errorResult
    }

    return results
  }

  /**
   * Gets all markets that have CFTC codes
   */
  private async getMarketsWithCFTCCodes(): Promise<any[]> {
    const { data, error } = await supabase
      .from('markets')
      .select('id, symbol, cftc_contract_market_code')
      .not('cftc_contract_market_code', 'is', null)
      .order('symbol')
    
    if (error) throw error
    return data || []
  }

  /**
   * Checks if a COT record already exists for a market and date
   */
  private async recordExists(marketId: number, reportDate: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('cot_reports')
        .select('id')
        .eq('market_id', marketId)
        .eq('report_date', reportDate)
        .limit(1)
      
      if (error) throw error
      return (data && data.length > 0)
    } catch (error) {
      console.error('Error checking if record exists:', error)
      return false
    }
  }

  /**
   * Inserts a new COT record into the database
   */
  private async insertCOTRecord(marketId: number, data: COTData): Promise<void> {
    const recordData = {
      market_id: marketId,
      report_date: data.reportDate,
      open_interest_all: data.openInterest,
      commercial_long: data.commercialLong,
      commercial_short: data.commercialShort,
      noncommercial_long: data.nonCommercialLong,
      noncommercial_short: data.nonCommercialShort,
      nonreportable_long: data.nonReportableLong,
      nonreportable_short: data.nonReportableShort,
      change_commercial_long: data.changeCommercialLong,
      change_commercial_short: data.changeCommercialShort,
      change_noncommercial_long: data.changeNonCommercialLong,
      change_noncommercial_short: data.changeNonCommercialShort,
      pct_commercial_long: data.pctCommercialLong,
      pct_commercial_short: data.pctCommercialShort,
      pct_noncommercial_long: data.pctNonCommercialLong,
      pct_noncommercial_short: data.pctNonCommercialShort
    }

    const { error } = await supabase
      .from('cot_reports')
      .insert(recordData)
    
    if (error) throw error
  }

  /**
   * Gets the latest COT data for a market from the database
   */
  async getLatestCOTData(marketId: number, limit: number = 10): Promise<any[]> {
    const { data, error } = await supabase
      .from('cot_reports')
      .select(`
        *,
        market:markets(symbol, name)
      `)
      .eq('market_id', marketId)
      .order('report_date', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  }

  /**
   * Gets COT data statistics
   */
  async getCOTStats(): Promise<{
    totalRecords: number
    latestDate: string | null
    oldestDate: string | null
    marketsWithData: number
  }> {
    try {
      // Get total count and date range
      const { data: statsData, error: statsError } = await supabase
        .from('cot_reports')
        .select('report_date')
        .order('report_date', { ascending: false })
        
      if (statsError) throw statsError

      // Get unique markets count
      const { data: marketsData, error: marketsError } = await supabase
        .from('cot_reports')
        .select('market_id')
      
      if (marketsError) throw marketsError

      const uniqueMarkets = new Set(marketsData?.map(r => r.market_id) || [])
      const totalRecords = statsData?.length || 0
      const latestDate = totalRecords > 0 ? statsData[0].report_date : null
      const oldestDate = totalRecords > 0 ? statsData[totalRecords - 1].report_date : null

      return {
        totalRecords,
        latestDate,
        oldestDate,
        marketsWithData: uniqueMarkets.size
      }
    } catch (error) {
      console.error('Error getting COT stats:', error)
      return {
        totalRecords: 0,
        latestDate: null,
        oldestDate: null,
        marketsWithData: 0
      }
    }
  }
}

export const cotCollector = new COTDataCollector()