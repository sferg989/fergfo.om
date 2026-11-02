-- Outcomes are now recorded from the snapshot at the largest DTE <= 38 (fallback: oldest
-- surviving snapshot), not simply the oldest. The first_seen_* columns keep their names but
-- now mean that snapshot: first_seen_at / first_seen_bid / first_seen_score.
-- realized_return stays per-share dollars; this adds the same result as a percentage of
-- collateral (strike x 0.20 margin), comparable across strikes.
ALTER TABLE option_outcomes ADD COLUMN realized_return_pct REAL;
