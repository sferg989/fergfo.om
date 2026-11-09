-- Per (symbol, UTC day, strike, expiration) aggregates maintained by the worker on each save.
-- The historical page's "top performing" and "performance trends" read this instead of
-- aggregating every option row of the last 30 days per view, which tripped D1's overload cap.
CREATE TABLE IF NOT EXISTS option_daily_stats (
    symbol TEXT NOT NULL,
    day TEXT NOT NULL,
    strike REAL NOT NULL,
    expiration_date TEXT NOT NULL,
    snapshot_count INTEGER NOT NULL,
    max_score REAL NOT NULL,
    sum_score REAL NOT NULL,
    sum_last_price REAL NOT NULL,
    max_volume INTEGER NOT NULL,
    max_open_interest INTEGER NOT NULL,
    min_bid REAL NOT NULL,
    max_ask REAL NOT NULL,
    PRIMARY KEY (symbol, day, strike, expiration_date)
);

-- Backfill of the retained window runs per symbol and 10-day chunk via
-- scripts/backfill-option-daily-stats.sh; a single INSERT...SELECT exceeds D1's CPU limit.
