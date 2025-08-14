'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  createChart,
  IChartApi,
  ISeriesApi,
  ColorType,
  UTCTimestamp
} from 'lightweight-charts'

interface CandlestickData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface LightweightCandlestickChartProps {
  data: CandlestickData[]
  symbol: string
  height?: number
  showVolume?: boolean
}

export default function LightweightCandlestickChart({
  data,
  symbol,
  height = 350,
  showVolume = false
}: LightweightCandlestickChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current) return

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
          bottom: showVolume ? 0.3 : 0.1,
        },
      },
    })

    chartRef.current = chart

    // Add candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#10b981', // green-500
      downColor: '#ef4444', // red-500
      borderUpColor: '#10b981',
      borderDownColor: '#ef4444',
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })
    candlestickSeriesRef.current = candlestickSeries

    // Add volume series if requested
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: '#9ca3af',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: 'volume',
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      })
      volumeSeriesRef.current = volumeSeries

      // Create volume price scale
      chart.priceScale('volume').applyOptions({
        scaleMargins: {
          top: 0.7,
          bottom: 0,
        },
      })
    }


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
  }, [height, showVolume])

  // Update data when data prop changes
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current) {
      return
    }

    if (data.length > 0) {
      // Convert data to Lightweight Charts candlestick format
      const candlestickData = data.map(item => ({
        time: (new Date(item.date).getTime() / 1000) as UTCTimestamp,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }))

      // Set candlestick data
      candlestickSeriesRef.current.setData(candlestickData)

      // Set volume data if available
      if (showVolume && volumeSeriesRef.current && data.some(item => item.volume)) {
        const volumeData = data
          .filter(item => item.volume && item.volume > 0)
          .map(item => ({
            time: (new Date(item.date).getTime() / 1000) as UTCTimestamp,
            value: item.volume!,
            color: item.close >= item.open ? '#10b981' : '#ef4444',
          }))

        volumeSeriesRef.current.setData(volumeData)
      }

      // Fit content
      chartRef.current.timeScale().fitContent()
    }
  }, [data, showVolume])

  const formatPrice = (price: number) => {
    // Determine decimal places based on symbol type
    if (symbol.includes('USD') || symbol.includes('EUR') || symbol.includes('GBP') || symbol.includes('AUD') || symbol.includes('CAD')) {
      return price.toFixed(4) // Forex pairs - 4 decimals
    } else {
      return price.toFixed(2) // Commodities - 2 decimals
    }
  }

  const calculateStats = () => {
    if (data.length === 0) return null

    const validData = data.filter(d => 
      d.open > 0 && d.high > 0 && d.low > 0 && d.close > 0
    )

    if (validData.length === 0) return null

    const latest = validData[0]
    const change = latest.close - latest.open
    const changePercent = (change / latest.open) * 100
    const range = latest.high - latest.low
    
    return {
      latest,
      change,
      changePercent,
      range,
      dataCount: validData.length
    }
  }

  const stats = calculateStats()

  return (
    <div className="w-full">
      {/* Chart Header with Stats */}
      {stats && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold">{symbol} - Price Action</h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-1 bg-gray-100 rounded">
                {stats.dataCount} candles
              </span>
              <span className="px-2 py-1 bg-gray-100 rounded">
                OHLC Data
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="font-semibold">Open</div>
              <div className="text-lg">{formatPrice(stats.latest.open)}</div>
            </div>
            <div>
              <div className="font-semibold">Close</div>
              <div className={`text-lg ${stats.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPrice(stats.latest.close)}
              </div>
            </div>
            <div>
              <div className="font-semibold">High</div>
              <div className="text-lg text-green-600">{formatPrice(stats.latest.high)}</div>
            </div>
            <div>
              <div className="font-semibold">Low</div>
              <div className="text-lg text-red-600">{formatPrice(stats.latest.low)}</div>
            </div>
          </div>
          
          <div className="mt-2 flex justify-between items-center text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-500">Change:</span>
              <span className={`font-medium ${stats.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.change >= 0 ? '+' : ''}{formatPrice(stats.change)} ({stats.changePercent.toFixed(2)}%)
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-500">Range:</span>
              <span>{formatPrice(stats.range)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div ref={chartContainerRef} style={{ height: height }} className="w-full" />

      {/* Chart Legend */}
      <div className="mt-2 text-center">
        <div className="flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-green-500 opacity-80 border border-green-500"></div>
            <span>Bullish Candle</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-red-500 border border-red-500"></div>
            <span>Bearish Candle</span>
          </div>
          {showVolume && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-3 bg-gray-400"></div>
              <span>Volume</span>
            </div>
          )}
          <div className="text-xs text-gray-500">
            {symbol} Price Action • OHLC Candlesticks
          </div>
        </div>
      </div>
    </div>
  )
}