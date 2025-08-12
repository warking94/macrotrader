# COT Analysis App - Database Schema Design

## Data Analysis Summary

After exploring both CFTC and Alpha Vantage APIs, here's what we discovered:

## 1. CFTC COT Data Structure (Real API Response)

**API Endpoint**: `https://publicreporting.cftc.gov/resource/6dca-aqww.json`

**Key Fields We Need**:
```json
{
  "id": "25080586565AF",
  "market_and_exchange_names": "GULF # 6 FUEL OIL CRACK - NEW YORK MERCANTILE EXCHANGE",
  "report_date_as_yyyy_mm_dd": "2025-08-05T00:00:00.000",
  "contract_market_name": "GULF # 6 FUEL OIL CRACK",
  "cftc_contract_market_code": "86565A",
  "commodity_name": "FUEL OIL/CRUDE OIL",
  "commodity_group_name": "NATURAL RESOURCES",
  "commodity_subgroup_name": "PETROLEUM AND PRODUCTS",
  
  // Position Data (Core for our scoring)
  "open_interest_all": "10835",
  "noncomm_positions_long_all": "225",
  "noncomm_positions_short_all": "3948", 
  "comm_positions_long_all": "10340",
  "comm_positions_short_all": "6587",
  "nonrept_positions_long_all": "0",
  "nonrept_positions_short_all": "30",
  
  // Changes (Important for trends)
  "change_in_open_interest_all": "-1440",
  "change_in_noncomm_long_all": "0",
  "change_in_noncomm_short_all": "-190",
  "change_in_comm_long_all": "-1365",
  "change_in_comm_short_all": "-1175",
  
  // Percentages (Great for scoring)
  "pct_of_oi_noncomm_long_all": "2.1",
  "pct_of_oi_noncomm_short_all": "36.4",
  "pct_of_oi_comm_long_all": "95.4",
  "pct_of_oi_comm_short_all": "60.8",
  
  // Trader counts
  "traders_tot_all": "29",
  "traders_noncomm_long_all": "1",
  "traders_comm_long_all": "17"
}
```

## 2. Alpha Vantage Price Data Structure

**API Endpoint**: `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=EUR&to_symbol=USD&apikey=YOUR_KEY`

**Response Structure**:
```json
{
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
    },
    "2024-08-08": {
      "1. open": "1.0915",
      "2. high": "1.0928",
      "3. low": "1.0898",
      "4. close": "1.0920"
    }
  }
}
```

## 3. Optimal Database Schema

Based on the real data structure, here's our optimized schema:

