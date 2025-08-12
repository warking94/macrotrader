'use client'

import React, { useState, useEffect } from 'react'
import WilliamsCOTChart from './WilliamsCOTChart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface MarketScore {
  marketId: number
  symbol: string
  commercialIndex: number
  largeTraderIndex: number
  overallScore: number
  bias: string
  confidence: number
  extremeLevel: boolean
  commercialSignal: string
  largeTraderSignal: string
}

interface DashboardData {
  markets: MarketScore[]
  summary: {
    totalMarkets: number
    bullishCount: number
    bearishCount: number
    neutralCount: number
    extremeCount: number
    highConfidenceCount: number
  }
}

export default function WilliamsCOTDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedMarket, setSelectedMarket] = useState<MarketScore | null>(null)
  const [lookBackWeeks, setLookBackWeeks] = useState(52)
  const [showPriceOverlay, setShowPriceOverlay] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/williams-cot?action=dashboard')
      const result = await response.json()

      if (result.success) {
        setDashboardData(result.data)
        // Set default selected market to highest score
        if (result.data.markets.length > 0) {
          setSelectedMarket(result.data.markets[0])
        }
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError('Failed to fetch dashboard data')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getSignalColor = (bias: string) => {
    switch (bias) {
      case 'BULLISH': return 'bg-green-500'
      case 'BEARISH': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getSignalBadgeClass = (signal: string) => {
    if (signal.includes('EXTREME')) return 'bg-red-600'
    if (signal.includes('SETUP')) return 'bg-orange-500'
    if (signal === 'BULLISH') return 'bg-green-500'
    if (signal === 'BEARISH') return 'bg-red-500'
    return 'bg-gray-500'
  }

  const sortMarketsBySignificance = (markets: MarketScore[]) => {
    return [...markets].sort((a, b) => {
      // Prioritize extreme levels
      if (a.extremeLevel && !b.extremeLevel) return -1
      if (!a.extremeLevel && b.extremeLevel) return 1
      
      // Then by confidence
      if (a.confidence !== b.confidence) return b.confidence - a.confidence
      
      // Finally by overall score extremeness
      const aExtremeness = Math.min(a.overallScore, 100 - a.overallScore)
      const bExtremeness = Math.min(b.overallScore, 100 - b.overallScore)
      return aExtremeness - bExtremeness
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading Williams COT Dashboard...</div>
      </div>
    )
  }

  if (error || !dashboardData) {
    return (
      <div className="text-red-500">
        Error: {error || 'No data available'}
      </div>
    )
  }

  const sortedMarkets = sortMarketsBySignificance(dashboardData.markets)
  const extremeMarkets = sortedMarkets.filter(m => m.extremeLevel)
  const highConfidenceMarkets = sortedMarkets.filter(m => m.confidence >= 80)

  return (
    <div className="space-y-6">
      {/* Dashboard Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Williams COT Analysis Dashboard</CardTitle>
          <CardDescription>
            Real-time analysis using Larry Williams' normalized COT methodology
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{dashboardData.summary.totalMarkets}</div>
              <div className="text-sm text-gray-500">Total Markets</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{dashboardData.summary.bullishCount}</div>
              <div className="text-sm text-gray-500">Bullish</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{dashboardData.summary.bearishCount}</div>
              <div className="text-sm text-gray-500">Bearish</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{dashboardData.summary.neutralCount}</div>
              <div className="text-sm text-gray-500">Neutral</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{dashboardData.summary.extremeCount}</div>
              <div className="text-sm text-gray-500">Extreme Levels</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{dashboardData.summary.highConfidenceCount}</div>
              <div className="text-sm text-gray-500">High Confidence</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Market Overview</TabsTrigger>
          <TabsTrigger value="extremes">Extreme Signals</TabsTrigger>
          <TabsTrigger value="charts">Individual Charts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Markets - Williams COT Signals</CardTitle>
              <CardDescription>
                Markets sorted by signal significance (extremes first)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Market</th>
                      <th className="text-center p-2">Commercial</th>
                      <th className="text-center p-2">Large Trader</th>
                      <th className="text-center p-2">Overall</th>
                      <th className="text-center p-2">Bias</th>
                      <th className="text-center p-2">Confidence</th>
                      <th className="text-center p-2">Signal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedMarkets.map((market) => (
                      <tr key={market.marketId} className={`border-b hover:bg-gray-50 ${market.extremeLevel ? 'bg-yellow-50' : ''}`}>
                        <td className="p-2 font-semibold">
                          {market.symbol}
                          {market.extremeLevel && <span className="ml-2 text-xs text-red-600">⚠️</span>}
                        </td>
                        <td className="text-center p-2">
                          <span className={`font-bold ${
                            market.commercialIndex >= 90 ? 'text-green-600' :
                            market.commercialIndex <= 10 ? 'text-red-600' :
                            market.commercialIndex >= 80 ? 'text-green-500' :
                            market.commercialIndex <= 20 ? 'text-red-500' :
                            'text-gray-600'
                          }`}>
                            {Math.round(market.commercialIndex)}%
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className="text-purple-600 font-bold">
                            {Math.round(market.largeTraderIndex)}%
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <span className="font-bold">
                            {Math.round(market.overallScore)}%
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <Badge className={`text-xs ${getSignalColor(market.bias)}`}>
                            {market.bias}
                          </Badge>
                        </td>
                        <td className="text-center p-2">
                          <span className={`font-bold ${
                            market.confidence >= 90 ? 'text-green-600' :
                            market.confidence >= 70 ? 'text-yellow-600' :
                            'text-gray-600'
                          }`}>
                            {market.confidence}%
                          </span>
                        </td>
                        <td className="text-center p-2">
                          <Badge className={`text-xs ${getSignalBadgeClass(market.commercialSignal)}`}>
                            {market.commercialSignal.replace('_', ' ')}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="extremes" className="space-y-4">
          {extremeMarkets.length > 0 ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-orange-600">⚠️ Markets at Extreme Levels</CardTitle>
                  <CardDescription>
                    Williams' extreme readings (90%+ or 10%-) - High probability setup opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {extremeMarkets.map((market) => (
                      <div key={market.marketId} className="border rounded-lg p-4 bg-yellow-50">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold text-lg">{market.symbol}</h3>
                          <Badge className={getSignalColor(market.bias)}>
                            {market.bias}
                          </Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Commercial:</span>
                            <span className="font-bold">{Math.round(market.commercialIndex)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Large Trader:</span>
                            <span className="font-bold">{Math.round(market.largeTraderIndex)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Confidence:</span>
                            <span className="font-bold">{market.confidence}%</span>
                          </div>
                          <div className="mt-2 text-xs">
                            <Badge className={`${getSignalBadgeClass(market.commercialSignal)} mr-1`}>
                              {market.commercialSignal.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-gray-500">No markets currently at extreme levels</div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <label htmlFor="market-select" className="text-sm font-medium">Select Market:</label>
              <Select
                value={selectedMarket?.marketId.toString() || ''}
                onValueChange={(value) => {
                  const market = dashboardData.markets.find(m => m.marketId === parseInt(value))
                  if (market) setSelectedMarket(market)
                }}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Choose market" />
                </SelectTrigger>
                <SelectContent>
                  {sortedMarkets.map((market) => (
                    <SelectItem key={market.marketId} value={market.marketId.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{market.symbol}</span>
                        {market.extremeLevel && <span className="text-red-600">⚠️</span>}
                        <Badge className={`text-xs ${getSignalColor(market.bias)}`}>
                          {market.bias}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <label htmlFor="lookback-select" className="text-sm font-medium">Look Back:</label>
              <Select
                value={lookBackWeeks.toString()}
                onValueChange={(value) => setLookBackWeeks(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="26">26 weeks</SelectItem>
                  <SelectItem value="52">52 weeks</SelectItem>
                  <SelectItem value="104">2 years</SelectItem>
                  <SelectItem value="156">3 years</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="price-overlay"
                checked={showPriceOverlay}
                onChange={(e) => setShowPriceOverlay(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="price-overlay" className="text-sm font-medium">
                Price Overlay
              </label>
            </div>
          </div>

          {selectedMarket && (
            <WilliamsCOTChart
              marketId={selectedMarket.marketId}
              symbol={selectedMarket.symbol}
              lookBackWeeks={lookBackWeeks}
              showPriceOverlay={showPriceOverlay}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}