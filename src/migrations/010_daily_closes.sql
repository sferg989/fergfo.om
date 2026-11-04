-- One close per symbol per UTC day, kept 90 days (stock_snapshots are pruned at 40).
-- day and "last price of the day" follow getDailyCloses' original definition:
-- DATE(created_at) (UTC) and the snapshot with the latest created_at.
CREATE TABLE IF NOT EXISTS daily_closes (
    symbol TEXT NOT NULL,
    day TEXT NOT NULL,
    close REAL NOT NULL,
    PRIMARY KEY (symbol, day)
);

INSERT OR REPLACE INTO daily_closes (symbol, day, close)
SELECT symbol, day, current_price FROM (
    SELECT symbol, current_price, DATE(created_at) AS day,
           ROW_NUMBER() OVER (PARTITION BY symbol, DATE(created_at) ORDER BY created_at DESC) AS rn
    FROM stock_snapshots
)
WHERE rn = 1;
