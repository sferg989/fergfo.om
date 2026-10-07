-- What happened to each tracked put at expiration. Snapshots and scores are pruned after
-- 30 days, so this row carries the inputs needed to check a score against its outcome.
CREATE TABLE IF NOT EXISTS option_outcomes (
    contract_name TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    strike REAL NOT NULL,
    expiration_date TEXT NOT NULL,
    settlement_price REAL NOT NULL,   -- underlying close on expiration day
    expired_otm INTEGER NOT NULL,     -- 1 when settlement >= strike
    first_seen_at TEXT NOT NULL,      -- oldest surviving snapshot of this contract
    first_seen_bid REAL NOT NULL,
    first_seen_score REAL,            -- total_score at that snapshot
    realized_return REAL NOT NULL,    -- first_seen_bid - max(0, strike - settlement), per share
    recorded_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_option_outcomes_symbol_expiry ON option_outcomes(symbol, expiration_date);
-- The outcome sweep selects by expiration date across all snapshots
CREATE INDEX IF NOT EXISTS idx_option_snapshots_expiration ON option_snapshots(expiration_date);
