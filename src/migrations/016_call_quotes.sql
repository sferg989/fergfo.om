-- Long-dated calls (12+ months) scored once per market day for the preferred symbols.
-- One row per contract per Eastern day. Rows are never pruned: a contract's first rows must
-- survive until it expires (400 to 800 days) so the score can be checked against the outcome.
-- About 1,700 rows a day; revisit after a year.
CREATE TABLE IF NOT EXISTS call_quotes (
    contract_name TEXT NOT NULL,
    day TEXT NOT NULL,                -- Eastern calendar day of the refresh, YYYY-MM-DD
    symbol TEXT NOT NULL,
    strike REAL NOT NULL,
    expiration_date TEXT NOT NULL,
    spot REAL NOT NULL,               -- underlying price at the refresh
    bid REAL NOT NULL,
    ask REAL NOT NULL,
    volume INTEGER NOT NULL,
    open_interest INTEGER NOT NULL,
    dividend_yield REAL NOT NULL,     -- fraction per year
    forecast_vol REAL NOT NULL,       -- three-year realized volatility used for fair value
    implied_vol REAL NOT NULL,        -- solved from the bid-ask midpoint
    delta REAL NOT NULL,              -- at forecast_vol
    fair_value REAL NOT NULL,
    fair_low REAL NOT NULL,
    fair_high REAL NOT NULL,
    excess_cost REAL NOT NULL,        -- fraction of stock exposure per year
    score REAL NOT NULL,
    verdict TEXT NOT NULL,            -- Cheap | In range | Rich
    scorer_version TEXT NOT NULL,
    PRIMARY KEY (contract_name, day)
);

CREATE INDEX IF NOT EXISTS idx_call_quotes_symbol_day ON call_quotes(symbol, day);

-- One row per symbol per Eastern day: whether the call refresh ran, and how it went.
-- The worker reads it to pick the next symbol; the page reads it for data dates and counts.
CREATE TABLE IF NOT EXISTS call_refresh_log (
    symbol TEXT NOT NULL,
    day TEXT NOT NULL,
    attempts INTEGER NOT NULL,
    status TEXT NOT NULL,             -- ok | provider_error | failed
    error TEXT,
    scored INTEGER NOT NULL,          -- contracts stored
    dropped INTEGER NOT NULL,         -- in-band contracts rejected by the quote gates
    fetched_at TEXT NOT NULL,
    PRIMARY KEY (symbol, day)
);
