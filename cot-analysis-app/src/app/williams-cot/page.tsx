import WilliamsCOTDashboard from '@/components/WilliamsCOTDashboard'

export default function WilliamsCOTPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Larry Williams COT Analysis
          </h1>
          <p className="text-gray-600 max-w-3xl">
            Professional-grade Commitment of Traders analysis using Larry Williams' proven methodology. 
            Track commercial hedgers, large speculators, and get real-time signals based on 50+ years 
            of market research and the world's most comprehensive COT dataset.
          </p>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            🎯 Williams' COT Methodology
          </h2>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <h3 className="font-semibold mb-1">Key Principles:</h3>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Commercials</strong> (hedgers) - buy weakness, sell strength</li>
                <li>• <strong>Large traders</strong> (funds) - trend followers, contrarian at extremes</li>
                <li>• <strong>Normalized indices</strong> - 0-100 scale vs historical ranges</li>
                <li>• <strong>Signal zones</strong> - Extreme levels at 90%+ and 10%-</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Signal Interpretation:</h3>
              <ul className="space-y-1 text-xs">
                <li>• <strong className="text-green-700">90-100%</strong>: Extreme buy signal</li>
                <li>• <strong className="text-lime-700">80-90%</strong>: Buy setup</li>
                <li>• <strong className="text-orange-700">10-20%</strong>: Sell setup</li>
                <li>• <strong className="text-red-700">0-10%</strong>: Extreme sell signal</li>
              </ul>
            </div>
          </div>
        </div>

        <WilliamsCOTDashboard />

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Based on Larry Williams' research and methodology. COT data updated weekly by the CFTC.
            <br />
            Historical data: {new Date().getFullYear()} weeks across 10 major markets.
          </p>
        </div>
      </div>
    </div>
  )
}