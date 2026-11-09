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

-- Backfill the retained window so the page has history on day one
INSERT OR REPLACE INTO option_daily_stats
SELECT ss.symbol, DATE(ss.created_at), os.strike, os.expiration_date,
       COUNT(*), MAX(oss.total_score), SUM(oss.total_score), SUM(os.last_price),
       MAX(os.volume), MAX(os.open_interest), MIN(os.bid), MAX(os.ask)
FROM option_snapshots os
JOIN stock_snapshots ss ON ss.id = os.snapshot_id
JOIN option_score_snapshots oss ON oss.option_snapshot_id = os.id
WHERE ss.created_at >= DATE('now', '-40 days')
GROUP BY ss.symbol, DATE(ss.created_at), os.strike, os.expiration_date;
