"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, RefreshCw, Database } from 'lucide-react'

interface DatabaseStatus {
  success: boolean
  message: string
  data?: {
    marketCount: number
    markets: Array<{
      symbol: string
      name: string
      category: string
      cftc_code?: string
    }>
    timestamp: string
  }
  error?: string
  help?: string
}

export function DatabaseStatus() {
  const [status, setStatus] = useState<DatabaseStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const testConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-db')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      setStatus({
        success: false,
        message: 'Failed to connect to API',
        error: error instanceof Error ? error.message : 'Network error'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    testConnection()
  }, [])

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Database Status</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={testConnection}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {loading ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
        <CardDescription>
          Connection status and market data validation
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !status && (
          <div className="flex items-center space-x-2 text-gray-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span>Testing database connection...</span>
          </div>
        )}

        {status && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              {status.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    Connected
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  <Badge variant="destructive">
                    Connection Failed
                  </Badge>
                </>
              )}
              <span className="text-sm text-gray-600">{status.message}</span>
            </div>

            {status.success && status.data && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">Markets Loaded</div>
                  <div className="text-2xl font-bold text-blue-700">
                    {status.data.marketCount}/10
                  </div>
                  <div className="text-xs text-blue-600">Target markets configured</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-green-900">Last Updated</div>
                  <div className="text-sm font-mono text-green-700">
                    {new Date(status.data.timestamp).toLocaleString()}
                  </div>
                  <div className="text-xs text-green-600">Database timestamp</div>
                </div>
              </div>
            )}

            {status.success && status.data?.markets && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Configured Markets:</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {status.data.markets.map((market) => (
                    <div
                      key={market.symbol}
                      className="text-xs p-2 bg-gray-50 rounded border"
                    >
                      <div className="font-semibold text-gray-900">{market.symbol}</div>
                      <div className="text-gray-600">{market.category}</div>
                      {market.cftc_code && (
                        <div className="text-gray-500 font-mono">{market.cftc_code}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!status.success && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm font-medium text-red-900">Error Details:</div>
                <div className="text-sm text-red-700 mt-1">{status.error}</div>
                {status.help && (
                  <div className="text-sm text-red-600 mt-2">
                    <strong>Help:</strong> {status.help}
                  </div>
                )}
                <div className="mt-3 text-xs text-red-600">
                  <strong>Setup Instructions:</strong> Follow the Supabase setup guide in 
                  <code className="mx-1 px-1 bg-red-100 rounded">.claude/tasks/supabase-setup-guide.md</code>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}