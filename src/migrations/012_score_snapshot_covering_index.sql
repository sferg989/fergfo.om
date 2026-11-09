-- The historical page joins option_score_snapshots by option_snapshot_id and reads only
-- total_score; a covering index lets those scans skip the full rows.
CREATE INDEX IF NOT EXISTS idx_option_score_snapshots_option_id_score
    ON option_score_snapshots(option_snapshot_id, total_score);
