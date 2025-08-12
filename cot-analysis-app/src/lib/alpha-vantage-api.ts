interface AlphaVantageTimeSeriesResponse {
  'Meta Data': {
    '1. Information': string
    '2. Symbol': string
    '3. Last Refreshed': string
    '4. Time Zone': string
  }
  'Time Series (Daily)': {
    [date: string]: {
      '1. open': string
      '2. high': string
      '3. low': string
      '4. close': string
      '5. volume': string
    }
  }
}

interface AlphaVantageForexResponse {
  'Meta Data': {
    '1. Information': string
    '2. From Symbol': string
    '3. To Symbol': string
    '4. Output Size': string
    '5. Last Refreshed': string
    '6. Time Zone': string
  }
  'Time Series FX (Daily)': {
    [date: string]: {
      '1. open': string
      '2. high': string
      '3. low': string
      '4. close': string
    }
  }
}

export interface PriceData {
  symbol: string
  date: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

class AlphaVantageApiService {
  private readonly baseUrl = 'https://www.alphavantage.co/query'
  private readonly apiKey = process.env.ALPHA_VANTAGE_API_KEY

  constructor() {
    if (!this.apiKey) {
      console.warn('Alpha Vantage API key not configured. Set ALPHA_VANTAGE_API_KEY in environment variables.')
    }
  }

  private async makeRequest(params: Record<string, string>): Promise<any> {
    if (!this.apiKey) {
      throw new Error('Alpha Vantage API key not configured')
    }

    const url = new URL(this.baseUrl)
    url.searchParams.set('apikey', this.apiKey)
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })

    console.log('Alpha Vantage API request:', url.toString().replace(this.apiKey, 'API_KEY_HIDDEN'))

    const response = await fetch(url.toString())
    
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Alpha Vantage API response keys:', Object.keys(data))
    
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage API error: ${data['Error Message']}`)
    }
    
    if (data['Note']) {
      throw new Error(`Alpha Vantage API rate limit: ${data['Note']}`)
    }
    
    if (data['Information']) {
      throw new Error(`Alpha Vantage API info: ${data['Information']}`)
    }

    return data
  }

  async fetchForexData(fromSymbol: string, toSymbol: string, outputSize: 'compact' | 'full' = 'compact'): Promise<PriceData[]> {
    try {
      const data: AlphaVantageForexResponse = await this.makeRequest({
        function: 'FX_DAILY',
        from_symbol: fromSymbol,
        to_symbol: toSymbol,
        outputsize: outputSize
      })

      if (!data['Time Series FX (Daily)']) {
        throw new Error('Invalid forex response structure from Alpha Vantage')
      }

      const timeSeries = data['Time Series FX (Daily)']
      
      return Object.entries(timeSeries)
        .map(([date, values]) => ({
          symbol: `${fromSymbol}/${toSymbol}`,
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close'])
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    } catch (error) {
      console.error(`Error fetching forex data for ${fromSymbol}/${toSymbol}:`, error)
      throw new Error(`Failed to fetch forex data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async fetchCommodityData(symbol: string, outputSize: 'compact' | 'full' = 'compact'): Promise<PriceData[]> {
    try {
      const data: AlphaVantageTimeSeriesResponse = await this.makeRequest({
        function: 'TIME_SERIES_DAILY',
        symbol: symbol,
        outputsize: outputSize
      })

      if (!data['Time Series (Daily)']) {
        throw new Error('Invalid time series response structure from Alpha Vantage')
      }

      const timeSeries = data['Time Series (Daily)']
      
      return Object.entries(timeSeries)
        .map(([date, values]) => ({
          symbol,
          date,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseFloat(values['5. volume']) || undefined
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    } catch (error) {
      console.error(`Error fetching commodity data for ${symbol}:`, error)
      throw new Error(`Failed to fetch commodity data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async fetchPriceDataForMarket(marketSymbol: string): Promise<PriceData[]> {
    // Map our market symbols to Alpha Vantage symbols
    const symbolMapping: Record<string, { type: 'forex' | 'commodity', symbol?: string, from?: string, to?: string }> = {
      'EUR/USD': { type: 'forex', from: 'EUR', to: 'USD' },
      'GBP/USD': { type: 'forex', from: 'GBP', to: 'USD' },
      'USD/JPY': { type: 'forex', from: 'USD', to: 'JPY' },
      'USD/CAD': { type: 'forex', from: 'USD', to: 'CAD' },
      'AUD/USD': { type: 'forex', from: 'AUD', to: 'USD' },
      'GOLD': { type: 'commodity', symbol: 'GLD' }, // Gold ETF as proxy
      'SILVER': { type: 'commodity', symbol: 'SLV' }, // Silver ETF as proxy
      'CRUDE': { type: 'commodity', symbol: 'USO' }, // Oil ETF as proxy
      'NATGAS': { type: 'commodity', symbol: 'UNG' }, // Natural Gas ETF as proxy
      'COPPER': { type: 'commodity', symbol: 'CPER' } // Copper ETF as proxy
    }

    const mapping = symbolMapping[marketSymbol]
    if (!mapping) {
      throw new Error(`No Alpha Vantage mapping found for market: ${marketSymbol}`)
    }

    if (mapping.type === 'forex' && mapping.from && mapping.to) {
      return this.fetchForexData(mapping.from, mapping.to)
    } else if (mapping.type === 'commodity' && mapping.symbol) {
      return this.fetchCommodityData(mapping.symbol)
    } else {
      throw new Error(`Invalid mapping configuration for market: ${marketSymbol}`)
    }
  }

  async testConnection(): Promise<{ success: boolean, message: string, sampleData?: PriceData }> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          message: 'Alpha Vantage API key not configured in environment variables'
        }
      }

      // Test with EUR/USD data
      const testData = await this.fetchForexData('EUR', 'USD', 'compact')
      
      if (testData.length === 0) {
        return {
          success: false,
          message: 'Alpha Vantage API returned no data'
        }
      }

      return {
        success: true,
        message: 'Alpha Vantage API connection successful',
        sampleData: testData[0]
      }
    } catch (error) {
      return {
        success: false,
        message: `Alpha Vantage API connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  async fetchMultipleMarkets(marketSymbols: string[]): Promise<Record<string, PriceData[]>> {
    const results: Record<string, PriceData[]> = {}
    
    for (const symbol of marketSymbols) {
      try {
        results[symbol] = await this.fetchPriceDataForMarket(symbol)
        // Rate limiting - wait 12 seconds between requests (free tier: 5 requests/minute)
        if (marketSymbols.indexOf(symbol) < marketSymbols.length - 1) {
          console.log(`Rate limiting: waiting 12 seconds before next Alpha Vantage request...`)
          await new Promise(resolve => setTimeout(resolve, 12000))
        }
      } catch (error) {
        console.error(`Failed to fetch price data for ${symbol}:`, error)
        results[symbol] = []
      }
    }
    
    return results
  }
}

export const alphaVantageApi = new AlphaVantageApiService()