"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, RefreshCw, Link, ExternalLink } from 'lucide-react'

interface ApiTestResult {
  success: boolean
  message: string
  sampleData?: any
}

interface ApiTestResponse {
  timestamp: string
  tests: {
    cftc: ApiTestResult
    alphaVantage: ApiTestResult
  }
  overall: {
    success: boolean
    message: string
  }
}

export function ApiStatus() {
  const [status, setStatus] = useState<ApiTestResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const testApis = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-apis')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      setStatus({
        timestamp: new Date().toISOString(),
        tests: {
          cftc: {
            success: false,
            message: 'Failed to connect to API'
          },
          alphaVantage: {
            success: false,
            message: 'Failed to connect to API'
          }
        },
        overall: {
          success: false,
          message: 'API connection test failed'
        }
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testApis()
  }, [])

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-600" />
    ) : (
      <XCircle className="h-4 w-4 text-red-600" />
    )
  }

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? "default" : "destructive"} className={success ? "bg-green-100 text-green-800" : ""}>
        {success ? "Connected" : "Failed"}
      </Badge>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">API Status</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={testApis}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {loading ? 'Testing...' : 'Test APIs'}
          </Button>
        </div>
        <CardDescription>
          Connection status for external data sources
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !status && (
          <div className="flex items-center space-x-2 text-gray-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Testing API connections...</span>
          </div>
        )}

        {status && (
          <div className="space-y-6">
            {/* Overall Status */}
            <div className="flex items-center space-x-2">
              {getStatusIcon(status.overall.success)}
              <span className="font-medium">{status.overall.message}</span>
              <span className="text-sm text-gray-500">
                Last tested: {new Date(status.timestamp).toLocaleTimeString()}
              </span>
            </div>

            {/* Individual API Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CFTC API Status */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(status.tests.cftc.success)}
                    <span className="font-medium text-sm">CFTC API</span>
                  </div>
                  {getStatusBadge(status.tests.cftc.success)}
                </div>
                <p className="text-sm text-gray-600 mb-2">{status.tests.cftc.message}</p>
                {status.tests.cftc.success && status.tests.cftc.sampleData && (
                  <div className="text-xs bg-green-50 p-2 rounded border">
                    <div className="font-semibold text-green-900">Latest COT Data:</div>
                    <div className="text-green-700">
                      Market: {status.tests.cftc.sampleData.marketCode}<br/>
                      Date: {new Date(status.tests.cftc.sampleData.reportDate).toLocaleDateString()}<br/>
                      Open Interest: {status.tests.cftc.sampleData.openInterest?.toLocaleString()}
                    </div>
                  </div>
                )}
                {!status.tests.cftc.success && (
                  <div className="text-xs bg-red-50 p-2 rounded border">
                    <div className="text-red-700">COT reports provide trader sentiment data</div>
                  </div>
                )}
              </div>

              {/* Alpha Vantage API Status */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(status.tests.alphaVantage.success)}
                    <span className="font-medium text-sm">Alpha Vantage API</span>
                  </div>
                  {getStatusBadge(status.tests.alphaVantage.success)}
                </div>
                <p className="text-sm text-gray-600 mb-2">{status.tests.alphaVantage.message}</p>
                {status.tests.alphaVantage.success && status.tests.alphaVantage.sampleData && (
                  <div className="text-xs bg-green-50 p-2 rounded border">
                    <div className="font-semibold text-green-900">Latest Price Data:</div>
                    <div className="text-green-700">
                      Symbol: {status.tests.alphaVantage.sampleData.symbol}<br/>
                      Date: {new Date(status.tests.alphaVantage.sampleData.date).toLocaleDateString()}<br/>
                      Close: {status.tests.alphaVantage.sampleData.close}
                    </div>
                  </div>
                )}
                {!status.tests.alphaVantage.success && (
                  <div className="text-xs bg-red-50 p-2 rounded border">
                    <div className="text-red-700">
                      <strong>Action needed:</strong> Get free API key from{' '}
                      <a 
                        href="https://www.alphavantage.co/support/#api-key" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        Alpha Vantage <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Setup Instructions */}
            {!status.overall.success && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-900">Setup Instructions:</div>
                <div className="text-sm text-blue-700 mt-1 space-y-1">
                  <div>1. ✅ CFTC API: No setup required (public API)</div>
                  <div>2. 🔄 Alpha Vantage: Get free API key and add to .env.local file</div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}