# Product Requirements Document (PRD)  
**Feature:** Cached Options Chains with Scheduled Refresh  
**Repo Context:** Astro + Cloudflare Workers + D1 DB  
**Date:** 2025-08-28  

---

## 1. Background & Problem Statement  
The current implementation (`OptionsService.fetchOptionsData`) calls out to an external API when a page is loaded. This makes the UI/API slower and duplicates work already stored in the DB (`stock_snapshots`, `option_snapshots`, `option_score_snapshots`).  

---

## 2. Goals / Solution  
1. **Read from DB for all requests**  
   - All components (`OptionsTable.astro`, `stock_options_section.astro`, API routes under `/pages/api`) must fetch options data from the **D1 DB only**.  
   - `optionsService.ts` should first query the DB, not the external API.  

2. **Background refresh (rolling updates)**  
   - Add a background worker (Cloudflare Worker + cron trigger) to fetch **1 stock per minute** during US market hours.  
   - Worker stores results in the DB tables (`stock_snapshots`, `option_snapshots`, `option_score_snapshots`).  
   - Over a cycle, all preferred and searched stocks get refreshed.  

---

## 3. Benefits  
- **Faster response time**: API/SSR routes just do DB reads (<500ms).  
- **Fresher data**: Rolling refresh keeps data within ~15 minutes.  
- **Reduced load**: No need to hit the external API on every request.  

---

## 4. Functional Requirements  
- [ ] Update `OptionsService.fetchOptionsData` to:  
  - Query `option_data_with_scores` view for latest snapshot per symbol.  
  - Only return DB data to UI.  
- [ ] Create Cloudflare Worker cron job (`wrangler.toml`) to:  
  - Run every minute.  
  - Select next stock symbol (round-robin).  
  - Fetch external API → write snapshot + options + scores into DB.  
- [ ] Configurable list of tracked symbols (use `PreferredStocks.ts` initially).  
- [ ] Ensure DB schema (`001_initial_schema.sql`) is used for inserts.  

---

## 5. Non-Functional Requirements  
- **Performance**: API/page load <500ms (DB read only).  
- **Scalability**: Support 1000+ stocks via round-robin scheduling.  
- **Reliability**: Retry failed API calls (with exponential backoff).  

---

## 6. Success Metrics  
- Page load times reduced by >50%.  
- Options chain data freshness: max 15 minutes old.  
- No external API calls in `astro` components.  

---

## 7. Out of Scope  
- Pre/post-market refresh.  
- Bulk backfill of historical data (handled separately).  
