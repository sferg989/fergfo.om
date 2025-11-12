import { BackgroundRefreshService } from '../services/background_refresh_service';

interface Env {
  DB: D1Database;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext): Promise<void> {
    const startTime = Date.now();
    const triggeredAt = new Date().toISOString();

    console.log('═══════════════════════════════════════════════════════');
    console.log(`[WORKER] Background refresh worker triggered at: ${triggeredAt}`);
    console.log(`[WORKER] Cron: ${event.cron}`);
    console.log('═══════════════════════════════════════════════════════');

    try {
      // Check if database is available
      if (!env.DB) {
        console.error('[WORKER ERROR] Database not available in worker environment');
        console.error('[WORKER ERROR] Check D1 bindings in wrangler configuration');
        return;
      }

      console.log('[WORKER] Database connection confirmed');
      const refreshService = BackgroundRefreshService.getInstance(env.DB);

      // Check if we're in market hours (only refresh during market hours)
      const isMarketOpen = refreshService.isMarketHours();
      const now = new Date();
      console.log(`[WORKER] Current time: ${now.toISOString()}`);
      console.log(`[WORKER] Market status: ${isMarketOpen ? '✅ OPEN' : '❌ CLOSED'}`);

      if (!isMarketOpen) {
        console.log('[WORKER] Outside market hours (9:30 AM - 4:00 PM ET, Mon-Fri), skipping refresh');
        console.log('[WORKER] Worker will run again at next cron interval');
        return;
      }

      console.log('[WORKER] Market is open, proceeding with refresh');

      // Get next symbol to refresh
      const symbolToRefresh = await refreshService.getNextSymbolToRefresh();

      if (!symbolToRefresh) {
        console.warn('[WORKER WARNING] No symbols available for refresh');
        console.warn('[WORKER WARNING] Check symbol_tracking table for active symbols');
        return;
      }

      console.log(`[WORKER] Selected symbol for refresh: ${symbolToRefresh}`);

      // Refresh the symbol
      const result = await refreshService.refreshSymbol(symbolToRefresh);

      if (result.success) {
        console.log(`[WORKER SUCCESS] ${symbolToRefresh} refreshed successfully`);
        if (result.details) {
          console.log(`[WORKER SUCCESS] Options count: ${result.details.optionsCount || 0}`);
          console.log(`[WORKER SUCCESS] Duration: ${result.details.duration}ms`);
        }
      } else {
        console.error(`[WORKER FAILURE] ${symbolToRefresh} refresh failed`);
        console.error(`[WORKER FAILURE] Error: ${result.error}`);
        if (result.details) {
          console.error(`[WORKER FAILURE] Duration: ${result.details.duration}ms`);
        }
      }

      // Log current statistics
      const stats = await refreshService.getRefreshStatistics();
      console.log('─────────────────────────────────────────────────────');
      console.log('[WORKER STATS] Refresh statistics:');
      console.log(`[WORKER STATS]   Total symbols: ${stats.total_symbols}`);
      console.log(`[WORKER STATS]   Active symbols: ${stats.active_symbols}`);
      console.log(`[WORKER STATS]   Preferred symbols: ${stats.preferred_symbols}`);
      console.log(`[WORKER STATS]   Symbols refreshed: ${stats.symbols_refreshed}`);
      console.log(`[WORKER STATS]   Symbols with errors: ${stats.symbols_with_errors}`);
      console.log(`[WORKER STATS]   Most recent refresh: ${stats.most_recent_refresh || 'Never'}`);
      console.log(`[WORKER STATS]   Oldest refresh: ${stats.oldest_refresh || 'Never'}`);

      const totalDuration = Date.now() - startTime;
      console.log('─────────────────────────────────────────────────────');
      console.log(`[WORKER] Total execution time: ${totalDuration}ms`);
      console.log('═══════════════════════════════════════════════════════');

    } catch (error) {
      const totalDuration = Date.now() - startTime;
      console.error('═══════════════════════════════════════════════════════');
      console.error('[WORKER CRITICAL ERROR] Fatal error in background refresh worker');
      console.error(`[WORKER CRITICAL ERROR] Execution time before failure: ${totalDuration}ms`);
      console.error('[WORKER CRITICAL ERROR] Error details:', error);

      if (error instanceof Error) {
        console.error(`[WORKER CRITICAL ERROR] Message: ${error.message}`);
        console.error(`[WORKER CRITICAL ERROR] Stack: ${error.stack}`);
      }
      console.error('═══════════════════════════════════════════════════════');

      // Re-throw the error so Cloudflare can track worker failures
      throw error;
    }
  },


};
