// Test script to explore CFTC and Alpha Vantage data structures
// This will help us design the perfect database schema

const CFTC_BASE_URL = "https://publicreporting.cftc.gov/resource/6dca-aqww.json"
const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"

// Test CFTC API - Get latest 5 records to see data structure
async function testCFTCData() {
  try {
    console.log("🔍 Testing CFTC API...")
    
    // Get latest 5 records, order by report date descending
    const url = `${CFTC_BASE_URL}?$limit=5&$order=report_date_as_yyyy_mm_dd DESC`
    
    const response = await fetch(url)
    const data = await response.json()
    
    console.log("✅ CFTC Data Structure:")
    console.log("Number of records:", data.length)
    
    if (data.length > 0) {
      console.log("\n📊 Sample CFTC Record:")
      console.log(JSON.stringify(data[0], null, 2))
      
      console.log("\n🔑 Available Fields:")
      Object.keys(data[0]).forEach(key => {
        console.log(`- ${key}: ${typeof data[0][key]} (${data[0][key]})`)
      })
    }
    
    return data[0] // Return sample for analysis
    
  } catch (error) {
    console.error("❌ Error fetching CFTC data:", error)
  }
}

// Test Alpha Vantage API - Check EUR/USD daily data
async function testAlphaVantageData() {
  try {
    console.log("\n🔍 Testing Alpha Vantage API...")
    
    // Note: We'll need to get a free API key, but let's see the structure first
    // This is what the URL structure would look like:
    const sampleUrl = `${ALPHA_VANTAGE_BASE_URL}?function=FX_DAILY&from_symbol=EUR&to_symbol=USD&apikey=YOUR_API_KEY`
    
    console.log("📝 Alpha Vantage URL format:", sampleUrl)
    console.log("⚠️  Need to get free API key from: https://www.alphavantage.co/support/#api-key")
    
    // For now, let's document what we expect the structure to be
    const expectedStructure = {
      "Meta Data": {
        "1. Information": "Forex Daily Prices (open, high, low, close)",
        "2. From Symbol": "EUR",
        "3. To Symbol": "USD",
        "4. Output Size": "Compact",
        "5. Last Refreshed": "2024-08-09 21:20:00",
        "6. Time Zone": "GMT+0"
      },
      "Time Series (Daily)": {
        "2024-08-09": {
          "1. open": "1.0923",
          "2. high": "1.0956",
          "3. low": "1.0901",
          "4. close": "1.0943"
        }
      }
    }
    
    console.log("\n📊 Expected Alpha Vantage Structure:")
    console.log(JSON.stringify(expectedStructure, null, 2))
    
    return expectedStructure
    
  } catch (error) {
    console.error("❌ Error testing Alpha Vantage:", error)
  }
}

// Get Alpha Vantage API key instructions
function getAlphaVantageSetup() {
  console.log("\n🔑 Alpha Vantage Setup Instructions:")
  console.log("1. Visit: https://www.alphavantage.co/support/#api-key")
  console.log("2. Get free API key (500 requests/day)")
  console.log("3. Available functions for our needs:")
  console.log("   - FX_DAILY: Daily forex data")
  console.log("   - FX_WEEKLY: Weekly forex data") 
  console.log("   - FX_INTRADAY: 4h, 1h, 30min, 15min, 5min data")
  console.log("   - COMMODITY: Gold, oil prices (WTI & Brent)")
}

// Main test function
async function runAPITests() {
  console.log("🚀 Starting API Data Structure Analysis...\n")
  
  const cftcSample = await testCFTCData()
  const alphaSample = await testAlphaVantageData()
  getAlphaVantageSetup()
  
  console.log("\n✅ Analysis Complete!")
  console.log("Now we can design the perfect database schema based on real data!")
  
  return { cftcSample, alphaSample }
}

// Export for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testCFTCData, testAlphaVantageData, runAPITests }
}

// For browser testing
if (typeof window !== 'undefined') {
  window.apiTest = { testCFTCData, testAlphaVantageData, runAPITests }
}