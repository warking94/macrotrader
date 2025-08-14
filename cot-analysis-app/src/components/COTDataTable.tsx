'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface COTTableData {
  date: string
  reportDate: string
  commercialIndex: number
  largeTraderIndex: number
  overallScore: number
  bias: string
  confidence: number
  extremeLevel: boolean
  commercialSignal: string
  largeTraderSignal: string
}

interface COTDataTableProps {
  data: COTTableData[]
  symbol: string
  loading?: boolean
  onDateHover?: (date: string | null) => void
  highlightedDate?: string | null
}

export default function COTDataTable({ 
  data, 
  symbol, 
  loading = false,
  onDateHover,
  highlightedDate
}: COTDataTableProps) {
  const getSignalColor = (bias: string) => {
    switch (bias) {
      case 'BULLISH': return 'bg-green-500'
      case 'BEARISH': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getIndexColor = (index: number) => {
    if (index >= 90) return 'text-green-600 font-bold'
    if (index >= 80) return 'text-green-500 font-semibold'
    if (index <= 10) return 'text-red-600 font-bold'
    if (index <= 20) return 'text-red-500 font-semibold'
    return 'text-gray-700'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 font-bold'
    if (confidence >= 80) return 'text-green-500 font-semibold'
    if (confidence >= 70) return 'text-yellow-600 font-medium'
    return 'text-gray-600'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: '2-digit',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{symbol} - Williams COT Analysis Table</CardTitle>
          <CardDescription>Historical COT data in tabular format</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="text-lg">Loading COT data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{symbol} - Williams COT Analysis Table</span>
          <Badge variant="outline" className="text-sm">
            {data.length} records
          </Badge>
        </CardTitle>
        <CardDescription>
          Historical Williams COT analysis with normalized indices and signal zones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white border-b-2 border-gray-200">
              <tr>
                <th className="text-left p-3 font-semibold">Date</th>
                <th className="text-center p-3 font-semibold">Commercial<br/>Index</th>
                <th className="text-center p-3 font-semibold">Large Trader<br/>Index</th>
                <th className="text-center p-3 font-semibold">Overall<br/>Score</th>
                <th className="text-center p-3 font-semibold">Bias</th>
                <th className="text-center p-3 font-semibold">Confidence</th>
                <th className="text-center p-3 font-semibold">Commercial<br/>Signal</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr 
                  key={`${row.reportDate}-${index}`}
                  className={`border-b hover:bg-gray-50 transition-colors ${
                    row.extremeLevel ? 'bg-yellow-50' : ''
                  } ${
                    highlightedDate === row.reportDate ? 'bg-blue-50 ring-2 ring-blue-200' : ''
                  }`}
                  onMouseEnter={() => onDateHover?.(row.reportDate)}
                  onMouseLeave={() => onDateHover?.(null)}
                >
                  <td className="p-3 font-medium">
                    <div className="flex items-center gap-2">
                      {formatDate(row.reportDate)}
                      {row.extremeLevel && (
                        <span className="text-red-600 text-xs">⚠️</span>
                      )}
                    </div>
                  </td>
                  <td className="text-center p-3">
                    <span className={getIndexColor(row.commercialIndex)}>
                      {Math.round(row.commercialIndex)}%
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <span className="text-purple-600 font-medium">
                      {Math.round(row.largeTraderIndex)}%
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <span className="font-medium">
                      {Math.round(row.overallScore)}%
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <Badge className={`text-xs ${getSignalColor(row.bias)}`}>
                      {row.bias}
                    </Badge>
                  </td>
                  <td className="text-center p-3">
                    <span className={getConfidenceColor(row.confidence)}>
                      {row.confidence}%
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <div className="text-xs">
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        row.commercialSignal.includes('EXTREME') ? 'bg-red-100 text-red-700' :
                        row.commercialSignal.includes('SETUP') ? 'bg-orange-100 text-orange-700' :
                        row.commercialSignal === 'BULLISH' ? 'bg-green-100 text-green-700' :
                        row.commercialSignal === 'BEARISH' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {row.commercialSignal.replace('_', ' ')}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Signal Legend */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="font-semibold text-sm mb-2">Williams' Signal Zones:</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-2 bg-green-600"></div>
              <span>Extreme Buy (90-100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-2 bg-green-500"></div>
              <span>Buy Setup (80-90%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-2 bg-red-500"></div>
              <span>Sell Setup (10-20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-2 bg-red-600"></div>
              <span>Extreme Sell (0-10%)</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}