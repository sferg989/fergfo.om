-- OptionScorer now scores one expected-return factor (extrinsic premium minus the expected
-- assignment loss priced at realized volatility) in place of separate yield and risk factors.
-- Rows written before this migration keep their old yield value under the new name and lose
-- their risk value; they age out with snapshot retention.
DROP VIEW IF EXISTS option_data_with_scores;

ALTER TABLE option_score_snapshots RENAME COLUMN yield_score TO expected_return_score;
ALTER TABLE option_score_snapshots DROP COLUMN risk_score;

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
    oss.expected_return_score,
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
