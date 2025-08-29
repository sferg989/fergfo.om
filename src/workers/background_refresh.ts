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

  // Optional: Handle HTTP requests for manual triggering (for debugging)
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Only allow POST requests for security
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    // Simple authentication check (you might want to add a secret header)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== 'Bearer refresh-worker-secret') {
      return new Response('Unauthorized', { status: 401 });
    }

    try {
      if (!env.DB) {
        return new Response('Database not available', { status: 503 });
      }

      const refreshService = BackgroundRefreshService.getInstance(env.DB);
      
      if (url.pathname === '/refresh/next') {
        // Refresh next symbol
        const symbolToRefresh = await refreshService.getNextSymbolToRefresh();
        
        if (!symbolToRefresh) {
          return new Response(JSON.stringify({ 
            success: false, 
            message: 'No symbols available for refresh' 
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        const result = await refreshService.refreshSymbol(symbolToRefresh);
        
        return new Response(JSON.stringify({
          success: result.success,
          symbol: symbolToRefresh,
          error: result.error,
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      } else if (url.pathname === '/refresh/stats') {
        // Get statistics
        const stats = await refreshService.getRefreshStatistics();
        
        return new Response(JSON.stringify({
          success: true,
          statistics: stats,
          market_hours: refreshService.isMarketHours(),
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
        
      } else if (url.pathname.startsWith('/refresh/symbol/')) {
        // Refresh specific symbol
        const symbol = url.pathname.replace('/refresh/symbol/', '').toUpperCase();
        
        if (!symbol || symbol.length > 10) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Invalid symbol'
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Add symbol to tracking if it doesn't exist
        try {
          await refreshService.addSymbolToTrack(symbol, false);
        } catch (error) {
          // Ignore if symbol already exists
        }

        const result = await refreshService.refreshSymbol(symbol);
        
        return new Response(JSON.stringify({
          success: result.success,
          symbol: symbol,
          error: result.error,
          timestamp: new Date().toISOString()
        }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response('Not found', { status: 404 });
      
    } catch (error) {
      console.error('Error in refresh worker HTTP handler:', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
