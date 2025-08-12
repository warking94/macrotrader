import { supabase } from './supabase'
import type { Market, COTReport, PriceData, COTScore } from './supabase'

// Market operations
export const marketService = {
  // Get all markets
  async getAll(): Promise<Market[]> {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .order('category', { ascending: true })
      .order('symbol', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // Get markets by category
  async getByCategory(category: 'Currency' | 'Commodity'): Promise<Market[]> {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('category', category)
      .order('symbol', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // Get single market by symbol
  async getBySymbol(symbol: string): Promise<Market | null> {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('symbol', symbol)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  // Get market by CFTC code
  async getByCFTCCode(code: string): Promise<Market | null> {
    const { data, error } = await supabase
      .from('markets')
      .select('*')
      .eq('cftc_contract_market_code', code)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  }
}

// COT Reports operations
export const cotReportService = {
  // Get latest COT report for a market
  async getLatest(marketId: number): Promise<COTReport | null> {
    const { data, error } = await supabase
      .from('cot_reports')
      .select('*')
      .eq('market_id', marketId)
      .order('report_date', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  // Get COT reports for a market within date range
  async getByDateRange(
    marketId: number, 
    startDate: string, 
    endDate: string
  ): Promise<COTReport[]> {
    const { data, error } = await supabase
      .from('cot_reports')
      .select('*')
      .eq('market_id', marketId)
      .gte('report_date', startDate)
      .lte('report_date', endDate)
      .order('report_date', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // Insert new COT report
  async insert(report: Omit<COTReport, 'id' | 'created_at'>): Promise<COTReport> {
    const { data, error } = await supabase
      .from('cot_reports')
      .insert(report)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Batch insert COT reports
  async batchInsert(reports: Omit<COTReport, 'id' | 'created_at'>[]): Promise<COTReport[]> {
    const { data, error } = await supabase
      .from('cot_reports')
      .insert(reports)
      .select()
    
    if (error) throw error
    return data || []
  }
}

// Price Data operations
export const priceDataService = {
  // Get latest price for a market
  async getLatest(marketId: number, timeframe: string): Promise<PriceData | null> {
    const { data, error } = await supabase
      .from('price_data')
      .select('*')
      .eq('market_id', marketId)
      .eq('timeframe', timeframe)
      .order('date', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  // Get price data for a market within date range
  async getByDateRange(
    marketId: number,
    timeframe: string,
    startDate: string,
    endDate: string
  ): Promise<PriceData[]> {
    const { data, error } = await supabase
      .from('price_data')
      .select('*')
      .eq('market_id', marketId)
      .eq('timeframe', timeframe)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })
    
    if (error) throw error
    return data || []
  },

  // Insert price data
  async insert(priceData: Omit<PriceData, 'id' | 'created_at'>): Promise<PriceData> {
    const { data, error } = await supabase
      .from('price_data')
      .insert(priceData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Batch insert price data
  async batchInsert(priceData: Omit<PriceData, 'id' | 'created_at'>[]): Promise<PriceData[]> {
    const { data, error } = await supabase
      .from('price_data')
      .insert(priceData)
      .select()
    
    if (error) throw error
    return data || []
  }
}

// COT Scores operations
export const cotScoreService = {
  // Get latest score for a market
  async getLatest(marketId: number): Promise<COTScore | null> {
    const { data, error } = await supabase
      .from('cot_scores')
      .select('*')
      .eq('market_id', marketId)
      .order('report_date', { ascending: false })
      .limit(1)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  },

  // Get all latest scores for dashboard
  async getAllLatest(): Promise<(COTScore & { market: Market })[]> {
    const { data, error } = await supabase
      .from('cot_scores')
      .select(`
        *,
        market:markets(*)
      `)
      .order('report_date', { ascending: false })
    
    if (error) throw error
    return data || []
  },

  // Insert new score
  async insert(score: Omit<COTScore, 'id' | 'created_at'>): Promise<COTScore> {
    const { data, error } = await supabase
      .from('cot_scores')
      .insert(score)
      .select()
      .single()
    
    if (error) throw error
    return data
  }
}

// Database health check
export const dbHealthCheck = async (): Promise<boolean> => {
  try {
    const { error } = await supabase.from('markets').select('count', { count: 'exact' }).limit(1)
    return !error
  } catch {
    return false
  }
}