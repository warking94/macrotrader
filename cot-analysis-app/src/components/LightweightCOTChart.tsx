'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  LineStyle,
  ColorType,
  UTCTimestamp
} from 'lightweight-charts'

interface COTChartData {
  date: string
  commercialIndex: number
  largeTraderIndex: number
  overallScore: number
  bias: string
  confidence: number
  extremeLevel: boolean
  reportDate: string
}

interface LightweightCOTChartProps {
  marketId: number
  symbol: string
  lookBackWeeks?: number
  height?: number
  onTimeSync?: (time: UTCTimestamp | null) => void
}

export default function LightweightCOTChart({
  marketId,
  symbol,
  lookBackWeeks = 52,
  height = 350,
  onTimeSync
}: LightweightCOTChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const commercialSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const largeTraderSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  const overallScoreSeriesRef = useRef<ISeriesApi<"Line"> | null>(null)
  
  const [chartData, setChartData] = useState<COTChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentScore, setCurrentScore] = useState<any>(null)

  useEffect(() => {
    fetchCOTData()
  }, [marketId, lookBackWeeks])

  useEffect(() => {
    console.log('COT Chart useEffect triggered, container ready:', !!chartContainerRef.current)
    
    if (!chartContainerRef.current) {
      console.log('COT Chart container not ready, skipping initialization')
      return
    }

    console.log('Creating COT chart...')

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#ddd',
      },
      rightPriceScale: {
        borderColor: '#ddd',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    })

    console.log('Chart created, setting ref...')
    chartRef.current = chart
    console.log('Chart ref set successfully')

    // Create all three line series for COT data
    const commercialSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
      title: 'Commercial Index',
    })
    
    const largeTraderSeries = chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 2,
      title: 'Large Trader Index',
    })
    
    const overallScoreSeries = chart.addLineSeries({
      color: '#10b981',
      lineWidth: 3,
      title: 'Overall Score',
    })

    commercialSeriesRef.current = commercialSeries
    largeTraderSeriesRef.current = largeTraderSeries
    overallScoreSeriesRef.current = overallScoreSeries
    
    console.log('COT Chart series created successfully')

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [height])

  // Update data when chartData changes
  useEffect(() => {
    if (!chartRef.current || !commercialSeriesRef.current || !largeTraderSeriesRef.current || !overallScoreSeriesRef.current) {
      console.log('COT Chart refs not ready')
      return
    }

    if (chartData.length > 0) {
      console.log('Processing COT chart data:', chartData.length, 'points')
      
      // Convert data to Lightweight Charts format
      const commercialData = chartData.map(item => ({
        time: (new Date(item.reportDate).getTime() / 1000) as UTCTimestamp,
        value: item.commercialIndex
      }))

      const largeTraderData = chartData.map(item => ({
        time: (new Date(item.reportDate).getTime() / 1000) as UTCTimestamp,
        value: item.largeTraderIndex
      }))

      const overallScoreData = chartData.map(item => ({
        time: (new Date(item.reportDate).getTime() / 1000) as UTCTimestamp,
        value: item.overallScore
      }))

      console.log('Sample COT data:', {
        commercial: commercialData[0],
        largeTrader: largeTraderData[0],
        overall: overallScoreData[0]
      })

      try {
        // Set data to series
        commercialSeriesRef.current.setData(commercialData)
        largeTraderSeriesRef.current.setData(largeTraderData)
        overallScoreSeriesRef.current.setData(overallScoreData)

        // Fit content
        chartRef.current.timeScale().fitContent()
        
        console.log('COT data set successfully')
      } catch (error) {
        console.error('Error setting COT data:', error)
      }
    } else {
      console.log('No COT chart data available')
    }
  }, [chartData])

  const fetchCOTData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/williams-cot?action=market&marketId=${marketId}&lookBack=${lookBackWeeks}`)
      const result = await response.json()

      if (result.success) {
        const chartData = result.data.historical.map((score: any) => ({
          date: formatDate(score.reportDate),
          commercialIndex: Math.round(score.commercialIndex * 10) / 10,
          largeTraderIndex: Math.round(score.largeTraderIndex * 10) / 10,
          overallScore: Math.round(score.overallScore * 10) / 10,
          bias: score.bias,
          confidence: score.confidence,
          extremeLevel: score.extremeLevel,
          reportDate: score.reportDate
        }))

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

  // Don't return early - always render the chart container

  return (
    <div className="w-full">
      {/* Chart Header with Current Score */}
      {currentScore && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">{symbol} - Williams COT Analysis</h3>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-medium text-white ${getSignalColor(currentScore.bias)}`}>
                {currentScore.bias}
              </span>
              <span className={`font-bold ${getConfidenceColor(currentScore.confidence)}`}>
                {currentScore.confidence}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
        </div>
      )}

      {/* Chart Container */}
      <div className="relative w-full" style={{ height: height }}>
        <div ref={chartContainerRef} style={{ height: height }} className="w-full" />
        
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
            <div className="text-lg">Loading COT analysis...</div>
          </div>
        )}
        
        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
            <div className="text-red-500">Error: {error}</div>
          </div>
        )}
      </div>

      {/* Williams Signal Zone Legend */}
      <div className="mt-4 text-xs">
        <div className="font-semibold mb-2">Williams' Signal Zones:</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-500"></div>
            <span>Extreme Buy (90-100%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-lime-500"></div>
            <span>Buy Setup (80-90%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-orange-500"></div>
            <span>Sell Setup (10-20%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500"></div>
            <span>Extreme Sell (0-10%)</span>
          </div>
        </div>
      </div>
    </div>
  )
}