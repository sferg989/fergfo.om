-- OptionScorer now scores yield (extrinsic premium on collateral), assignment risk (put delta),
-- DTE and liquidity, minus a spread penalty. The old premium/theta/strike factors are gone.
-- Rows written before this migration keep their old factor values under the new names;
-- they age out with the 30-day snapshot retention.
DROP VIEW IF EXISTS option_data_with_scores;

ALTER TABLE option_score_snapshots RENAME COLUMN premium_score TO yield_score;
ALTER TABLE option_score_snapshots RENAME COLUMN theta_score TO risk_score;
ALTER TABLE option_score_snapshots DROP COLUMN strike_score;
ALTER TABLE option_score_snapshots ADD COLUMN liquidity_score REAL NOT NULL DEFAULT 0;
ALTER TABLE option_score_snapshots ADD COLUMN spread_penalty REAL NOT NULL DEFAULT 0;

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
    oss.yield_score,
    oss.risk_score,
    oss.dte_score,
    oss.liquidity_score,
    oss.spread_penalty,
    ss.id as snapshot_id,
    os.id as option_id,
    oss.id as score_id
FROM stock_snapshots ss
JOIN option_snapshots os ON ss.id = os.snapshot_id
LEFT JOIN option_score_snapshots oss ON os.id = oss.option_snapshot_id
ORDER BY ss.created_at DESC, oss.total_score DESC;
