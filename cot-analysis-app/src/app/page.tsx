import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, BarChart3, Users } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <Badge variant="secondary" className="mx-auto">
          Professional COT Analysis Platform
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Master Market Sentiment with
          <span className="text-blue-600"> COT Reports</span>
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-gray-600">
          Analyze Commitment of Traders data for currencies and commodities. 
          Get clear market bias signals to inform your long-term trading decisions.
        </p>
        <div className="flex justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/williams-cot">Williams COT Analysis</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/dashboard">Basic Dashboard</Link>
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <CardTitle>Real-Time COT Data</CardTitle>
            </div>
            <CardDescription>
              Weekly updates from CFTC with comprehensive position data for major currencies and commodities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• EUR/USD, GBP/USD, USD/JPY</li>
              <li>• Gold, Silver, Crude Oil</li>
              <li>• Legacy COT report format</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-6 w-6 text-green-600" />
              <CardTitle>Interactive Charts</CardTitle>
            </div>
            <CardDescription>
              Beautiful, responsive charts with price overlays and multiple timeframes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Weekly, Daily, 4H timeframes</li>
              <li>• Price data overlay</li>
              <li>• Modern, clean design</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-purple-600" />
              <CardTitle>Williams COT System</CardTitle>
            </div>
            <CardDescription>
              Larry Williams' proven 50+ year methodology with normalized indices and signal zones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Normalized 0-100 scale indices</li>
              <li>• Extreme signal detection (90%/10%)</li>
              <li>• Commercial vs speculator analysis</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-50 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Ready to Analyze Market Sentiment?
        </h2>
        <p className="text-gray-600 mb-6">
          Start exploring COT data and discover the market positioning that drives price movements.
        </p>
        <Button asChild size="lg">
          <Link href="/williams-cot">Start Williams Analysis</Link>
        </Button>
      </div>
    </div>
  );
}
