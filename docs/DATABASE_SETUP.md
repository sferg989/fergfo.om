# Options Tracker Database Setup

## Overview
The application now includes a Cloudflare D1 database to store and track historical options data. This allows you to analyze performance trends and track option scores over time.

## Database Information
- **Database Name**: `options-tracker`
- **Database ID**: `06cd1245-d0de-4491-be4b-4f1e7c2de1f3`
- **Binding Name**: `DB`

## Database Schema

### Tables Created:
1. **stock_snapshots** - Stores stock price and metadata at each fetch
2. **option_snapshots** - Stores individual option data for each stock snapshot
3. **option_score_snapshots** - Stores calculated scores for each option

### Views Created:
1. **option_data_with_scores** - Easy querying of complete option data with scores
2. **stock_performance_summary** - Performance tracking over time

## Features Added

### Automatic Data Persistence
- Every time you fetch options data, it's automatically saved to the database
- Option scores are calculated and stored alongside the raw data
- Timestamps are preserved for historical analysis

### New API Endpoints

#### `/api/historical-snapshots`
Get recent data snapshots for a symbol
- **Parameters**: `symbol` (required), `limit` (optional, default: 10)
- **Example**: `/api/historical-snapshots?symbol=AAPL&limit=5`

#### `/api/top-performing-options`
Get top performing options for a symbol over time
- **Parameters**: `symbol` (required), `days` (optional, default: 30), `limit` (optional, default: 10)
- **Example**: `/api/top-performing-options?symbol=AAPL&days=30&limit=10`

#### `/api/stock-performance`
Get performance summary for a symbol
- **Parameters**: `symbol` (required), `days` (optional, default: 30)
- **Example**: `/api/stock-performance?symbol=AAPL&days=30`

### UI Enhancements
- Added historical data view on the main page
- Shows recent snapshots, top performing options, and performance trends
- Automatically loads when viewing a stock symbol

## Usage

### Viewing Historical Data
1. Search for any stock symbol (e.g., AAPL, TSLA, etc.)
2. The current options data will be displayed and automatically saved to the database
3. Scroll down to see the "Historical Performance" section
4. View recent snapshots, top options, and performance trends

### API Usage
You can directly call the API endpoints to get historical data:

```javascript
import { RestService } from '@sferg989/astro-utils';

const restService = RestService.Instance();

// Get recent snapshots
const snapshotsResponse = await restService.Get('/api/historical-snapshots?symbol=AAPL');
const snapshots = snapshotsResponse.body;

// Get top performing options
const topOptionsResponse = await restService.Get('/api/top-performing-options?symbol=AAPL&days=30');
const topOptions = topOptionsResponse.body;

// Get performance data
const performanceResponse = await restService.Get('/api/stock-performance?symbol=AAPL');
const performance = performanceResponse.body;
```

## Development Setup

### Local Development
The database is automatically configured in `wrangler.toml` and `astro.config.mjs`.

### Database Migrations
The initial schema has been applied. The migration file is located at:
- `src/migrations/001_initial_schema.sql`

## Data Flow

1. **User searches for a stock** → Options data fetched from Finnhub API
2. **Data processing** → Options filtered and scores calculated
3. **Database storage** → Complete snapshot saved with timestamps
4. **UI display** → Current data shown + historical data loaded via API
5. **Analysis** → Track performance trends over time

## Benefits

- **Historical Analysis**: Track how option scores change over time
- **Performance Tracking**: See which stocks consistently have high-scoring options
- **Trend Analysis**: Understand market patterns for your preferred stocks
- **Data Persistence**: Never lose valuable options data again
- **API Access**: Build custom dashboards or analysis tools

## Next Steps

You can now:
1. Start collecting data by searching for your favorite stocks
2. Build custom analysis pages using the API endpoints
3. Add more sophisticated charting and visualization
4. Implement alerts based on historical patterns
5. Export data for external analysis tools

The database will automatically grow as you use the application, building a valuable historical dataset of options performance over time.
