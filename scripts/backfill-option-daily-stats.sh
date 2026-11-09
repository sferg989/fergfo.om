#!/usr/bin/env bash
# Backfill option_daily_stats from the retained snapshots, one symbol and 5-day chunk per
# statement so no single query exceeds D1's CPU limit. Idempotent: re-running replaces rows.
# Usage: scripts/backfill-option-daily-stats.sh [days=40]
# Safe to re-run after the worker is live: each group is recomputed from the raw rows.
set -euo pipefail
cd "$(dirname "$0")/.."
DAYS="${1:-40}"
CHUNK=5

symbols=$(npx wrangler d1 execute options-tracker --remote --json \
  --command "SELECT symbol FROM symbol_tracking ORDER BY symbol" 2>/dev/null \
  | python3 -c "import json,sys; print(' '.join(r['symbol'] for r in json.load(sys.stdin)[0]['results']))")

for symbol in $symbols; do
  for ((start=DAYS; start>0; start-=CHUNK)); do
    end=$((start - CHUNK))
    upper="-$end days"
    (( end <= 0 )) && upper="+1 days"  # last chunk runs through today
    sql="INSERT OR REPLACE INTO option_daily_stats
         SELECT ss.symbol, DATE(ss.created_at), os.strike, os.expiration_date,
                COUNT(*), MAX(oss.total_score), SUM(oss.total_score), SUM(os.last_price),
                MAX(os.volume), MAX(os.open_interest), MIN(os.bid), MAX(os.ask)
         FROM stock_snapshots ss
         JOIN option_snapshots os ON os.snapshot_id = ss.id
         JOIN option_score_snapshots oss ON oss.option_snapshot_id = os.id
         WHERE ss.symbol = '$symbol'
           AND ss.created_at >= DATE('now', '-$start days')
           AND ss.created_at < DATE('now', '$upper')
         GROUP BY ss.symbol, DATE(ss.created_at), os.strike, os.expiration_date"
    # The worker shares the database's CPU budget, so a chunk can be throttled; retry it
    for attempt in 1 2 3 4; do
      out=$(npx wrangler d1 execute options-tracker --remote --json --command "$sql" 2>/dev/null || true)
      rows=$(python3 -c "import json,sys; m=json.loads(sys.argv[1])[0]['meta']; print(m['rows_written'], m['rows_read'], round(m['duration']))" "$out" 2>/dev/null) && break
      rows="FAILED: $(echo "$out" | grep -m1 -i 'error\|"text"' || echo unknown)"
      sleep 15
    done
    echo "$symbol days -$start..$upper: written/read/ms $rows"
  done
done
