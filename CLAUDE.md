# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
## Core Principles

1. **Zero Duplication**: Always reuse or extend existing utilities instead of reimplementing
2. **Code Discovery First**: Search the codebase thoroughly before writing new functions
3. **Scope Discipline**: Edit only files required for the specific ticket
4. **Single Responsibility**: One purpose per function
5. **Atomic Commits**: One logical change per commit

## What NOT to Do

- **Build for imaginary future requirements** - Only implement what the current ticket requires
- **Add complex error handling for unlikely scenarios** - Simple error handling for expected cases only
- **Suggest design patterns unless actually required** - Use existing patterns, don't introduce new ones
- **Optimize prematurely** - Focus on correctness first, optimize only when performance issues are proven
- **Add configuration for rarely changing values** - Hard-code values that don't need to be configurable
- **Create duplicate functionality** - Always search for and reuse existing utilities
- **Write speculative code** - Each function should have a single, clear purpose tied to actual requirements

## Project Overview

Stock Options Tracker - An Astro-based web application for tracking and analyzing stock options with multi-factor scoring, historical performance tracking, and automated background data refresh via Cloudflare Workers.

## Tech Stack

- **Framework**: Astro 5.0.2 with server-side rendering
- **Styling**: Tailwind CSS (via @astrojs/tailwind)
- **Database**: Cloudflare D1 (SQLite)
- **Background Jobs**: Cloudflare Workers with cron scheduling
- **Data Sources**: Yahoo Finance 2, Finnhub API
- **Deployment**: Cloudflare Pages

## Development Commands

```bash
# Start development server (localhost:4321)
npm run dev

# Build for production (includes type checking)
npm run build

# Run linting and type checking
npm run all

# Database migrations
npm run db:migrate        # Local D1 database
npm run db:migrate:prod    # Production database

# Background worker
npm run worker:dev         # Run worker locally
npm run worker:deploy      # Deploy to development
npm run worker:deploy:prod # Deploy to production
```

## Architecture

### Data Flow
1. User searches trigger data fetch from Yahoo Finance
2. Results cached in D1 database with scoring calculation
3. Background worker refreshes cached data every ~15 minutes during market hours
4. UI reads from cache (fast <500ms responses)

### Key Services

**src/services/optionsService.ts**
- Fetches options data from Yahoo Finance
- Manages caching strategy
- Coordinates with database service

**src/services/database_service.ts**
- All D1 database operations
- Snapshot creation and retrieval
- Symbol tracking management

**src/workers/background_refresh.ts**
- Runs every minute (cron: `* * * * *`)
- Round-robin refresh of tracked symbols
- Market hours check (9:30 AM - 4:00 PM ET, weekdays)

### Database Schema

Key tables:
- `stock_snapshots` - Current stock prices
- `option_snapshots` - Individual option data
- `option_score_snapshots` - Calculated scores
- `symbol_tracking` - Symbols for background refresh

View: `option_data_with_scores` joins all data for display

### Options Scoring Algorithm

Multi-factor scoring in `src/utils/optionScorer.ts`:
- Premium, Theta, Strike, DTE, IV, Liquidity scores
- Spread penalty for bid-ask spreads
- Results in score classes: excellent, good, moderate, weak, poor

## API Endpoints

All endpoints are server-side rendered Astro pages:
- `GET /api/stock-options?symbol=AAPL`
- `GET /api/historical-snapshots?symbol=AAPL`
- `GET /api/top-performing-options?symbol=AAPL&days=30`
- `GET /api/stock-performance?symbol=AAPL&days=30`
- `POST /api/refresh-status` (requires auth)

## Component Structure

Astro components with scoped CSS:
- `src/components/OptionsTable.astro` - Main options display
- `src/components/optionRow.astro` - Individual option rendering
- `src/components/historical_data_view.astro` - Historical trends

Use Tailwind utilities directly in components. Avoid @apply directive.

## Development Guidelines

### Astro Best Practices
- Prioritize static generation where possible
- Use partial hydration sparingly (client:idle, client:visible)
- Keep components in `.astro` format when no client JS needed
- Scoped styles within components

### TypeScript
- Strict type checking enabled
- Interfaces defined in `src/types/`
- Use proper null checking and error handling

### Database Operations
- Always use database_service.ts methods
- Never expose database IDs in API responses
- Cache-first approach for all reads

### Testing Single Features
```bash
# Test specific API endpoint
curl http://localhost:4321/api/stock-options?symbol=AAPL

# Check worker execution
npm run worker:dev
# Then trigger manually via Wrangler dashboard

# View D1 data
npx wrangler d1 execute options-tracker-local --local --command "SELECT * FROM symbol_tracking"
```

## Environment Setup

Required `.env` file:
```
PUBLIC_FINNHUB_API_KEY=your_key_here
```

Local D1 database binding in `astro.config.mjs`:
- Database: `options-tracker-local`
- Auto-created on first run

## Preferred Stocks

Hardcoded list in `src/enums/preferredStocks.ts`:
TSLA, NET, LRCX, CRWD, NVDA, SE, KKR, BX, AAPL, GOOGL, META, AMD, AMZN, NFLX, MSFT

These receive priority 10 in background refresh (vs priority 5 for user-searched).

## Common Modifications

### Add New Preferred Stock
1. Update `src/enums/preferredStocks.ts`
2. Symbol automatically added to tracking on next page load

### Adjust Scoring Algorithm
1. Modify weights in `src/utils/optionScorer.ts`
2. Update thresholds in `src/enums/scoreThresholds.ts`

### Change Refresh Frequency
1. Edit cron schedule in `wrangler.background.toml`
2. Adjust round-robin logic in `background_refresh.ts` if needed

### Add New API Endpoint
1. Create new file in `src/pages/api/`
2. Export async GET/POST handler
3. Use database_service.ts for data access

## Deployment Notes

Production uses Cloudflare Pages with Workers:
- Main app deploys automatically via GitHub
- Worker requires manual deployment: `npm run worker:deploy:prod`
- Database migrations must be run separately: `npm run db:migrate:prod`

Monitor worker execution in Cloudflare dashboard under Workers > Logs.