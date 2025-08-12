"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { DatabaseStatus } from "@/components/database-status"
import { ApiStatus } from "@/components/api-status"

// Mock data for now - we'll replace this with real data later
const mockMarkets = [
  {
    symbol: "EUR/USD",
    name: "Euro / US Dollar",
    category: "Currency",
    score: 72,
    bias: "Bullish",
    change: "+5.2%",
    lastUpdate: "2024-08-09"
  },
  {
    symbol: "GBP/USD", 
    name: "British Pound / US Dollar",
    category: "Currency",
    score: 28,
    bias: "Bearish",
    change: "-3.1%",
    lastUpdate: "2024-08-09"
  },
  {
    symbol: "USD/JPY",
    name: "US Dollar / Japanese Yen", 
    category: "Currency",
    score: 45,
    bias: "Neutral",
    change: "-0.8%",
    lastUpdate: "2024-08-09"
  },
  {
    symbol: "GOLD",
    name: "Gold Futures",
    category: "Commodity", 
    score: 88,
    bias: "Bullish",
    change: "+12.3%",
    lastUpdate: "2024-08-09"
  },
  {
    symbol: "SILVER",
    name: "Silver Futures",
    category: "Commodity",
    score: 65,
    bias: "Bullish", 
    change: "+8.7%",
    lastUpdate: "2024-08-09"
  },
  {
    symbol: "CRUDE",
    name: "Crude Oil Futures",
    category: "Commodity",
    score: 35,
    bias: "Bearish",
    change: "-6.4%",
    lastUpdate: "2024-08-09"
  }
]

function getBiasIcon(bias: string) {
  switch (bias) {
    case "Bullish":
      return <TrendingUp className="h-4 w-4 text-green-600" />
    case "Bearish":
      return <TrendingDown className="h-4 w-4 text-red-600" />
    default:
      return <Minus className="h-4 w-4 text-gray-600" />
  }
}

function getBiasColor(bias: string) {
  switch (bias) {
    case "Bullish":
      return "bg-green-100 text-green-800"
    case "Bearish": 
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

function getScoreColor(score: number) {
  if (score >= 70) return "text-green-600"
  if (score <= 30) return "text-red-600"
  return "text-gray-600"
}

export default function Dashboard() {
  const currencies = mockMarkets.filter(m => m.category === "Currency")
  const commodities = mockMarkets.filter(m => m.category === "Commodity")

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">COT Analysis Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Real-time Commitment of Traders analysis for major markets
        </p>
      </div>

      {/* System Status Components */}
      <DatabaseStatus />
      <ApiStatus />

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Markets</TabsTrigger>
          <TabsTrigger value="currencies">Currencies</TabsTrigger>
          <TabsTrigger value="commodities">Commodities</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockMarkets.map((market) => (
              <Card key={market.symbol} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{market.symbol}</CardTitle>
                    <Badge className={getBiasColor(market.bias)}>
                      <div className="flex items-center gap-1">
                        {getBiasIcon(market.bias)}
                        {market.bias}
                      </div>
                    </Badge>
                  </div>
                  <CardDescription>{market.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">COT Score</span>
                      <span className={`text-2xl font-bold ${getScoreColor(market.score)}`}>
                        {market.score}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Weekly Change</span>
                      <span className={`text-sm font-medium ${
                        market.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {market.change}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Updated: {market.lastUpdate}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="currencies" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {currencies.map((market) => (
              <Card key={market.symbol} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{market.symbol}</CardTitle>
                    <Badge className={getBiasColor(market.bias)}>
                      <div className="flex items-center gap-1">
                        {getBiasIcon(market.bias)}
                        {market.bias}
                      </div>
                    </Badge>
                  </div>
                  <CardDescription>{market.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">COT Score</span>
                      <span className={`text-2xl font-bold ${getScoreColor(market.score)}`}>
                        {market.score}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Weekly Change</span>
                      <span className={`text-sm font-medium ${
                        market.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {market.change}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Updated: {market.lastUpdate}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="commodities" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {commodities.map((market) => (
              <Card key={market.symbol} className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{market.symbol}</CardTitle>
                    <Badge className={getBiasColor(market.bias)}>
                      <div className="flex items-center gap-1">
                        {getBiasIcon(market.bias)}
                        {market.bias}
                      </div>
                    </Badge>
                  </div>
                  <CardDescription>{market.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">COT Score</span>
                      <span className={`text-2xl font-bold ${getScoreColor(market.score)}`}>
                        {market.score}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Weekly Change</span>
                      <span className={`text-sm font-medium ${
                        market.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {market.change}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Updated: {market.lastUpdate}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}