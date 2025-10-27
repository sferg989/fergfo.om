import { OptionsService } from './optionsService';
import { DatabaseService } from './database_service';
import { isMarketHours as checkMarketHours } from '../utils/marketHoursUtils';

interface SymbolTrackingRecord {
  id: string;
  symbol: string;
  is_preferred: boolean;
  priority: number;
  last_refreshed_at?: string;
  last_error?: string;
  error_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RefreshStateRecord {
  id: string;
  last_symbol_refreshed?: string;
  current_position: number;
  total_symbols: number;
  last_cycle_started_at?: string;
  last_cycle_completed_at?: string;
  cycle_count: number;
  created_at: string;
  updated_at: string;
}

interface NextSymbolResult {
  symbol: string;
  priority: number;
  last_refreshed_at?: string;
  error_count: number;
  position: number;
}

export class BackgroundRefreshService {
  private static instance: BackgroundRefreshService;
  private db: D1Database;
  private optionsService: OptionsService;

  private constructor(db: D1Database) {
    this.db = db;
    this.optionsService = OptionsService.getInstance(db);
  }

  static getInstance(db: D1Database): BackgroundRefreshService {
    if (!this.instance) {
      this.instance = new BackgroundRefreshService(db);
    }
    return this.instance;
  }

  /**
   * Get the next symbol to refresh using round-robin strategy
   */
  async getNextSymbolToRefresh(): Promise<string | null> {
    try {
      // Get current refresh state
      const refreshState = await this.getRefreshState();
      
      // Get all active symbols ordered by priority then name
      const symbolsResult = await this.db.prepare(`
        SELECT symbol, priority, last_refreshed_at, error_count,
               ROW_NUMBER() OVER (ORDER BY priority DESC, symbol) as position
        FROM symbol_tracking 
        WHERE is_active = 1
        ORDER BY priority DESC, symbol
      `).all();

      const symbols = symbolsResult.results as unknown as NextSymbolResult[];
      
      if (symbols.length === 0) {
        console.log('No active symbols to refresh');
        return null;
      }

      // Update total symbols count if it changed
      if (symbols.length !== refreshState.total_symbols) {
        await this.updateRefreshState({
          total_symbols: symbols.length
        });
      }

      // Calculate next position (round-robin)
      let nextPosition = (refreshState.current_position % symbols.length) + 1;
      
      // If we've completed a full cycle, record it
      if (nextPosition === 1 && refreshState.current_position > 0) {
        await this.updateRefreshState({
          last_cycle_completed_at: new Date().toISOString(),
          cycle_count: refreshState.cycle_count + 1
        });
        console.log(`Completed refresh cycle ${refreshState.cycle_count + 1}`);
      }

      // If starting a new cycle, record it
      if (nextPosition === 1) {
        await this.updateRefreshState({
          last_cycle_started_at: new Date().toISOString()
        });
      }

      // Get the symbol at the next position
      const targetSymbol = symbols[nextPosition - 1];
      
      console.log(`Next symbol to refresh: ${targetSymbol.symbol} (position ${nextPosition}/${symbols.length})`);
      
      return targetSymbol.symbol;
    } catch (error) {
      console.error('Error getting next symbol to refresh:', error);
      return null;
    }
  }

  /**
   * Refresh options data for a specific symbol
   */
  async refreshSymbol(symbol: string): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();
    
