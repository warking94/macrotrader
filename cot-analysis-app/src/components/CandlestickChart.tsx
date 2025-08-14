'use client'

import React from 'react'
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

interface CandlestickData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface CandlestickChartProps {
  data: CandlestickData[]
  symbol: string
  height?: number
  showVolume?: boolean
  onDateHover?: (date: string | null) => void
  highlightedDate?: string | null
}

// Custom candlestick bar component
const CandlestickBar = (props: any) => {
  const { payload, x, y, width, height } = props
  
  if (!payload || typeof payload.open !== 'number' || typeof payload.close !== 'number') {
    return null
  }

  const { open, high, low, close } = payload
  const isGreen = close >= open
  const color = isGreen ? '#10b981' : '#ef4444' // green-500 : red-500
  
  // Since Recharts Bar uses 'close' as the dataKey, the y coordinate should represent
  // where the close price is positioned. We'll use this as our reference point.
  
  // Calculate the total height needed for this candlestick's range
  const candleRange = high - low
  if (candleRange <= 0) {
    return null
  }
  
  // We need to position other prices relative to the close price
  // Assuming the Bar component positions y at the close price location
  const closeY = y
  const scale = height / candleRange // This is wrong approach - let me fix it
  
  // Better approach: use proportional positioning within the available height
  // The height parameter should represent the total available chart area
  
  // For now, let's use a simpler approach - position everything relative to close
  const pricePerPixel = candleRange / (height * 0.8) // Use 80% of height for price range
  
  const highY = closeY - (high - close) / pricePerPixel
  const lowY = closeY + (close - low) / pricePerPixel
  const openY = closeY - (open - close) / pricePerPixel
  
  // Calculate positions for the candlestick body
  const centerX = x + width / 2
  const bodyTop = Math.min(openY, closeY)
  const bodyBottom = Math.max(openY, closeY)
  const bodyHeight = Math.abs(closeY - openY)
  
  // Handle doji (open = close) - ensure minimum visible height
  const minBodyHeight = 1
  const actualBodyHeight = Math.max(bodyHeight, minBodyHeight)
  
  return (
    <g>
      {/* High-Low line (wick) */}
      <line
        x1={centerX}
        y1={highY}
        x2={centerX}
        y2={lowY}
        stroke={color}
        strokeWidth={1}
      />
      
      {/* Open-Close body */}
      <rect
        x={x + width * 0.2}
        y={bodyTop}
        width={width * 0.6}
        height={actualBodyHeight}
        fill={isGreen ? color : color}
        stroke={color}
        strokeWidth={1}
        opacity={isGreen ? 0.8 : 1}
      />
    </g>
  )
}