### Table 1: `markets`
```sql
CREATE TABLE markets (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,           -- 'EUR/USD', 'GOLD', etc.
  name VARCHAR(255) NOT NULL,                   -- 'Euro / US Dollar'
  category VARCHAR(50) NOT NULL,                -- 'Currency', 'Commodity'
  
  -- CFTC mapping fields
  cftc_contract_market_code VARCHAR(20),        -- '86565A'
  cftc_market_name VARCHAR(255),                -- 'GULF # 6 FUEL OIL CRACK'
  commodity_name VARCHAR(255),                  -- 'FUEL OIL/CRUDE OIL' 
  commodity_group VARCHAR(100),                 -- 'NATURAL RESOURCES'
  
  -- Alpha Vantage mapping
  alpha_vantage_from_symbol VARCHAR(10),        -- 'EUR'
  alpha_vantage_to_symbol VARCHAR(10),          -- 'USD'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Table 2: `cot_reports`
```sql
CREATE TABLE cot_reports (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES markets(id),
  report_date DATE NOT NULL,
  report_week VARCHAR(20),                      -- '2025 Report Week 31'
  
  -- Position data (stored as integers for calculations)
  open_interest_all INTEGER,
  commercial_long INTEGER,
  commercial_short INTEGER, 
  noncommercial_long INTEGER,
  noncommercial_short INTEGER,
  nonreportable_long INTEGER,
  nonreportable_short INTEGER,
  
  -- Weekly changes (for trend analysis)
  change_open_interest INTEGER,
  change_commercial_long INTEGER,
  change_commercial_short INTEGER,
  change_noncommercial_long INTEGER,
  change_noncommercial_short INTEGER,
  
  -- Percentages (stored as decimals for easy calculation)
  pct_commercial_long DECIMAL(5,2),
  pct_commercial_short DECIMAL(5,2),
  pct_noncommercial_long DECIMAL(5,2),
  pct_noncommercial_short DECIMAL(5,2),
  
  -- Trader counts
  total_traders INTEGER,
  commercial_traders_long INTEGER,
  commercial_traders_short INTEGER,
  noncommercial_traders_long INTEGER,
  noncommercial_traders_short INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one report per market per week
  UNIQUE(market_id, report_date)
);
```

### Table 3: `price_data`
```sql
CREATE TABLE price_data (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES markets(id),
  date DATE NOT NULL,
  timeframe VARCHAR(10) NOT NULL,               -- 'daily', 'weekly', '4h'
  
  -- OHLC data (stored as decimals for precision)
  open_price DECIMAL(12,6),
  high_price DECIMAL(12,6), 
  low_price DECIMAL(12,6),
  close_price DECIMAL(12,6),
  volume BIGINT,                                -- If available
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one price per market per date per timeframe
  UNIQUE(market_id, date, timeframe)
);
```

### Table 4: `cot_scores` (Our calculated scores)
```sql
CREATE TABLE cot_scores (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES markets(id),
  report_date DATE NOT NULL,
  
  -- Our calculated scores (0-100 scale)
  cot_score INTEGER CHECK (cot_score >= 0 AND cot_score <= 100),
  bias VARCHAR(20) CHECK (bias IN ('Bullish', 'Bearish', 'Neutral')),
  confidence_level DECIMAL(4,2),               -- 0.00 to 100.00
  
  -- Score components (for transparency)
  commercial_positioning_score INTEGER,
  trend_momentum_score INTEGER,  
  extremes_score INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(market_id, report_date)
);
```

### Table 5: `user_bookmarks` (Future authentication)
```sql
CREATE TABLE user_bookmarks (
  id SERIAL PRIMARY KEY,
  user_id UUID,                                 -- For future auth system
  market_id INTEGER REFERENCES markets(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, market_id)
);
```

## 4. Indexes for Performance

```sql
-- COT reports by date (most common query)
CREATE INDEX idx_cot_reports_date ON cot_reports(report_date DESC);
CREATE INDEX idx_cot_reports_market_date ON cot_reports(market_id, report_date DESC);

-- Price data by date  
CREATE INDEX idx_price_data_date ON price_data(date DESC);
CREATE INDEX idx_price_data_market_date ON price_data(market_id, date DESC, timeframe);

-- Scores by date
CREATE INDEX idx_cot_scores_date ON cot_scores(report_date DESC);
CREATE INDEX idx_cot_scores_market_date ON cot_scores(market_id, report_date DESC);
```

## 5. Initial Data Population

Our 10 target markets:
```sql
INSERT INTO markets (symbol, name, category, alpha_vantage_from_symbol, alpha_vantage_to_symbol) VALUES
('EUR/USD', 'Euro / US Dollar', 'Currency', 'EUR', 'USD'),
('GBP/USD', 'British Pound / US Dollar', 'Currency', 'GBP', 'USD'),
('USD/JPY', 'US Dollar / Japanese Yen', 'Currency', 'USD', 'JPY'),
('AUD/USD', 'Australian Dollar / US Dollar', 'Currency', 'AUD', 'USD'),
('USD/CAD', 'US Dollar / Canadian Dollar', 'Currency', 'USD', 'CAD'),
('GOLD', 'Gold Futures', 'Commodity', NULL, NULL),
('SILVER', 'Silver Futures', 'Commodity', NULL, NULL),
('CRUDE', 'Crude Oil Futures', 'Commodity', NULL, NULL),
('COPPER', 'Copper Futures', 'Commodity', NULL, NULL),
('NATGAS', 'Natural Gas Futures', 'Commodity', NULL, NULL);
```

## 6. Schema Benefits

✅ **Optimized for our use case**: Separates concerns (markets, COT data, price data, scores)
✅ **Performance**: Proper indexes for common queries
✅ **Scalability**: Can easily add more markets or data sources
✅ **Flexibility**: Score calculation can be updated without affecting raw data
✅ **Future-ready**: Ready for user authentication and premium features
✅ **Data integrity**: Foreign keys and unique constraints prevent bad data

This schema is designed based on the REAL data structures, ensuring we store exactly what we need efficiently!