-- COT Analysis App - Database Schema
-- Based on real CFTC and Alpha Vantage API data structures
-- Optimized for performance with proper indexes

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table 1: Markets (currencies & commodities)
CREATE TABLE markets (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,           -- 'EUR/USD', 'GOLD', etc.
  name VARCHAR(255) NOT NULL,                   -- 'Euro / US Dollar'
  category VARCHAR(50) NOT NULL CHECK (category IN ('Currency', 'Commodity')),
  
  -- CFTC mapping fields
  cftc_contract_market_code VARCHAR(20),        -- '086565A'
  cftc_market_name VARCHAR(255),                -- 'EURO FX'
  commodity_name VARCHAR(255),                  -- 'EUROPEAN CURRENCY UNIT' 
  commodity_group VARCHAR(100),                 -- 'FINANCIAL INSTRUMENTS'
  
  -- Alpha Vantage mapping
  alpha_vantage_from_symbol VARCHAR(10),        -- 'EUR'
  alpha_vantage_to_symbol VARCHAR(10),          -- 'USD'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table 2: COT Reports (weekly data from CFTC)
CREATE TABLE cot_reports (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES markets(id) ON DELETE CASCADE,
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

-- Table 3: Price Data (multiple timeframes)
CREATE TABLE price_data (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES markets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  timeframe VARCHAR(10) NOT NULL CHECK (timeframe IN ('daily', 'weekly', '4h')),
  
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

-- Table 4: COT Scores (our calculated scores)
CREATE TABLE cot_scores (
  id SERIAL PRIMARY KEY,
  market_id INTEGER REFERENCES markets(id) ON DELETE CASCADE,
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

-- Table 5: User Bookmarks (future authentication)
CREATE TABLE user_bookmarks (
  id SERIAL PRIMARY KEY,
  user_id UUID,                                 -- For future auth system
  market_id INTEGER REFERENCES markets(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, market_id)
);

-- Indexes for Performance
-- COT reports by date (most common query)
CREATE INDEX idx_cot_reports_date ON cot_reports(report_date DESC);
CREATE INDEX idx_cot_reports_market_date ON cot_reports(market_id, report_date DESC);

-- Price data by date  
CREATE INDEX idx_price_data_date ON price_data(date DESC);
CREATE INDEX idx_price_data_market_date ON price_data(market_id, date DESC, timeframe);

-- Scores by date
CREATE INDEX idx_cot_scores_date ON cot_scores(report_date DESC);
CREATE INDEX idx_cot_scores_market_date ON cot_scores(market_id, report_date DESC);

-- Market lookups
CREATE INDEX idx_markets_symbol ON markets(symbol);
CREATE INDEX idx_markets_category ON markets(category);

-- Insert our 10 target markets with CFTC codes
INSERT INTO markets (symbol, name, category, cftc_contract_market_code, cftc_market_name, commodity_name, commodity_group, alpha_vantage_from_symbol, alpha_vantage_to_symbol) VALUES

-- Currencies
('EUR/USD', 'Euro / US Dollar', 'Currency', '099741', 'EURO FX', 'EUROPEAN CURRENCY UNIT', 'FINANCIAL INSTRUMENTS', 'EUR', 'USD'),
('GBP/USD', 'British Pound / US Dollar', 'Currency', '096742', 'BRITISH POUND', 'POUND STERLING', 'FINANCIAL INSTRUMENTS', 'GBP', 'USD'),
('USD/JPY', 'US Dollar / Japanese Yen', 'Currency', '097741', 'JAPANESE YEN', 'JAPANESE YEN', 'FINANCIAL INSTRUMENTS', 'USD', 'JPY'),
('AUD/USD', 'Australian Dollar / US Dollar', 'Currency', '232741', 'AUSTRALIAN DOLLAR', 'AUSTRALIAN DOLLAR', 'FINANCIAL INSTRUMENTS', 'AUD', 'USD'),
('USD/CAD', 'US Dollar / Canadian Dollar', 'Currency', '090741', 'CANADIAN DOLLAR', 'CANADIAN DOLLAR', 'FINANCIAL INSTRUMENTS', 'USD', 'CAD'),

-- Commodities  
('GOLD', 'Gold Futures', 'Commodity', '088606', 'GOLD, 100 TROY OZ', 'GOLD', 'METALS AND MINERALS', NULL, NULL),
('SILVER', 'Silver Futures', 'Commodity', '084605', 'SILVER, 5000 TROY OZ', 'SILVER', 'METALS AND MINERALS', NULL, NULL),
('CRUDE', 'Crude Oil Futures', 'Commodity', '067411', 'CRUDE OIL, LIGHT SWEET-WTI', 'CRUDE OIL', 'ENERGY', NULL, NULL),
('COPPER', 'Copper Futures', 'Commodity', '085691', 'COPPER', 'COPPER', 'METALS AND MINERALS', NULL, NULL),
('NATGAS', 'Natural Gas Futures', 'Commodity', '023611', 'NATURAL GAS', 'NATURAL GAS', 'ENERGY', NULL, NULL);

-- Add updated_at trigger for markets table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON markets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();