    try {
      console.log(`Starting refresh for symbol: ${symbol}`);
      
      // Fetch fresh data from external API
      const result = await this.optionsService.fetchFreshOptionsData(symbol);
      
      if (result.error) {
        // Update symbol tracking with error
        await this.updateSymbolTracking(symbol, {
          last_error: result.error,
          error_count: await this.incrementErrorCount(symbol),
          updated_at: now
        });
        
        console.error(`Failed to refresh ${symbol}: ${result.error}`);
        return { success: false, error: result.error };
      }

      // Successful refresh - update tracking
      await this.updateSymbolTracking(symbol, {
        last_refreshed_at: now,
        last_error: undefined,
        error_count: 0,
        updated_at: now
      });

      // Update refresh state position
      const refreshState = await this.getRefreshState();
      await this.updateRefreshState({
        last_symbol_refreshed: symbol,
        current_position: (refreshState.current_position % refreshState.total_symbols) + 1,
        updated_at: now
      });

      console.log(`Successfully refreshed ${symbol} with  options`);
      return { success: true };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update symbol tracking with error
      await this.updateSymbolTracking(symbol, {
        last_error: errorMessage,
        error_count: await this.incrementErrorCount(symbol),
        updated_at: now
      });
      
      console.error(`Error refreshing ${symbol}:`, error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Add a new symbol to track (delegates to DatabaseService for consistency)
   */
  async addSymbolToTrack(symbol: string, isPreferred: boolean = false): Promise<void> {
    const dbService = DatabaseService.getInstance(this.db);

    try {
      // Use the centralized method from DatabaseService
      await dbService.addSymbolToTracking(symbol, isPreferred);

      // Update total symbols count in refresh state
      const count = await this.getActiveSymbolCount();
      await this.updateRefreshState({ total_symbols: count });
    } catch (error) {
      console.error(`Error adding symbol ${symbol} to tracking:`, error);
      throw error;
    }
  }

  /**
   * Get refresh statistics
   */
  async getRefreshStatistics(): Promise<{
    total_symbols: number;
    active_symbols: number;
    preferred_symbols: number;
    symbols_with_errors: number;
    symbols_refreshed: number;
    most_recent_refresh?: string;
    oldest_refresh?: string;
  }> {
    const result = await this.db.prepare(`
      SELECT 
        COUNT(*) as total_symbols,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_symbols,
        COUNT(CASE WHEN is_preferred = 1 THEN 1 END) as preferred_symbols,
        COUNT(CASE WHEN error_count > 0 THEN 1 END) as symbols_with_errors,
        COUNT(CASE WHEN last_refreshed_at IS NOT NULL THEN 1 END) as symbols_refreshed,
        MAX(last_refreshed_at) as most_recent_refresh,
        MIN(last_refreshed_at) as oldest_refresh
      FROM symbol_tracking
    `).first();

    return result as unknown as {
      total_symbols: number;
      active_symbols: number;
      preferred_symbols: number;
      symbols_with_errors: number;
      symbols_refreshed: number;
      most_recent_refresh?: string;
      oldest_refresh?: string;
    };
  }

  /**
   * Check if it's during market hours (9:30 AM - 4:00 PM ET, Monday-Friday, excluding holidays)
   * Now properly handles DST (EDT/EST) and US market holidays
   */
   isMarketHours(): boolean {
    return checkMarketHours();
  }

  // Private helper methods

  private async getRefreshState(): Promise<RefreshStateRecord> {
    const result = await this.db.prepare(`
      SELECT * FROM refresh_state WHERE id = 'main'
    `).first();
    
    return result as unknown as RefreshStateRecord;
  }

  private async updateRefreshState(updates: Partial<RefreshStateRecord>): Promise<void> {
    const fields = Object.keys(updates).filter(key => updates[key as keyof RefreshStateRecord] !== undefined);
    const values = fields.map(key => updates[key as keyof RefreshStateRecord]);
    
    if (fields.length === 0) return;
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    await this.db.prepare(`
      UPDATE refresh_state 
      SET ${setClause}, updated_at = ?
      WHERE id = 'main'
    `).bind(...values, new Date().toISOString()).run();
  }

  private async updateSymbolTracking(symbol: string, updates: Partial<SymbolTrackingRecord>): Promise<void> {
    const fields = Object.keys(updates).filter(key => updates[key as keyof SymbolTrackingRecord] !== undefined);
    const values = fields.map(key => updates[key as keyof SymbolTrackingRecord]);
    
    if (fields.length === 0) return;
    
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    
    await this.db.prepare(`
      UPDATE symbol_tracking 
      SET ${setClause}
      WHERE symbol = ?
    `).bind(...values, symbol.toUpperCase()).run();
  }

  private async incrementErrorCount(symbol: string): Promise<number> {
    const result = await this.db.prepare(`
      SELECT error_count FROM symbol_tracking WHERE symbol = ?
    `).bind(symbol.toUpperCase()).first();
    
    return result ? (result.error_count as number) + 1 : 1;
  }

  private async getActiveSymbolCount(): Promise<number> {
    const result = await this.db.prepare(`
      SELECT COUNT(*) as count FROM symbol_tracking WHERE is_active = 1
    `).first();
    
    return result ? result.count as number : 0;
  }
}
