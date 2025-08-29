-- Migration for symbol tracking and background refresh management
-- This adds tables to track which symbols to refresh and their refresh state

-- Symbol tracking table - manages which symbols to refresh and their priority
CREATE TABLE IF NOT EXISTS symbol_tracking (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL UNIQUE,
    is_preferred BOOLEAN NOT NULL DEFAULT 0, -- 1 for preferred stocks, 0 for user-searched
    priority INTEGER NOT NULL DEFAULT 1, -- Higher number = higher priority
    last_refreshed_at TEXT, -- ISO timestamp of last successful refresh
    last_error TEXT, -- Last error message if refresh failed
    error_count INTEGER NOT NULL DEFAULT 0, -- Count of consecutive errors
    is_active BOOLEAN NOT NULL DEFAULT 1, -- 0 to disable refresh for this symbol
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_symbol_tracking_symbol ON symbol_tracking(symbol);
CREATE INDEX IF NOT EXISTS idx_symbol_tracking_priority ON symbol_tracking(priority DESC);
CREATE INDEX IF NOT EXISTS idx_symbol_tracking_last_refreshed ON symbol_tracking(last_refreshed_at);
CREATE INDEX IF NOT EXISTS idx_symbol_tracking_active_priority ON symbol_tracking(is_active, priority DESC);

-- Refresh state table - tracks the current state of the background refresh process
CREATE TABLE IF NOT EXISTS refresh_state (
    id TEXT PRIMARY KEY,
    last_symbol_refreshed TEXT, -- Symbol that was last processed
    current_position INTEGER NOT NULL DEFAULT 0, -- Current position in round-robin
    total_symbols INTEGER NOT NULL DEFAULT 0, -- Total number of active symbols
    last_cycle_started_at TEXT, -- When the current cycle started
    last_cycle_completed_at TEXT, -- When the last full cycle completed
    cycle_count INTEGER NOT NULL DEFAULT 0, -- Number of completed cycles
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Single row to track refresh state
INSERT OR IGNORE INTO refresh_state (id, current_position, total_symbols) 
VALUES ('main', 0, 0);

-- View to get next symbol to refresh (round-robin)
DROP VIEW IF EXISTS next_symbol_to_refresh;
CREATE VIEW next_symbol_to_refresh AS
SELECT 
    st.symbol,
    st.priority,
    st.last_refreshed_at,
    st.error_count,
    ROW_NUMBER() OVER (ORDER BY st.priority DESC, st.symbol) as position
FROM symbol_tracking st
WHERE st.is_active = 1
ORDER BY st.priority DESC, st.symbol;

-- View to get refresh statistics
DROP VIEW IF EXISTS refresh_statistics;
CREATE VIEW refresh_statistics AS
SELECT 
    COUNT(*) as total_symbols,
    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_symbols,
    COUNT(CASE WHEN is_preferred = 1 THEN 1 END) as preferred_symbols,
    COUNT(CASE WHEN error_count > 0 THEN 1 END) as symbols_with_errors,
    COUNT(CASE WHEN last_refreshed_at IS NOT NULL THEN 1 END) as symbols_refreshed,
    MAX(last_refreshed_at) as most_recent_refresh,
    MIN(last_refreshed_at) as oldest_refresh
FROM symbol_tracking;

-- Initialize with preferred stocks
-- Note: We'll use INSERT OR IGNORE to avoid conflicts if symbols already exist
INSERT OR IGNORE INTO symbol_tracking (id, symbol, is_preferred, priority) VALUES
    ('preferred_tsla', 'TSLA', 1, 10),
    ('preferred_net', 'NET', 1, 10),
    ('preferred_lrcx', 'LRCX', 1, 10),
    ('preferred_crwd', 'CRWD', 1, 10),
    ('preferred_nvda', 'NVDA', 1, 10),
    ('preferred_se', 'SE', 1, 10),
    ('preferred_kkr', 'KKR', 1, 10),
    ('preferred_bx', 'BX', 1, 10),
    ('preferred_aapl', 'AAPL', 1, 10),
    ('preferred_googl', 'GOOGL', 1, 10),
    ('preferred_meta', 'META', 1, 10),
    ('preferred_amd', 'AMD', 1, 10),
    ('preferred_amzn', 'AMZN', 1, 10),
    ('preferred_nflx', 'NFLX', 1, 10),
    ('preferred_msft', 'MSFT', 1, 10);

-- Update the refresh state with the initial symbol count
UPDATE refresh_state 
SET total_symbols = (SELECT COUNT(*) FROM symbol_tracking WHERE is_active = 1)
WHERE id = 'main';
