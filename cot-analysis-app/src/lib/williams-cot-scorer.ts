import { supabase } from './supabase'

export interface COTScore {
  marketId: number
  symbol: string
  reportDate: string
  
  // Raw positions
  commercialLong: number
  commercialShort: number
  nonCommercialLong: number
  nonCommercialShort: number
  
  // Net positions
  commercialNet: number
  nonCommercialNet: number
  
  // Williams Normalized Indices (0-100 scale)
  commercialIndex: number
  largeTraderIndex: number
  
  // Signal classifications based on Williams' zones
  commercialSignal: 'EXTREME_BUY' | 'BUY_SETUP' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'SELL_SETUP' | 'EXTREME_SELL'
  largeTraderSignal: 'EXTREME_BUY' | 'BUY_SETUP' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'SELL_SETUP' | 'EXTREME_SELL'
  
  // Combined score and bias
  overallScore: number
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  confidence: number
  
  // Rate of change components
  commercialChange4Week: number
  commercialChange13Week: number
  
  // Historical context
  lookBackWeeks: number
  extremeLevel: boolean
}

class WilliamsCOTScorer {
  private readonly DEFAULT_LOOKBACK = 52 // Williams' modern approach

  /**
   * Calculate Williams' normalized COT indices for a specific market
   */
  async calculateMarketScores(marketId: number, lookBackWeeks: number = this.DEFAULT_LOOKBACK): Promise<COTScore[]> {
    // Get historical data for normalization
    const { data: historicalData, error } = await supabase
      .from('cot_reports')
      .select(`
        report_date,
        commercial_long,
        commercial_short,
        noncommercial_long,
        noncommercial_short,
        open_interest_all
      `)
      .eq('market_id', marketId)
      .order('report_date', { ascending: false })
      .limit(lookBackWeeks + 13) // Extra for rate of change calculations

    if (error) throw error
    if (!historicalData || historicalData.length < Math.min(10, lookBackWeeks + 5)) {
      throw new Error(`Insufficient data for market ${marketId}: need at least ${Math.min(10, lookBackWeeks + 5)} records, got ${historicalData?.length || 0}`)
    }

    // Get market info
    const { data: market } = await supabase
      .from('markets')
      .select('symbol')
      .eq('id', marketId)
      .single()

    const symbol = market?.symbol || 'UNKNOWN'

    // Calculate net positions and statistics
    const dataWithNets = historicalData.map(record => ({
      ...record,
      commercialNet: record.commercial_long - record.commercial_short,
      nonCommercialNet: record.noncommercial_long - record.noncommercial_short
    }))

    // Calculate rolling statistics for normalization
    const scores: COTScore[] = []

    for (let i = 0; i < Math.min(lookBackWeeks, dataWithNets.length); i++) {
      const currentRecord = dataWithNets[i]
      
      // Get look-back window (from current position back N weeks)
      const windowStart = i
      const windowEnd = Math.min(i + lookBackWeeks, dataWithNets.length)
      const window = dataWithNets.slice(windowStart, windowEnd)

      if (window.length < Math.min(10, lookBackWeeks)) continue // Need minimum data for meaningful statistics

      // Calculate statistics for normalization
      const commercialNets = window.map(d => d.commercialNet)
      const nonCommercialNets = window.map(d => d.nonCommercialNet)

      const commercialStats = this.calculateStatistics(commercialNets)
      const nonCommercialStats = this.calculateStatistics(nonCommercialNets)

      // Calculate Williams' normalized indices
      const commercialIndex = this.calculateNormalizedIndex(
        currentRecord.commercialNet, 
        commercialStats
      )
      
      // For large traders, we invert because Williams treats extreme long positions as bearish
      const largeTraderIndex = 100 - this.calculateNormalizedIndex(
        currentRecord.nonCommercialNet,
        nonCommercialStats
      )

      // Calculate rate of change components
      const commercialChange4Week = this.calculateRateOfChange(
        dataWithNets, i, 4, 'commercialNet'
      )
      const commercialChange13Week = this.calculateRateOfChange(
        dataWithNets, i, 13, 'commercialNet'
      )

      // Classify signals based on Williams' zones
      const commercialSignal = this.classifySignal(commercialIndex)
      const largeTraderSignal = this.classifySignal(largeTraderIndex)

      // Calculate overall score and bias using Williams' methodology
      const { overallScore, bias, confidence } = this.calculateOverallScore(
        commercialIndex, 
        largeTraderIndex,
        commercialChange4Week,
        commercialChange13Week
      )

      const score: COTScore = {
        marketId,
        symbol,
        reportDate: currentRecord.report_date,
        commercialLong: currentRecord.commercial_long,
        commercialShort: currentRecord.commercial_short,
        nonCommercialLong: currentRecord.noncommercial_long,
        nonCommercialShort: currentRecord.noncommercial_short,
        commercialNet: currentRecord.commercialNet,
        nonCommercialNet: currentRecord.nonCommercialNet,
        commercialIndex,
        largeTraderIndex,
        commercialSignal,
        largeTraderSignal,
        overallScore,
        bias,
        confidence,
        commercialChange4Week,
        commercialChange13Week,
        lookBackWeeks: window.length,
        extremeLevel: commercialIndex >= 90 || commercialIndex <= 10 || largeTraderIndex >= 90 || largeTraderIndex <= 10
      }

      scores.push(score)
    }

    return scores.reverse() // Return in chronological order
  }

