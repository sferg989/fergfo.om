import { BackgroundRefreshService } from '../services/background_refresh_service';

interface Env {
  DB: D1Database;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('Background refresh worker triggered at:', new Date().toISOString());
    
    try {
      // Check if database is available
      if (!env.DB) {
        console.error('Database not available in worker environment');
        return;
      }

      const refreshService = BackgroundRefreshService.getInstance(env.DB);
      
      // Check if we're in market hours (only refresh during market hours)
      if (!refreshService.isMarketHours()) {
        console.log('Outside market hours, skipping refresh');
        return;
      }

      console.log('Market is open, proceeding with refresh');
      
      // Get next symbol to refresh
      const symbolToRefresh = await refreshService.getNextSymbolToRefresh();
      
      if (!symbolToRefresh) {
        console.log('No symbols available for refresh');
        return;
      }

      console.log(`Refreshing symbol: ${symbolToRefresh}`);
      
      // Refresh the symbol
      const result = await refreshService.refreshSymbol(symbolToRefresh);
      
      if (result.success) {
        console.log(`Successfully refreshed ${symbolToRefresh}`);
      } else {
        console.error(`Failed to refresh ${symbolToRefresh}: ${result.error}`);
      }

      // Log current statistics
      const stats = await refreshService.getRefreshStatistics();
      console.log('Refresh statistics:', {
        total_symbols: stats.total_symbols,
        active_symbols: stats.active_symbols,
        symbols_refreshed: stats.symbols_refreshed,
        symbols_with_errors: stats.symbols_with_errors,
        most_recent_refresh: stats.most_recent_refresh
      });

    } catch (error) {
      console.error('Error in background refresh worker:', error);
      
      // Re-throw the error so Cloudflare can track worker failures
      throw error;
    }
  },

  
};
