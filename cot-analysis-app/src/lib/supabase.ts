import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database Types based on our schema
export interface Market {
  id: number
  symbol: string
  name: string
  category: 'Currency' | 'Commodity'
  cftc_contract_market_code?: string
  cftc_market_name?: string
  commodity_name?: string
  commodity_group?: string
  alpha_vantage_from_symbol?: string
  alpha_vantage_to_symbol?: string
  created_at: string
  updated_at: string
}

export interface COTReport {
  id: number
  market_id: number
  report_date: string
  report_week?: string
  open_interest_all?: number
  commercial_long?: number
  commercial_short?: number
  noncommercial_long?: number
  noncommercial_short?: number
  nonreportable_long?: number
  nonreportable_short?: number
  change_open_interest?: number
  change_commercial_long?: number
  change_commercial_short?: number
  change_noncommercial_long?: number
  change_noncommercial_short?: number
  pct_commercial_long?: number
  pct_commercial_short?: number
  pct_noncommercial_long?: number
  pct_noncommercial_short?: number
  total_traders?: number
  commercial_traders_long?: number
  commercial_traders_short?: number
  noncommercial_traders_long?: number
  noncommercial_traders_short?: number
  created_at: string
}

export interface PriceData {
  id: number
  market_id: number
  date: string
  timeframe: 'daily' | 'weekly' | '4h'
  open_price?: number
  high_price?: number
  low_price?: number
  close_price?: number
  volume?: number
  created_at: string
}

export interface COTScore {
  id: number
  market_id: number
  report_date: string
  cot_score?: number
  bias?: 'Bullish' | 'Bearish' | 'Neutral'
  confidence_level?: number
  commercial_positioning_score?: number
  trend_momentum_score?: number
  extremes_score?: number
  created_at: string
}

export interface UserBookmark {
  id: number
  user_id?: string
  market_id: number
  created_at: string
}