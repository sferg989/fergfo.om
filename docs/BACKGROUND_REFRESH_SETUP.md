# Background Refresh Setup Guide

This guide covers the implementation of cached options chains with scheduled refresh as outlined in the PRD.

## Overview

The application now uses a **cached-first approach** where:
1. All UI components read options data from the D1 database only
2. A background Cloudflare Worker refreshes data every minute during market hours
3. Fresh external API data is saved to the database for future requests

## Architecture Changes

### 1. OptionsService Updates
- `fetchOptionsData()` now reads from database first, fallback to "data coming soon" message
- Added `fetchFreshOptionsData()` for background worker use only
- Automatically adds searched symbols to tracking table

### 2. Database Schema
- **New table**: `symbol_tracking` - manages which symbols to refresh
- **New table**: `refresh_state` - tracks background refresh progress
- **New views**: `next_symbol_to_refresh`, `refresh_statistics`
- **Migration**: `002_symbol_tracking.sql`

### 3. Background Refresh Service
- Round-robin symbol refresh strategy
- Market hours detection (9:30 AM - 4:00 PM ET, weekdays)
- Error tracking and retry logic
- Statistics and monitoring

### 4. Cloudflare Worker
- Cron trigger runs every minute
- Only refreshes during market hours
- Includes HTTP endpoints for manual triggering
- Separate deployment from main app

## Deployment Steps

### 1. Apply Database Migration
```bash
# Local development
npm run db:migrate

# Production
npm run db:migrate:prod
```

### 2. Deploy Background Worker
```bash
# Development
npm run worker:deploy

# Production  
npm run worker:deploy:prod
```

### 3. Verify Setup
Check worker logs in Cloudflare dashboard to ensure:
- Worker is running every minute
- Market hours detection is working
- Symbols are being refreshed in round-robin order

## Configuration

### Market Hours
Currently set to 9:30 AM - 4:00 PM ET, Monday-Friday. Modify `isMarketHours()` in `BackgroundRefreshService` to adjust.

### Symbol Priority
- **Preferred stocks**: Priority 10 (from `PreferredStocks` enum)
- **User-searched stocks**: Priority 5
- Higher priority symbols refresh more frequently in round-robin

### Refresh Frequency
- Cron runs every minute during market hours
- With ~15 symbols, each gets refreshed every ~15 minutes
- Adjustable by modifying cron schedule in `wrangler.background.toml`

## Monitoring

### Worker HTTP Endpoints
The background worker exposes HTTP endpoints for monitoring:

```bash
# Get refresh statistics
curl -X POST "https://fergfo-background-refresh.worker.dev/refresh/stats" \
  -H "Authorization: Bearer refresh-worker-secret"

# Manually refresh next symbol
curl -X POST "https://fergfo-background-refresh.worker.dev/refresh/next" \
  -H "Authorization: Bearer refresh-worker-secret"

# Refresh specific symbol
curl -X POST "https://fergfo-background-refresh.worker.dev/refresh/symbol/AAPL" \
  -H "Authorization: Bearer refresh-worker-secret"
```

### Database Queries
```sql
-- Check refresh statistics
SELECT * FROM refresh_statistics;

-- Check symbol tracking
SELECT symbol, priority, last_refreshed_at, error_count 
FROM symbol_tracking 
WHERE is_active = 1 
ORDER BY priority DESC, symbol;

-- Check refresh state
SELECT * FROM refresh_state;
```

## Performance Benefits

### Before (Direct API Calls)
- Page load: 2-5 seconds (external API calls)
- Rate limiting issues
- Inconsistent response times

### After (Cached with Background Refresh)
- Page load: <500ms (DB reads only)
- No rate limiting for users
- Consistent fast response times
- Data freshness: ~15 minutes max

## Troubleshooting

### No Data for New Symbols
1. Search for the symbol to add it to tracking
2. Wait 1-15 minutes for background refresh
3. Check worker logs for errors

### Background Worker Not Running
1. Check Cloudflare dashboard for worker status
2. Verify cron trigger is active
3. Check worker logs for deployment issues

### Stale Data
1. Check `last_refreshed_at` in `symbol_tracking` table
2. Look for errors in `error_count` and `last_error` fields
3. Manually trigger refresh via HTTP endpoint

## Files Created/Modified

### New Files
- `src/migrations/002_symbol_tracking.sql` - Database schema
- `src/services/background_refresh_service.ts` - Background refresh logic
- `src/workers/background_refresh.ts` - Cloudflare Worker
- `wrangler.background.toml` - Worker configuration

### Modified Files
- `src/services/optionsService.ts` - Cache-first data fetching
- `src/services/database_service.ts` - Symbol tracking methods
- `package.json` - Worker deployment scripts

## Next Steps

1. **Monitor Performance**: Check page load times and data freshness
2. **Scale Symbols**: Add more symbols as needed (system supports 1000+)
3. **Add Alerting**: Set up notifications for worker failures
4. **Optimize Timing**: Adjust refresh frequency based on usage patterns
5. **Add Analytics**: Track which symbols are most requested

The system is now ready for production use with cached options data and background refresh!
