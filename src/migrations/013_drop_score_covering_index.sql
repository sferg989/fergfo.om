-- SQLite already walks the UNIQUE(option_snapshot_id) autoindex for the historical page
-- joins and the extra index changed neither the plan nor rows read, so it only costs writes.
DROP INDEX IF EXISTS idx_option_score_snapshots_option_id_score;
