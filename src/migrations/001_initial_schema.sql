-- Initial schema for options tracking database
-- This migration creates the core tables for storing stock snapshots,
-- option data, and calculated scores over time.

-- Stock snapshots table - stores stock price and metadata at each fetch
CREATE TABLE IF NOT EXISTS stock_snapshots (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    current_price REAL NOT NULL,
    fetched_at TEXT NOT NULL, -- ISO timestamp when data was fetched
    source TEXT NOT NULL DEFAULT 'finnhub', -- data source identifier
    created_at TEXT NOT NULL DEFAULT (datetime('now')), -- when record was created
    
    -- Create index for efficient symbol lookups
    CONSTRAINT unique_symbol_fetch UNIQUE (symbol, fetched_at)
);

CREATE INDEX IF NOT EXISTS idx_stock_snapshots_symbol ON stock_snapshots(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_created_at ON stock_snapshots(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_snapshots_symbol_created ON stock_snapshots(symbol, created_at);

-- Option snapshots table - stores individual option data for each stock snapshot
CREATE TABLE IF NOT EXISTS option_snapshots (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT NOT NULL, -- foreign key to stock_snapshots
    contract_name TEXT NOT NULL,
    strike REAL NOT NULL,
    last_price REAL NOT NULL,
    bid REAL NOT NULL,
    ask REAL NOT NULL,
    volume INTEGER NOT NULL DEFAULT 0,
    open_interest INTEGER NOT NULL DEFAULT 0,
    expiration_date TEXT NOT NULL, -- ISO date string
    implied_volatility REAL NOT NULL,
    delta REAL,
    gamma REAL,
    theta REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (snapshot_id) REFERENCES stock_snapshots(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_option_snapshots_snapshot_id ON option_snapshots(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_option_snapshots_contract_name ON option_snapshots(contract_name);
CREATE INDEX IF NOT EXISTS idx_option_snapshots_expiration ON option_snapshots(expiration_date);
CREATE INDEX IF NOT EXISTS idx_option_snapshots_strike ON option_snapshots(strike);

-- Option score snapshots table - stores calculated scores for each option
CREATE TABLE IF NOT EXISTS option_score_snapshots (
    id TEXT PRIMARY KEY,
    option_snapshot_id TEXT NOT NULL, -- foreign key to option_snapshots
    total_score REAL NOT NULL,
    premium_score REAL NOT NULL,
    theta_score REAL NOT NULL,
    strike_score REAL NOT NULL,
    dte_score REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (option_snapshot_id) REFERENCES option_snapshots(id) ON DELETE CASCADE,
    CONSTRAINT unique_option_score UNIQUE (option_snapshot_id)
);

CREATE INDEX IF NOT EXISTS idx_option_score_snapshots_option_id ON option_score_snapshots(option_snapshot_id);
CREATE INDEX IF NOT EXISTS idx_option_score_snapshots_total_score ON option_score_snapshots(total_score);

-- Create a view for easy querying of complete option data with scores
DROP VIEW IF EXISTS option_data_with_scores;
CREATE VIEW option_data_with_scores AS
SELECT 
    ss.symbol,
    ss.current_price,
    ss.fetched_at,
    os.contract_name,
    os.strike,
    os.bid,
    os.ask,
    os.volume,
    os.open_interest,
    os.expiration_date,
    os.implied_volatility,
    os.delta,
    os.gamma,
    os.theta,
    oss.total_score,
    oss.premium_score,
    oss.theta_score,
    oss.strike_score,
    oss.dte_score,
    ss.id as snapshot_id,
    os.id as option_id,
    oss.id as score_id
FROM stock_snapshots ss
JOIN option_snapshots os ON ss.id = os.snapshot_id
LEFT JOIN option_score_snapshots oss ON os.id = oss.option_snapshot_id
ORDER BY ss.created_at DESC, oss.total_score DESC;

-- Create a view for performance tracking over time
DROP VIEW IF EXISTS stock_performance_summary;
CREATE VIEW stock_performance_summary AS
SELECT 
    ss.symbol,
    DATE(ss.created_at) as date,
    AVG(ss.current_price) as avg_price,
    MAX(oss.total_score) as max_score,
    AVG(oss.total_score) as avg_score,
    COUNT(os.id) as option_count,
    COUNT(CASE WHEN oss.total_score >= 80 THEN 1 END) as excellent_options,
    COUNT(CASE WHEN oss.total_score >= 65 THEN 1 END) as good_options
FROM stock_snapshots ss
LEFT JOIN option_snapshots os ON ss.id = os.snapshot_id
LEFT JOIN option_score_snapshots oss ON os.id = oss.option_snapshot_id
GROUP BY ss.symbol, DATE(ss.created_at)
ORDER BY ss.symbol, date DESC;
