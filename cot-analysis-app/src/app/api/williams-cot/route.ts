import { NextRequest, NextResponse } from 'next/server'
import { williamsCOTScorer } from '@/lib/williams-cot-scorer'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action') || 'dashboard'
    const marketId = searchParams.get('marketId')
    const lookBack = parseInt(searchParams.get('lookBack') || '52')

    switch (action) {
      case 'dashboard':
        // Williams' multi-market dashboard
        const currentScores = await williamsCOTScorer.getAllCurrentScores()
        
        return NextResponse.json({
          success: true,
          message: `Williams COT analysis for ${currentScores.length} markets`,
          data: {
            markets: currentScores,
            summary: {
              totalMarkets: currentScores.length,
              bullishCount: currentScores.filter(s => s.bias === 'BULLISH').length,
              bearishCount: currentScores.filter(s => s.bias === 'BEARISH').length,
              neutralCount: currentScores.filter(s => s.bias === 'NEUTRAL').length,
              extremeCount: currentScores.filter(s => s.extremeLevel).length,
              highConfidenceCount: currentScores.filter(s => s.confidence >= 80).length
            }
          },
          timestamp: new Date().toISOString()
        })

      case 'extremes':
        // Williams' extreme signal finder
        const extremes = await williamsCOTScorer.findExtremeSignals()
        
        return NextResponse.json({
          success: true,
          message: 'Williams COT extreme signals analysis',
          data: {
            extremeBuys: extremes.extremeBuys,
            extremeSells: extremes.extremeSells,
            highConfidenceSetups: extremes.highConfidenceSetups,
            summary: {
              extremeBuyCount: extremes.extremeBuys.length,
              extremeSellCount: extremes.extremeSells.length,
              highConfidenceCount: extremes.highConfidenceSetups.length
            }
          },
          timestamp: new Date().toISOString()
        })

      case 'market':
        // Detailed analysis for specific market
        if (!marketId) {
          return NextResponse.json({
            success: false,
            message: 'marketId parameter required for market analysis'
          }, { status: 400 })
        }

        const marketScores = await williamsCOTScorer.calculateMarketScores(
          parseInt(marketId), 
          lookBack
        )
        
        // Get latest score for summary
        const latestScore = marketScores[marketScores.length - 1]
        
        if (!latestScore) {
          throw new Error(`No scores calculated for market ${marketId}`)
        }
        
        // Calculate historical extremes for context
        const extremeReadings = marketScores.filter(s => s.extremeLevel)
        const bullishExtremes = extremeReadings.filter(s => s.bias === 'BULLISH')
        const bearishExtremes = extremeReadings.filter(s => s.bias === 'BEARISH')

        return NextResponse.json({
          success: true,
          message: `Williams COT analysis for market ${marketId}`,
          data: {
            currentScore: latestScore,
            historical: marketScores,
            analysis: {
              totalWeeks: marketScores.length,
              extremeReadings: extremeReadings.length,
              bullishExtremes: bullishExtremes.length,
              bearishExtremes: bearishExtremes.length,
              averageScore: marketScores.length > 0 ? Math.round(marketScores.reduce((sum, s) => sum + s.overallScore, 0) / marketScores.length) : 0,
              currentPercentile: calculatePercentile(latestScore.overallScore, marketScores.map(s => s.overallScore))
            }
          },
          timestamp: new Date().toISOString()
        })

      case 'signals':
        // Current signals summary in Williams' format
        const signals = await williamsCOTScorer.getAllCurrentScores()
        
        // Format as Williams-style signal table
        const signalTable = signals.map(score => ({
          market: score.symbol,
          commercialIndex: Math.round(score.commercialIndex),
          largeTraderIndex: Math.round(score.largeTraderIndex),
          signal: getWilliamsSignal(score),
          confidence: Math.round(score.confidence),
          setup: score.extremeLevel ? 'EXTREME' : score.confidence >= 70 ? 'STRONG' : 'WEAK'
        }))

        return NextResponse.json({
          success: true,
          message: 'Williams COT signals table',
          data: {
            signalTable,
            setupOpportunities: signalTable.filter(s => s.setup === 'EXTREME' || s.setup === 'STRONG'),
            marketStats: {
              strongBuySetups: signalTable.filter(s => s.signal === 'BUY' && s.setup !== 'WEAK').length,
              strongSellSetups: signalTable.filter(s => s.signal === 'SELL' && s.setup !== 'WEAK').length,
              extremeSetups: signalTable.filter(s => s.setup === 'EXTREME').length
            }
          },
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json({
          success: false,
          message: 'Invalid action. Use: dashboard, extremes, market, or signals'
        }, { status: 400 })
    }

  } catch (error) {
    console.error('Williams COT API error:', error)
    
    return NextResponse.json({
      success: false,
      message: 'Williams COT analysis failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Helper function for percentile calculation
function calculatePercentile(value: number, dataset: number[]): number {
  const sorted = dataset.sort((a, b) => a - b)
  const index = sorted.findIndex(v => v >= value)
  return Math.round((index / sorted.length) * 100)
}

// Helper function for Williams signal classification
function getWilliamsSignal(score: any): 'BUY' | 'SELL' | 'NEUTRAL' {
  if (score.commercialIndex >= 80) return 'BUY'
  if (score.commercialIndex <= 20) return 'SELL'
  return 'NEUTRAL'
}