  /**
   * Calculate statistics for normalization
   */
  private calculateStatistics(values: number[]): {
    min: number
    max: number
    mean: number
    stdDev: number
  } {
    const min = Math.min(...values)
    const max = Math.max(...values)
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    return { min, max, mean, stdDev }
  }

  /**
   * Williams' normalized index calculation (0-100 scale)
   */
  private calculateNormalizedIndex(currentValue: number, stats: { min: number, max: number }): number {
    if (stats.max === stats.min) return 50 // Handle edge case

    const index = ((currentValue - stats.min) / (stats.max - stats.min)) * 100
    return Math.max(0, Math.min(100, index)) // Clamp to 0-100
  }

  /**
   * Classify signals based on Williams' zones
   */
  private classifySignal(index: number): 'EXTREME_BUY' | 'BUY_SETUP' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'SELL_SETUP' | 'EXTREME_SELL' {
    if (index >= 95) return 'EXTREME_BUY'
    if (index >= 80) return 'BUY_SETUP'
    if (index >= 60) return 'BULLISH'
    if (index >= 40) return 'NEUTRAL'
    if (index >= 21) return 'BEARISH'
    if (index >= 6) return 'SELL_SETUP'
    return 'EXTREME_SELL'
  }

  /**
   * Calculate rate of change over specified weeks
   */
  private calculateRateOfChange(
    data: any[], 
    currentIndex: number, 
    weeksBack: number, 
    field: string
  ): number {
    if (currentIndex + weeksBack >= data.length) return 0

    const current = data[currentIndex][field]
    const past = data[currentIndex + weeksBack][field]
    
    return current - past
  }

  /**
   * Calculate overall score using Williams' methodology
   */
  private calculateOverallScore(
    commercialIndex: number,
    largeTraderIndex: number,
    change4Week: number,
    change13Week: number
  ): { overallScore: number, bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL', confidence: number } {
    
    // Williams' approach: Commercials are the key, large traders provide confirmation
    const commercialWeight = 0.7
    const largeTraderWeight = 0.3

    // Base score from positioning
    const baseScore = (commercialIndex * commercialWeight) + (largeTraderIndex * largeTraderWeight)

    // Rate of change adjustments (Williams' enhancement)
    let rateAdjustment = 0
    if (change4Week > 0 && change13Week > 0) {
      rateAdjustment = 5 // Positive momentum
    } else if (change4Week < 0 && change13Week < 0) {
      rateAdjustment = -5 // Negative momentum
    }

    const overallScore = Math.max(0, Math.min(100, baseScore + rateAdjustment))

    // Determine bias
    let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    if (overallScore >= 70) bias = 'BULLISH'
    else if (overallScore <= 30) bias = 'BEARISH'
    else bias = 'NEUTRAL'

    // Calculate confidence based on extremeness and agreement
    const commercialExtreme = commercialIndex >= 80 || commercialIndex <= 20
    const largeTraderExtreme = largeTraderIndex >= 80 || largeTraderIndex <= 20
    const agreement = Math.abs(commercialIndex - largeTraderIndex) <= 30

    let confidence = 50 // Base confidence
    if (commercialExtreme) confidence += 20
    if (largeTraderExtreme) confidence += 10
    if (agreement) confidence += 15
    if (commercialIndex >= 90 || commercialIndex <= 10) confidence += 10

    confidence = Math.min(95, confidence)

    return { overallScore, bias, confidence }
  }

  /**
   * Get current scores for all markets
   */
  async getAllCurrentScores(): Promise<COTScore[]> {
    // Get all markets with recent COT data
    const { data: markets, error } = await supabase
      .from('markets')
      .select('id, symbol')
      .not('cftc_contract_market_code', 'is', null)
      .order('symbol')

    if (error) throw error

    const allScores: COTScore[] = []

    for (const market of markets || []) {
      try {
        const scores = await this.calculateMarketScores(market.id, 52)
        if (scores.length > 0) {
          // Get the most recent score
          allScores.push(scores[scores.length - 1])
        }
      } catch (error) {
        console.error(`Error calculating scores for ${market.symbol}:`, error)
      }
    }

    return allScores.sort((a, b) => b.overallScore - a.overallScore)
  }

  /**
   * Find markets at Williams' extreme levels (setup opportunities)
   */
  async findExtremeSignals(): Promise<{
    extremeBuys: COTScore[]
    extremeSells: COTScore[]
    highConfidenceSetups: COTScore[]
  }> {
    const allScores = await this.getAllCurrentScores()

    const extremeBuys = allScores.filter(score => 
      score.commercialIndex >= 90 || score.overallScore >= 85
    )

    const extremeSells = allScores.filter(score => 
      score.commercialIndex <= 10 || score.overallScore <= 15
    )

    const highConfidenceSetups = allScores.filter(score =>
      score.confidence >= 80 && score.extremeLevel
    )

    return { extremeBuys, extremeSells, highConfidenceSetups }
  }
}

export const williamsCOTScorer = new WilliamsCOTScorer()