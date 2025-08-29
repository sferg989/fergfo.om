import { DatabaseService } from './database_service';
import { OptionScorer } from '../utils/optionScorer';
import YahooFinance from 'yahoo-finance2';

export interface OptionData {
  contractName: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  expirationDate: string;
  impliedVolatility: number;
  delta?: number;
  gamma?: number;
  theta?: number;
}

interface YahooOptionData {
  percentChange?: number;
  openInterest?: number;
  strike: number;
  change?: number;
  inTheMoney: boolean;
  impliedVolatility?: number;
  volume?: number;
  ask?: number;
  contractSymbol: string;
  lastTradeDate?: Date;
  expiration?: Date;
  contractSize?: string;
  currency?: string;
  bid?: number;
  lastPrice?: number;
}



export class OptionsService {
  private static instance: OptionsService;
  private dbService: DatabaseService | null = null;

  private constructor() {
    // Yahoo Finance doesn't require an API key
  }

  static getInstance(db?: D1Database): OptionsService {
    if (!this.instance) {
      this.instance = new OptionsService();
    }
    if (db && !this.instance.dbService) {
      this.instance.dbService = DatabaseService.getInstance(db);
    }
    return this.instance;
  }

  // Set database service for dependency injection
  setDatabase(db: D1Database): void {
    this.dbService = DatabaseService.getInstance(db);
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      // Get basic options data to retrieve current price from quote
      const data = await YahooFinance.options(symbol, { formatted: true });
      const currentPrice = data.quote?.regularMarketPrice ?? 0;
      
      return currentPrice;
    } catch (error) {
      console.error('Error fetching current price:', error);
      return 0;
    }
  }

  async fetchOptionsData(symbol: string): Promise<{ options: OptionData[]; currentPrice: number; error?: string }> {
    try {
      // Add symbol to tracking if database is available (for background refresh)
      if (this.dbService) {
        try {
          await this.addSymbolToTracking(symbol);
        } catch (trackingError) {
          console.warn(`Failed to add ${symbol} to tracking:`, trackingError);
          // Continue with data fetch even if tracking fails
        }

        const cachedData = await this.getLatestOptionsFromDB(symbol);
        if (cachedData.options.length > 0) {
          console.log(`Returning cached data for ${symbol} from ${cachedData.fetchedAt}`);
          return cachedData;
        }
        console.log(`No cached data found for ${symbol}, database refresh will handle this`);
      }

      // If no cached data or no database, return empty with message
      return { 
        options: [], 
        currentPrice: 0, 
        error: `No cached data available for ${symbol}. Data will be available shortly via background refresh.` 
      };
    } catch (error) {
      console.error('Error fetching options data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { 
        options: [], 
        currentPrice: 0, 
        error: `Failed to fetch options data: ${errorMessage}` 
      };
    }
  }

  /**
   * Add a searched symbol to the tracking table for background refresh
   */
  private async addSymbolToTracking(symbol: string): Promise<void> {
    if (!this.dbService) {
      return;
    }
    
    try {
      await this.dbService.addSymbolToTracking(symbol, false);
    } catch (error) {
      console.error(`Error adding ${symbol} to tracking:`, error);
      throw error;
    }
  }

  /**
   * Get the latest options data from database for a symbol
   */
  private async getLatestOptionsFromDB(symbol: string): Promise<{ options: OptionData[]; currentPrice: number; fetchedAt: string }> {
    if (!this.dbService) {
      throw new Error('Database service not available');
    }

    // Get the most recent snapshot for this symbol
    const snapshots = await this.dbService.getRecentSnapshots(symbol, 1);
    if (snapshots.length === 0) {
      return { options: [], currentPrice: 0, fetchedAt: '' };
    }

    const latestSnapshot = snapshots[0];
    
    // Get options for this snapshot
    const optionsData = await this.dbService.getOptionsForSnapshot(latestSnapshot.id);
    
    // Transform historical data back to OptionData format
    const options: OptionData[] = optionsData.map(opt => ({
      contractName: opt.contractName,
      strike: opt.strike,
      lastPrice: opt.lastPrice,
      bid: opt.bid,
      ask: opt.ask,
      volume: opt.volume,
      openInterest: opt.openInterest,
      expirationDate: opt.expirationDate,
      impliedVolatility: opt.impliedVolatility,
      delta: opt.delta,
      gamma: opt.gamma,
      theta: opt.theta
    }));

    return {
      options,
      currentPrice: latestSnapshot.currentPrice,
      fetchedAt: latestSnapshot.fetchedAt
    };
  }

  /**
   * Fetch fresh data from external API (for background refresh only)
   */
  async fetchFreshOptionsData(symbol: string): Promise<{ options: OptionData[]; currentPrice: number; error?: string }> {
    try {
      console.log(`Fetching fresh data for ${symbol} from external API`);
      
      // Get base options data to retrieve current price and available expiration dates
      const baseData = await YahooFinance.options(symbol, { formatted: true });
      const currentPrice = baseData.quote?.regularMarketPrice ?? 0;

      // Get Friday expiration dates within 90 days
      const fridayDates = this.getFridayExpirationDates();
      
      // Fetch options data for each Friday expiration date
      const allOptions: OptionData[] = [];
      
      for (const date of fridayDates) {
        try {
          const dateOptionsData = await YahooFinance.options(symbol, {
            date: date,
            formatted: true,
          });
          
          if (dateOptionsData.options[0]?.puts) {
            const transformedOptions = this.transformYahooOptionsData(
              dateOptionsData.options[0].puts, 
              currentPrice,
              date
            );
            allOptions.push(...transformedOptions);
          }
        } catch (dateError) {
          console.error(`Error fetching options for date ${date.toISOString().split('T')[0]}:`, dateError);
          // Continue with other dates even if one fails
        }
      }

      // Save to database if available
      if (this.dbService && allOptions.length > 0) {
        try {
          const scores = allOptions.map(option => 
            OptionScorer.calculateScore(option, currentPrice)
          );
          
          await this.dbService.saveCompleteSnapshot(
            symbol,
            currentPrice,
            allOptions,
            scores
          );
          console.log(`Saved fresh data for ${symbol} to database`);
        } catch (dbError) {
          console.error('Failed to save to database:', dbError);
          throw dbError; // Re-throw for background worker to handle
        }
      }

      return { options: allOptions, currentPrice };
    } catch (error) {
      console.error('Error fetching fresh options data:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { 
        options: [], 
        currentPrice: 0, 
        error: `Failed to fetch fresh options data: ${errorMessage}` 
      };
    }
  }

  private getFridayExpirationDates(): Date[] {
    const today = new Date();
    
    // Find the next Friday
    const daysUntilNextFriday = (5 - today.getDay() + 7) % 7;
    const nextFriday = new Date(today.getTime() + (daysUntilNextFriday * 24 * 60 * 60 * 1000));
    
    // Generate the next 5 Fridays
    const fridayDates: Date[] = [];
    for (let i = 0; i < 15; i++) {
      let fridayDate = new Date(nextFriday.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
      fridayDate = new Date(fridayDate.toISOString().split('T')[0]);
      fridayDates.push(fridayDate);
    }
    return fridayDates;
  }

  private transformYahooOptionsData(puts: YahooOptionData[], currentPrice: number, expirationDate: Date): OptionData[] {
    const priceRange = {
      min: currentPrice * 0.9,
      max: currentPrice * 1.1
    };

    return puts
      .filter(option => {
        // Ensure we have valid strike price and some bid/ask data
        return option.strike >= priceRange.min && 
               option.strike <= priceRange.max &&
               (option.bid ?? 0) > 0; // Only include options with meaningful bid prices
      })
      .map((option): OptionData => {
        // Estimate theta based on time decay if not provided
        // This is a rough estimation: theta ≈ -option premium / days to expiry / 365
        const daysToExpiry = Math.ceil(
          (expirationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        const estimatedTheta = daysToExpiry > 0 ? 
          -((option.bid ?? 0) / daysToExpiry / 365) : undefined;

        return {
          contractName: option.contractSymbol,
          strike: option.strike,
          lastPrice: option.lastPrice ?? 0,
          bid: option.bid ?? 0,
          ask: option.ask ?? 0,
          volume: option.volume ?? 0,
          openInterest: option.openInterest ?? 0,
          expirationDate: expirationDate.toISOString(),
          impliedVolatility: option.impliedVolatility ?? 0,
          delta: undefined, // Yahoo Finance doesn't provide Greeks in basic response
          gamma: undefined,
          theta: estimatedTheta // Use estimated theta for scoring
        };
      });
  }



  // Database query methods
  async getHistoricalSnapshots(symbol: string, limit: number = 10) {
    if (!this.dbService) {
      throw new Error('Database service not available');
    }
    return await this.dbService.getRecentSnapshots(symbol, limit);
  }

  async getOptionsForSnapshot(snapshotId: string) {
    if (!this.dbService) {
      throw new Error('Database service not available');
    }
    return await this.dbService.getOptionsForSnapshot(snapshotId);
  }

  async getTopPerformingOptions(symbol: string, days: number = 30, limit: number = 10) {
    if (!this.dbService) {
      throw new Error('Database service not available');
    }
    return await this.dbService.getTopPerformingOptions(symbol, days, limit);
  }

  async getStockPerformanceData(symbol: string, days: number = 30) {
    if (!this.dbService) {
      throw new Error('Database service not available');
    }
    return await this.dbService.getStockPerformanceData(symbol, days);
  }
} 