'use client'

import React, { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  ComposedChart
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface COTChartData {
  date: string
  commercialIndex: number
  largeTraderIndex: number
  overallScore: number
  bias: string
  confidence: number
  extremeLevel: boolean
  priceClose?: number
  priceOpen?: number
  priceHigh?: number
  priceLow?: number
}

interface WilliamsCOTChartProps {
  marketId: number
  symbol: string
  lookBackWeeks?: number
  showPriceOverlay?: boolean
}

export default function WilliamsCOTChart({ 
  marketId, 
  symbol, 
  lookBackWeeks = 52,
  showPriceOverlay = false
}: WilliamsCOTChartProps) {
  const [chartData, setChartData] = useState<COTChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentScore, setCurrentScore] = useState<any>(null)
  const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null)

  useEffect(() => {
    fetchCOTData()
  }, [marketId, lookBackWeeks, showPriceOverlay])

  const fetchCOTData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/williams-cot?action=market&marketId=${marketId}&lookBack=${lookBackWeeks}`)
      const result = await response.json()

      if (result.success) {
        let chartData = result.data.historical.map((score: any) => ({
          date: formatDate(score.reportDate),
          commercialIndex: Math.round(score.commercialIndex * 10) / 10,
          largeTraderIndex: Math.round(score.largeTraderIndex * 10) / 10,
          overallScore: Math.round(score.overallScore * 10) / 10,
          bias: score.bias,
          confidence: score.confidence,
          extremeLevel: score.extremeLevel,
          reportDate: score.reportDate
        }))

        // Fetch price data overlay if enabled
        if (showPriceOverlay) {
          try {
            const latestDate = chartData[0]?.reportDate
            const oldestDate = chartData[chartData.length - 1]?.reportDate
            
            if (oldestDate && latestDate) {
              const priceResponse = await fetch(
                `/api/price-data?action=combined&marketId=${marketId}&startDate=${oldestDate}&endDate=${latestDate}`
              )
              const priceResult = await priceResponse.json()
              
              if (priceResult.success && priceResult.data.length > 0) {
                // Create a map of COT dates to price data
                const priceMap = new Map()
                priceResult.data.forEach((item: any) => {
                  priceMap.set(item.date, {
                    priceClose: item.price_close,
                    priceOpen: item.price_open,
                    priceHigh: item.price_high,
                    priceLow: item.price_low
                  })
                })

                // Merge price data with COT data
                chartData = chartData.map(cotItem => {
                  const priceData = priceMap.get(cotItem.reportDate)
                  return {
                    ...cotItem,
                    ...priceData
                  }
                })

                // Calculate price range for Y-axis scaling
                const prices = priceResult.data.map((item: any) => item.price_close).filter(Boolean)
                if (prices.length > 0) {
                  setPriceRange({
                    min: Math.min(...prices),
                    max: Math.max(...prices)
                  })
                }
              }
            }
          } catch (priceError) {
            console.warn('Failed to fetch price data overlay:', priceError)
            // Continue without price data if it fails
          }
        }

        setChartData(chartData)
        setCurrentScore(result.data.currentScore)
      } else {
        setError(result.message)
      }
    } catch (err) {
      setError('Failed to fetch COT data')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toISOString().split('T')[0] // YYYY-MM-DD format
  }

  const getSignalColor = (bias: string) => {
    switch (bias) {
      case 'BULLISH': return 'bg-green-500'
      case 'BEARISH': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600'
    if (confidence >= 70) return 'text-yellow-600'
    return 'text-gray-600'
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{symbol} - Williams COT Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading COT analysis...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{symbol} - Williams COT Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-500">Error: {error}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{symbol} - Williams COT Analysis</span>
          {currentScore && (
            <div className="flex items-center gap-2">
              <Badge className={getSignalColor(currentScore.bias)}>
                {currentScore.bias}
              </Badge>
              <span className={`font-bold ${getConfidenceColor(currentScore.confidence)}`}>
                {currentScore.confidence}%
              </span>
            </div>
          )}
        </CardTitle>
        <CardDescription>
          Williams normalized COT indices (0-100 scale) with signal zones
          {showPriceOverlay && ' and price overlay for correlation analysis'}
        </CardDescription>
        {currentScore && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
            <div>
              <div className="font-semibold">Commercial Index</div>
              <div className="text-lg">{Math.round(currentScore.commercialIndex)}%</div>
              <div className="text-xs text-gray-500">{currentScore.commercialSignal}</div>
            </div>
            <div>
              <div className="font-semibold">Large Trader Index</div>
              <div className="text-lg">{Math.round(currentScore.largeTraderIndex)}%</div>
              <div className="text-xs text-gray-500">{currentScore.largeTraderSignal}</div>
            </div>
            <div>
              <div className="font-semibold">Overall Score</div>
              <div className="text-lg">{Math.round(currentScore.overallScore)}%</div>
              <div className="text-xs text-gray-500">
                {currentScore.extremeLevel ? 'EXTREME' : 'Normal'}
              </div>
            </div>
            <div>
              <div className="font-semibold">Confidence</div>
              <div className="text-lg">{currentScore.confidence}%</div>
              <div className="text-xs text-gray-500">
                Last: {formatDate(currentScore.reportDate)}
              </div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {showPriceOverlay ? (
              <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              
              {/* Williams' Signal Zones */}
              {/* Extreme Buy Zone (90-100) */}
              <ReferenceArea y1={90} y2={100} fill="#22c55e" fillOpacity={0.1} />
              {/* Buy Setup Zone (80-90) */}
              <ReferenceArea y1={80} y2={90} fill="#84cc16" fillOpacity={0.1} />
              {/* Sell Setup Zone (10-20) */}
              <ReferenceArea y1={10} y2={20} fill="#f97316" fillOpacity={0.1} />
              {/* Extreme Sell Zone (0-10) */}
              <ReferenceArea y1={0} y2={10} fill="#ef4444" fillOpacity={0.1} />
              
              {/* Williams' Key Signal Lines */}
              <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="5 5" opacity={0.7} />
              <ReferenceLine y={80} stroke="#84cc16" strokeDasharray="5 5" opacity={0.5} />
              <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="3 3" opacity={0.3} />
              <ReferenceLine y={20} stroke="#f97316" strokeDasharray="5 5" opacity={0.5} />
              <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="5 5" opacity={0.7} />
              
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <YAxis 
                yAxisId="cot"
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
                orientation="left"
              />
              {showPriceOverlay && priceRange && (
                <YAxis 
                  yAxisId="price"
                  domain={[priceRange.min * 0.999, priceRange.max * 1.001]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => value.toFixed(4)}
                  orientation="right"
                />
              )}
              
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <div className="font-semibold">{new Date(label).toLocaleDateString()}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4">
                            <span>Commercial:</span>
                            <span className="font-medium text-blue-600">
                              {data.commercialIndex}%
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Large Trader:</span>
                            <span className="font-medium text-purple-600">
                              {data.largeTraderIndex}%
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Overall:</span>
                            <span className="font-medium text-gray-700">
                              {data.overallScore}%
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Bias:</span>
                            <Badge className={`text-xs ${getSignalColor(data.bias)}`}>
                              {data.bias}
                            </Badge>
                          </div>
                          {showPriceOverlay && data.priceClose && (
                            <div className="border-t pt-1 mt-1">
                              <div className="flex justify-between gap-4">
                                <span>Price:</span>
                                <span className="font-medium text-green-600">
                                  {data.priceClose.toFixed(4)}
                                </span>
                              </div>
                              {data.priceHigh && data.priceLow && (
                                <div className="flex justify-between gap-4 text-xs text-gray-500">
                                  <span>H/L:</span>
                                  <span>{data.priceHigh.toFixed(4)} / {data.priceLow.toFixed(4)}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {data.extremeLevel && (
                            <div className="text-xs text-red-600 font-semibold">
                              ⚠️ EXTREME LEVEL
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                content={({ payload }) => (
                  <div className="flex justify-center gap-6 text-sm mt-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-blue-500"></div>
                      <span>Commercial Index (Hedgers)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-purple-500"></div>
                      <span>Large Trader Index (Funds)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-gray-600"></div>
                      <span>Overall Score</span>
                    </div>
                    {showPriceOverlay && (
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-green-500"></div>
                        <span>Price</span>
                      </div>
                    )}
                  </div>
                )}
              />
              
              <Line
                type="monotone"
                dataKey="commercialIndex"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 0, r: 1 }}
                activeDot={{ r: 4, fill: '#3b82f6' }}
                yAxisId="cot"
              />
              <Line
                type="monotone"
                dataKey="largeTraderIndex"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 1 }}
                activeDot={{ r: 4, fill: '#8b5cf6' }}
                yAxisId="cot"
              />
              <Line
                type="monotone"
                dataKey="overallScore"
                stroke="#6b7280"
                strokeWidth={1}
                strokeDasharray="2 2"
                dot={false}
                activeDot={{ r: 3, fill: '#6b7280' }}
                yAxisId="cot"
              />
              {showPriceOverlay && (
                <Line
                  type="monotone"
                  dataKey="priceClose"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 0, r: 1 }}
                  activeDot={{ r: 4, fill: '#10b981' }}
                  yAxisId="price"
                />
              )}
              </ComposedChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              
              {/* Williams' Signal Zones */}
              {/* Extreme Buy Zone (90-100) */}
              <ReferenceArea y1={90} y2={100} fill="#22c55e" fillOpacity={0.1} />
              {/* Buy Setup Zone (80-90) */}
              <ReferenceArea y1={80} y2={90} fill="#84cc16" fillOpacity={0.1} />
              {/* Sell Setup Zone (10-20) */}
              <ReferenceArea y1={10} y2={20} fill="#f97316" fillOpacity={0.1} />
              {/* Extreme Sell Zone (0-10) */}
              <ReferenceArea y1={0} y2={10} fill="#ef4444" fillOpacity={0.1} />
              
              {/* Williams' Key Signal Lines */}
              <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="5 5" opacity={0.7} />
              <ReferenceLine y={80} stroke="#84cc16" strokeDasharray="5 5" opacity={0.5} />
              <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="3 3" opacity={0.3} />
              <ReferenceLine y={20} stroke="#f97316" strokeDasharray="5 5" opacity={0.5} />
              <ReferenceLine y={10} stroke="#ef4444" strokeDasharray="5 5" opacity={0.7} />
              
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return `${date.getMonth() + 1}/${date.getDate()}`
                }}
              />
              <YAxis 
                yAxisId="cot"
                domain={[0, 100]}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
                orientation="left"
              />
              
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-white p-3 border rounded shadow-lg">
                        <div className="font-semibold">{new Date(label).toLocaleDateString()}</div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between gap-4">
                            <span>Commercial:</span>
                            <span className="font-medium text-blue-600">
                              {data.commercialIndex}%
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Large Trader:</span>
                            <span className="font-medium text-purple-600">
                              {data.largeTraderIndex}%
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Overall:</span>
                            <span className="font-medium text-gray-700">
                              {data.overallScore}%
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span>Bias:</span>
                            <Badge className={`text-xs ${getSignalColor(data.bias)}`}>
                              {data.bias}
                            </Badge>
                          </div>
                          {data.extremeLevel && (
                            <div className="text-xs text-red-600 font-semibold">
                              ⚠️ EXTREME LEVEL
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  }
                  return null
                }}
              />
              
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                content={({ payload }) => (
                  <div className="flex justify-center gap-6 text-sm mt-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-blue-500"></div>
                      <span>Commercial Index (Hedgers)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-purple-500"></div>
                      <span>Large Trader Index (Funds)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-0.5 bg-gray-600"></div>
                      <span>Overall Score</span>
                    </div>
                  </div>
                )}
              />
              
              <Line
                type="monotone"
                dataKey="commercialIndex"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 0, r: 1 }}
                activeDot={{ r: 4, fill: '#3b82f6' }}
                yAxisId="cot"
              />
              <Line
                type="monotone"
                dataKey="largeTraderIndex"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 1 }}
                activeDot={{ r: 4, fill: '#8b5cf6' }}
                yAxisId="cot"
              />
              <Line
                type="monotone"
                dataKey="overallScore"
                stroke="#6b7280"
                strokeWidth={1}
                strokeDasharray="2 2"
                dot={false}
                activeDot={{ r: 3, fill: '#6b7280' }}
                yAxisId="cot"
              />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Williams' Signal Zone Legend */}
        <div className="mt-4 text-xs">
          <div className="font-semibold mb-2">Williams' Signal Zones:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-green-500 opacity-30"></div>
              <span>Extreme Buy (90-100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-lime-500 opacity-30"></div>
              <span>Buy Setup (80-90%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-orange-500 opacity-30"></div>
              <span>Sell Setup (10-20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 bg-red-500 opacity-30"></div>
              <span>Extreme Sell (0-10%)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}