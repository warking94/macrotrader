interface CFTCRecord {
  market_and_exchange_names: string
  cftc_contract_market_code: string
  report_date_as_yyyy_mm_dd: string
  cftc_commodity_code: string
  open_interest_all: string
  noncomm_positions_long_all: string
  noncomm_positions_short_all: string
  comm_positions_long_all: string
  comm_positions_short_all: string
  nonrept_positions_long_all: string
  nonrept_positions_short_all: string
  change_in_noncomm_long_all: string
  change_in_noncomm_short_all: string
  change_in_comm_long_all: string
  change_in_comm_short_all: string
  change_in_nonrept_long_all: string
  change_in_nonrept_short_all: string
  pct_of_oi_noncomm_long_all?: string
  pct_of_oi_noncomm_short_all?: string
  pct_of_oi_comm_long_all?: string
  pct_of_oi_comm_short_all?: string
  pct_of_oi_nonrept_long_all?: string
  pct_of_oi_nonrept_short_all?: string
}

type CFTCResponse = CFTCRecord[]

export interface COTData {
  marketCode: string
  reportDate: string
  openInterest: number
  commercialLong: number
  commercialShort: number
  nonCommercialLong: number
  nonCommercialShort: number
  nonReportableLong: number
  nonReportableShort: number
  changeCommercialLong: number
  changeCommercialShort: number
  changeNonCommercialLong: number
  changeNonCommercialShort: number
  pctCommercialLong: number
  pctCommercialShort: number
  pctNonCommercialLong: number
  pctNonCommercialShort: number
}

class CFTCApiService {
  private readonly baseUrl = 'https://publicreporting.cftc.gov/resource/jun7-fc8e.json'
  
  async fetchCOTData(contractCode: string, limit: number = 52): Promise<COTData[]> {
    try {
      const url = new URL(this.baseUrl)
      url.searchParams.set('cftc_contract_market_code', contractCode)
      url.searchParams.set('$limit', limit.toString())
      url.searchParams.set('$order', 'report_date_as_yyyy_mm_dd DESC')
      
      console.log('Fetching CFTC data for contract:', contractCode)
      
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'COT-Analysis-App/1.0'
        }
      })
      
      if (!response.ok) {
        throw new Error(`CFTC API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log('CFTC API response type:', typeof data, 'isArray:', Array.isArray(data))
      
      // Handle both direct array and wrapped response formats
      let records: CFTCRecord[]
      if (Array.isArray(data)) {
        records = data
      } else if (data?.result?.records && Array.isArray(data.result.records)) {
        records = data.result.records
      } else {
        console.error('Unexpected CFTC API response structure:', JSON.stringify(data, null, 2))
        throw new Error('Invalid CFTC API response structure or no data')
      }
      
      if (records.length === 0) {
        throw new Error('No COT data found for the specified contract')
      }
      
      return records.map(record => ({
        marketCode: record.cftc_contract_market_code,
        reportDate: record.report_date_as_yyyy_mm_dd,
        openInterest: parseInt(record.open_interest_all) || 0,
        commercialLong: parseInt(record.comm_positions_long_all) || 0,
        commercialShort: parseInt(record.comm_positions_short_all) || 0,
        nonCommercialLong: parseInt(record.noncomm_positions_long_all) || 0,
        nonCommercialShort: parseInt(record.noncomm_positions_short_all) || 0,
        nonReportableLong: parseInt(record.nonrept_positions_long_all) || 0,
        nonReportableShort: parseInt(record.nonrept_positions_short_all) || 0,
        changeCommercialLong: parseInt(record.change_in_comm_long_all) || 0,
        changeCommercialShort: parseInt(record.change_in_comm_short_all) || 0,
        changeNonCommercialLong: parseInt(record.change_in_noncomm_long_all) || 0,
        changeNonCommercialShort: parseInt(record.change_in_noncomm_short_all) || 0,
        pctCommercialLong: parseFloat(record.pct_of_oi_comm_long_all) || 0,
        pctCommercialShort: parseFloat(record.pct_of_oi_comm_short_all) || 0,
        pctNonCommercialLong: parseFloat(record.pct_of_oi_noncomm_long_all) || 0,
        pctNonCommercialShort: parseFloat(record.pct_of_oi_noncomm_short_all) || 0
      }))
      
    } catch (error) {
      console.error('Error fetching CFTC data:', error)
      throw new Error(`Failed to fetch COT data for ${contractCode}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  async fetchMultipleMarkets(contractCodes: string[]): Promise<Record<string, COTData[]>> {
    const results: Record<string, COTData[]> = {}
    
    for (const code of contractCodes) {
      try {
        results[code] = await this.fetchCOTData(code)
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Failed to fetch data for contract ${code}:`, error)
        results[code] = []
      }
    }
    
    return results
  }
  
  async testConnection(): Promise<{ success: boolean, message: string, sampleData?: COTData }> {
    try {
      const testData = await this.fetchCOTData('088606', 1)
      
      if (testData.length === 0) {
        return {
          success: false,
          message: 'CFTC API returned no data'
        }
      }
      
      return {
        success: true,
        message: 'CFTC API connection successful',
        sampleData: testData[0]
      }
    } catch (error) {
      return {
        success: false,
        message: `CFTC API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

export const cftcApi = new CFTCApiService()