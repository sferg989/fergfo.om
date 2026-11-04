-- Outcome rows carry the inputs the scorer saw at first_seen_at, so a score can be
-- re-computed (backtested) after the snapshots are pruned. realized_vol is rebuilt from
-- daily_closes over the 30 days before first_seen_at (NULL when too few closes exist).
ALTER TABLE option_outcomes ADD COLUMN implied_volatility REAL;
ALTER TABLE option_outcomes ADD COLUMN ask REAL;
ALTER TABLE option_outcomes ADD COLUMN spot_price REAL;
ALTER TABLE option_outcomes ADD COLUMN dte_at_score INTEGER;
ALTER TABLE option_outcomes ADD COLUMN volume INTEGER;
ALTER TABLE option_outcomes ADD COLUMN open_interest INTEGER;
ALTER TABLE option_outcomes ADD COLUMN realized_vol REAL;
ALTER TABLE option_outcomes ADD COLUMN scorer_version TEXT;