export default function CandlestickChart({
  data,
  symbol,
  height = 300,
  showVolume = false,
  onDateHover,
  highlightedDate
}: CandlestickChartProps) {
  
  const formatPrice = (price: number) => {
    // Determine decimal places based on symbol type
    if (symbol.includes('USD') || symbol.includes('EUR') || symbol.includes('GBP') || symbol.includes('AUD') || symbol.includes('CAD')) {
      return price.toFixed(4) // Forex pairs - 4 decimals
    } else {
      return price.toFixed(2) // Commodities - 2 decimals
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // Prepare data for chart
  const chartData = data.map(item => ({
    ...item,
    // Normalize field names for the chart
    formattedDate: formatDate(item.date),
    priceRange: item.high - item.low,
    change: item.close - item.open,
    changePercent: ((item.close - item.open) / item.open) * 100
  }))

  // Viewport-based Y-axis scaling calculation
  const calculatePriceRange = () => {
    if (!data || data.length === 0) {
      return { min: 0, max: 100, padding: 5 }
    }

    // Filter out invalid price data
    const validData = data.filter(d => 
      d.open > 0 && d.high > 0 && d.low > 0 && d.close > 0 &&
      !isNaN(d.open) && !isNaN(d.high) && !isNaN(d.low) && !isNaN(d.close)
    )

    if (validData.length === 0) {
      return { min: 0, max: 100, padding: 5 }
    }

    // For viewport-based scaling, we'll focus on the most recent data that's visible
    // Typically charts show recent data prominently, so let's use a sliding window approach
    
    // Use the most recent 80% of data or minimum 20 candles for calculation
    const windowSize = Math.max(Math.floor(validData.length * 0.8), Math.min(20, validData.length))
    const recentData = validData.slice(0, windowSize) // Most recent data first
    
    // Calculate min/max from visible/recent data only
    const lows = recentData.map(d => d.low)
    const highs = recentData.map(d => d.high)
    const minPrice = Math.min(...lows)
    const maxPrice = Math.max(...highs)
    const visibleRange = maxPrice - minPrice

    // Use very minimal padding for maximum detail
    let paddingPercent = 0.015 // Default 1.5% padding
    
    // Adjust padding based on the visible range only
    if (visibleRange < 0.002) { // Very tight ranges (< 20 pips for forex)
      paddingPercent = 0.05 // 5% padding for very tight ranges
    } else if (visibleRange < 0.01) { // Normal forex ranges
      paddingPercent = 0.025 // 2.5% padding
    } else if (visibleRange < 0.05) { // Larger ranges
      paddingPercent = 0.015 // 1.5% padding
    } else { // Very large ranges
      paddingPercent = 0.01 // 1% padding
    }

    const padding = Math.max(visibleRange * paddingPercent, 0.0001)

    console.log(`Viewport scaling: visible data=${recentData.length}/${validData.length}, min=${minPrice}, max=${maxPrice}, visibleRange=${visibleRange}, padding=${padding} (${(paddingPercent*100).toFixed(1)}%)`)

    return {
      min: minPrice - padding,
      max: maxPrice + padding,
      padding: padding
    }
  }

  const priceRange = calculatePriceRange()
  
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 60, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          
          <XAxis 
            dataKey="formattedDate"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => value}
          />
          
          <YAxis 
            domain={[priceRange.min, priceRange.max]}
            tick={{ fontSize: 10 }}
            tickFormatter={formatPrice}
            orientation="left"
            width={60}
            tickCount={6}
          />
          
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length > 0) {
                const data = payload[0].payload
                const isGreen = data.close >= data.open
                
                return (
                  <div className="bg-white p-3 border rounded shadow-lg">
                    <div className="font-semibold mb-2">{new Date(data.date).toLocaleDateString()}</div>
                    <div className="space-y-1 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500">Open:</div>
                          <div className="font-medium">{formatPrice(data.open)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Close:</div>
                          <div className={`font-medium ${isGreen ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPrice(data.close)}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-500">High:</div>
                          <div className="font-medium text-green-600">{formatPrice(data.high)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Low:</div>
                          <div className="font-medium text-red-600">{formatPrice(data.low)}</div>
                        </div>
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between gap-4">
                          <span className="text-xs text-gray-500">Change:</span>
                          <span className={`text-sm font-medium ${isGreen ? 'text-green-600' : 'text-red-600'}`}>
                            {isGreen ? '+' : ''}{formatPrice(data.change)} ({data.changePercent.toFixed(2)}%)
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-xs text-gray-500">Range:</span>
                          <span className="text-sm">{formatPrice(data.priceRange)}</span>
                        </div>
                      </div>
                      {data.volume && (
                        <div className="border-t pt-1 mt-1">
                          <div className="flex justify-between gap-4">
                            <span className="text-xs text-gray-500">Volume:</span>
                            <span className="text-sm">{data.volume.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              }
              return null
            }}
          />
          
          {/* Candlestick bars */}
          <Bar
            dataKey="close"
            shape={<CandlestickBar />}
            isAnimationActive={false}
          />
          
        </ComposedChart>
      </ResponsiveContainer>
      
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
          <div className="text-xs text-gray-500">
            {symbol} Price Action • OHLC Candlesticks
          </div>
        </div>
      </div>
    </div>
  )
}