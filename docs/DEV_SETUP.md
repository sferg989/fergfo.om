# Development Setup Guide

This guide will help you set up the local development environment for the Options Tracker application.

## Prerequisites

- Node.js 22.11 (check `.nvmrc`)
- npm or pnpm
- Cloudflare Wrangler CLI

## Quick Setup

1. **Install Node.js version**:
   ```bash
   nvm use
   ```

2. **Install dependencies**:
   ```bash
   npm ci
   ```

3. **Install Wrangler CLI** (if not already installed):
   ```bash
   npm install -g wrangler
   ```

4. **Setup local database**:
   ```bash
   ./setup-local-db.sh
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

## Database Configuration

### Local Development
- Uses local SQLite database via Cloudflare D1 local mode
- Database name: `options-tracker-local`
- Database ID: `a89f41ce-342e-4711-8aec-ab0d6f8fdaca`

### Production
- Uses Cloudflare D1 production database
- Database name: `options-tracker`
- Configured in `wrangler.toml` under `[env.production]`

## Environment Variables

Create a `.env` file with your Finnhub API key:
```
PUBLIC_FINNHUB_API_KEY=your_api_key_here
```

## Database Management

### View local database contents:
```bash
wrangler d1 execute options-tracker-local --local --command="SELECT * FROM stock_snapshots LIMIT 5;"
```

### Apply new migrations:
```bash
wrangler d1 migrations apply options-tracker-local --local
```

### Reset local database:
```bash
wrangler d1 migrations apply options-tracker-local --local --file=src/migrations/001_initial_schema.sql
```

## Troubleshooting

### Issue: "Database not available" errors
1. Make sure the local database is created: `./setup-local-db.sh`
2. Check that wrangler is properly configured
3. Verify the database binding in `astro.config.mjs`

### Issue: Caching problems on /preferred page
- The app now uses intelligent caching - parallel requests when using cache, sequential with delays only when forcing refresh
- Cache duration is 60 minutes
- Use the "Refresh All Data" button to force refresh

### Issue: Historical data not showing
1. Check browser console for API errors
2. Verify database has data: see database management commands above
3. Check that the D1 binding is working properly

## Development Features

### Caching Strategy
- **Normal load**: Parallel requests leverage caching for fast loading
- **Force refresh**: Sequential requests with 2-second delays to avoid rate limits
- Cache shows timestamp and indicates if data is cached

### Database Features
- Automatic data persistence when fetching options
- Historical snapshots tracking
- Performance analysis over time
- Top performing options tracking

### API Endpoints
- `/api/stock-options` - Current options data
- `/api/historical-snapshots` - Recent data snapshots
- `/api/top-performing-options` - Best performing options over time
- `/api/stock-performance` - Performance summary

## Production Deployment

The app is configured for Cloudflare Pages with D1 database.

1. Set up production database in Cloudflare dashboard
2. Update `wrangler.toml` with correct database ID
3. Deploy via `npm run build`

## File Structure

```
src/
├── components/          # Astro components
├── layouts/            # Page layouts
├── pages/              # Routes and API endpoints
├── services/           # Business logic
├── types/              # TypeScript types
├── utils/              # Utility functions
├── styles/             # CSS files
└── migrations/         # Database migrations
```
