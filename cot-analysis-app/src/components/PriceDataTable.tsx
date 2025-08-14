'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface PriceTableData {
  date: string
  price_open: number
  price_high: number
  price_low: number
  price_close: number
  volume?: number
}

interface PriceDataTableProps {
  data: PriceTableData[]
  symbol: string
  loading?: boolean
  onDateHover?: (date: string | null) => void
  highlightedDate?: string | null
}

export default function PriceDataTable({ 
  data, 
  symbol, 
  loading = false,
  onDateHover,
  highlightedDate
}: PriceDataTableProps) {
  const formatPrice = (price: number, symbol: string) => {
    // Determine decimal places based on symbol type
    if (symbol.includes('USD') || symbol.includes('EUR') || symbol.includes('GBP') || symbol.includes('AUD') || symbol.includes('CAD')) {
      return price.toFixed(4) // Forex pairs - 4 decimals
    } else {
      return price.toFixed(2) // Commodities - 2 decimals
    }
  }

  const formatVolume = (volume?: number) => {
    if (!volume) return 'N/A'
    if (volume >= 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}K`
    }
    return volume.toString()
  }

  const calculateChange = (current: number, previous?: number) => {
    if (!previous) return { change: 0, percentage: 0 }
    const change = current - previous
    const percentage = (change / previous) * 100
    return { change, percentage }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit',
      year: 'numeric'
    })
  }

  const getPriceColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  const getPriceIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-3 h-3" />
    if (change < 0) return <TrendingDown className="w-3 h-3" />
    return <Minus className="w-3 h-3" />
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{symbol} - Price Data Table</CardTitle>
          <CardDescription>Historical price data in tabular format</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-lg">Loading price data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Sort data by date (most recent first)
  const sortedData = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{symbol} - Price Data Table</span>
          <Badge variant="outline" className="text-sm">
            {sortedData.length} records
          </Badge>
        </CardTitle>
        <CardDescription>
          Historical price data with OHLC values and daily changes
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white border-b-2 border-gray-200">
              <tr>
                <th className="text-left p-3 font-semibold">Date</th>
                <th className="text-right p-3 font-semibold">Open</th>
                <th className="text-right p-3 font-semibold">High</th>
                <th className="text-right p-3 font-semibold">Low</th>
                <th className="text-right p-3 font-semibold">Close</th>
                <th className="text-right p-3 font-semibold">Change</th>
                <th className="text-right p-3 font-semibold">Change %</th>
                {sortedData.some(row => row.volume) && (
                  <th className="text-right p-3 font-semibold">Volume</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, index) => {
                const previousRow = sortedData[index + 1]
                const { change, percentage } = calculateChange(row.price_close, previousRow?.price_close)
                
                return (
                  <tr 
                    key={`${row.date}-${index}`}
                    className={`border-b hover:bg-gray-50 transition-colors ${
                      highlightedDate === row.date ? 'bg-blue-50 ring-2 ring-blue-200' : ''
                    }`}
                    onMouseEnter={() => onDateHover?.(row.date)}
                    onMouseLeave={() => onDateHover?.(null)}
                  >
                    <td className="p-3 font-medium">
                      {formatDate(row.date)}
                    </td>
                    <td className="text-right p-3 font-mono">
                      {formatPrice(row.price_open, symbol)}
                    </td>
                    <td className="text-right p-3 font-mono text-green-600">
                      {formatPrice(row.price_high, symbol)}
                    </td>
                    <td className="text-right p-3 font-mono text-red-600">
                      {formatPrice(row.price_low, symbol)}
                    </td>
                    <td className="text-right p-3 font-mono font-semibold">
                      {formatPrice(row.price_close, symbol)}
                    </td>
                    <td className={`text-right p-3 font-mono ${getPriceColor(change)}`}>
                      <div className="flex items-center justify-end gap-1">
                        {getPriceIcon(change)}
                        {change >= 0 ? '+' : ''}{formatPrice(change, symbol)}
                      </div>
                    </td>
                    <td className={`text-right p-3 font-mono ${getPriceColor(change)}`}>
                      {change >= 0 ? '+' : ''}{percentage.toFixed(2)}%
                    </td>
                    {sortedData.some(row => row.volume) && (
                      <td className="text-right p-3 font-mono text-gray-600">
                        {formatVolume(row.volume)}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        
        {/* Price Data Legend */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="font-semibold text-sm mb-2">Price Data Information:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-2 bg-green-600"></div>
              <span>Daily High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-2 bg-red-600"></div>
              <span>Daily Low</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span>Price Increase</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-3 h-3 text-red-600" />
              <span>Price Decrease</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            * Prices formatted to {symbol.includes('USD') ? '4' : '2'} decimal places for {symbol.includes('USD') ? 'forex pairs' : 'commodities'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}