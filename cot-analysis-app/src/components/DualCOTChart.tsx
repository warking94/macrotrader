'use client'

import React, { useState, useEffect } from 'react'
import LightweightCOTChart from './LightweightCOTChart'
import LightweightCandlestickChart from './LightweightCandlestickChart'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UTCTimestamp } from 'lightweight-charts'

interface DualCOTChartProps {
  marketId: number
  symbol: string
  lookBackWeeks?: number
}

interface CandlestickData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export default function DualCOTChart({ 
  marketId, 
  symbol, 
  lookBackWeeks = 52
}: DualCOTChartProps) {
  const [priceData, setPriceData] = useState<CandlestickData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncedTime, setSyncedTime] = useState<UTCTimestamp | null>(null)

  useEffect(() => {
    fetchPriceData()
  }, [marketId, lookBackWeeks])

  const fetchPriceData = async () => {
    try {
      setLoading(true)
      
      // Calculate full date range for complete price context
      // Instead of using COT dates, get complete daily data for the lookback period
      const today = new Date()
      const lookbackDays = lookBackWeeks * 7 // Convert weeks to days
      const startDate = new Date(today.getTime() - (lookbackDays * 24 * 60 * 60 * 1000))
      
      const endDateStr = today.toISOString().split('T')[0] // YYYY-MM-DD
      const startDateStr = startDate.toISOString().split('T')[0] // YYYY-MM-DD
      
      console.log(`Fetching price data for ${symbol}: ${startDateStr} to ${endDateStr} (${lookbackDays} days)`)
      
      // Fetch complete daily price data for the full period
      const priceResponse = await fetch(
        `/api/price-data?action=range&marketId=${marketId}&startDate=${startDateStr}&endDate=${endDateStr}`
      )
      const priceResult = await priceResponse.json()
      
      if (priceResult.success && priceResult.data.length > 0) {
        // Transform price data to candlestick format
        const candlestickData = priceResult.data.map((item: any) => ({
          date: item.date,
          open: item.open_price || 0,
          high: item.high_price || 0,
          low: item.low_price || 0,
          close: item.close_price || 0,
          volume: item.volume
        })).filter((item: CandlestickData) => 
          item.open > 0 && item.high > 0 && item.low > 0 && item.close > 0
        )
        
        console.log(`Price data loaded: ${candlestickData.length} daily candles`)
        setPriceData(candlestickData)
      } else {
        console.log('No price data found or API call failed:', priceResult)
        setPriceData([])
      }
    } catch (err) {
      setError('Failed to fetch price data')
      console.error('Error fetching price data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toISOString().split('T')[0] // YYYY-MM-DD format
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{symbol} - COT Analysis & Price Action</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    )
  }

  // Handle time synchronization between charts - temporarily disabled to fix disappearing data
  const handleCOTTimeSync = (time: UTCTimestamp | null) => {
    // Temporarily disable sync to prevent data disappearing
    console.log('COT time sync (disabled):', time)
    // setSyncedTime(time)
  }

  const handleCandlestickTimeSync = (time: UTCTimestamp | null) => {
    // Temporarily disable sync to prevent data disappearing
    console.log('Candlestick time sync (disabled):', time)
    // setSyncedTime(time)
  }

  return (
    <div className="space-y-6">
      {/* COT Analysis Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{symbol} - Williams COT Analysis</span>
            <Badge variant="outline" className="text-sm">
              COT Sentiment
            </Badge>
          </CardTitle>
          <CardDescription>
            Commercial vs Large Trader positioning with Williams' signal zones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LightweightCOTChart
            marketId={marketId}
            symbol={symbol}
            lookBackWeeks={lookBackWeeks}
            height={350}
          />
        </CardContent>
      </Card>

      {/* Price Action Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{symbol} - Price Action</span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {priceData.length} candles
              </Badge>
              <Badge variant="outline" className="text-sm">
                OHLC Data
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            Candlestick chart showing price movements synchronized with COT analysis above
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-lg">Loading price data...</div>
            </div>
          ) : priceData.length > 0 ? (
            <LightweightCandlestickChart
              data={priceData}
              symbol={symbol}
              height={350}
              showVolume={true}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <div className="text-lg mb-2">No price data available</div>
                <div className="text-sm">Price data may not be available for the selected time period</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analysis Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Correlation Analysis Guide</CardTitle>
          <CardDescription>
            How to analyze the relationship between COT sentiment and price action
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Williams COT Signals (Top Chart):</h4>
              <ul className="space-y-1 text-xs">
                <li>• <strong className="text-green-600">90%+ Commercial Index</strong>: Extreme buy signal</li>
                <li>• <strong className="text-green-500">80-90% Commercial</strong>: Buy setup zone</li>
                <li>• <strong className="text-red-500">10-20% Commercial</strong>: Sell setup zone</li>
                <li>• <strong className="text-red-600">0-10% Commercial</strong>: Extreme sell signal</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Price Action Analysis (Bottom Chart):</h4>
              <ul className="space-y-1 text-xs">
                <li>• <strong className="text-green-600">Green candles</strong>: Bullish price movement</li>
                <li>• <strong className="text-red-600">Red candles</strong>: Bearish price movement</li>
                <li>• <strong>Long wicks</strong>: Rejection of highs/lows</li>
                <li>• <strong>Body size</strong>: Strength of price movement</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Key Analysis Points:</h4>
            <div className="text-xs text-blue-800 space-y-1">
              <div>• Look for Williams extreme COT readings followed by price reversals in the candlestick chart</div>
              <div>• High confidence COT signals (80%+) often correlate with strong price movements</div>
              <div>• Divergences between COT sentiment and price trends can signal major turning points</div>
              <div>• Commercial extreme positioning is most reliable for identifying market reversals</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}