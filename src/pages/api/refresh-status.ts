import type { APIRoute } from 'astro';
import { BackgroundRefreshService } from '../../services/background_refresh_service';

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Get D1 database from runtime
    const db = (locals.runtime?.env?.DB as D1Database) || null;
    
    if (!db) {
      return new Response(
        JSON.stringify({ error: 'Database not available' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const refreshService = BackgroundRefreshService.getInstance(db);
    
    // Get refresh statistics
    const stats = await refreshService.getRefreshStatistics();
    
    // Check if market is open
    const isMarketOpen = refreshService.isMarketHours();
    
    // Get current time
    const currentTime = new Date().toISOString();
    
    const response = {
      success: true,
      timestamp: currentTime,
      market_open: isMarketOpen,
      statistics: {
        total_symbols: stats.total_symbols,
        active_symbols: stats.active_symbols,
        preferred_symbols: stats.preferred_symbols,
        symbols_refreshed: stats.symbols_refreshed,
        symbols_with_errors: stats.symbols_with_errors,
        most_recent_refresh: stats.most_recent_refresh,
        oldest_refresh: stats.oldest_refresh
      }
    };
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        } 
      }
    );
  } catch (err) {
    console.error('Error fetching refresh status:', err);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
