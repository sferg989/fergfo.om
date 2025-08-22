import { DatabaseService } from './database_service';
import { OptionScorer } from '../utils/optionScorer';
import { RestService } from '@sferg989/astro-utils';

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

interface RawOptionData {
  contractName: string;
  contractSize: string;
  type: string;
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

interface ApiResponse {
  code: string;
  exchange: string;
  lastTradeDate: string;
  lastTradePrice: number;
  data: {
    expirationDate: string;
    options: {
      PUT: RawOptionData[];
      CALL: RawOptionData[];
    }
  }[];
}

export class OptionsService {
  private static instance: OptionsService;
  private apiKey: string;
  private cache: Map<string, { timestamp: number, data: any }> = new Map();
  private CACHE_DURATION = 3600000; // 60 minutes (3600000 ms)
  private dbService: DatabaseService | null = null;

  private constructor() {
    this.apiKey = import.meta.env.PUBLIC_FINNHUB_API_KEY;
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

  private isCached(key: string): boolean {
    const cachedData = this.cache.get(key);
    return !!cachedData && (Date.now() - cachedData.timestamp) < this.CACHE_DURATION;
  }

  private getCachedData<T>(key: string): T | null {
    if (this.isCached(key)) {
      return this.cache.get(key)!.data as T;
    }
    return null;
  }

  private setCachedData<T>(key: string, data: T): void {
    this.cache.set(key, { timestamp: Date.now(), data });
  }

  // Method to clear cache for testing purposes or manual refresh
  clearCache(symbol?: string): void {
    if (symbol) {
      // Clear cache for specific symbol
      const keys = [`price_${symbol}`, `options_${symbol}`];
      keys.forEach(key => this.cache.delete(key));
    } else {
      // Clear entire cache
      this.cache.clear();
    }
  }

  async getCurrentPrice(symbol: string, forceRefresh = false): Promise<number> {
    try {
      const cacheKey = `price_${symbol}`;
      const cachedPrice = !forceRefresh ? this.getCachedData<number>(cacheKey) : null;
      
      if (cachedPrice !== null) {
        return cachedPrice;
      }

      const restService = RestService.Instance();
      const response = await restService.Get<Record<string, unknown>>(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = response.body as unknown;
      const currentPrice: number =
        typeof data === 'object' && data !== null && 'c' in data && typeof (data as Record<string, unknown>).c === 'number'
          ? (data as Record<string, unknown>).c as number
          : 0; // Current price
      
      // Cache the result
      this.setCachedData(cacheKey, currentPrice);
      
      return currentPrice;
    } catch (error) {
      console.error('Error fetching current price:', error);
      return 0;
    }
  }

  async fetchOptionsData(symbol: string, forceRefresh = false): Promise<{ options: OptionData[]; currentPrice: number; error?: string }> {
    try {
      const cacheKey = `options_${symbol}`;
      const cachedData = !forceRefresh ? this.getCachedData<{ options: OptionData[]; currentPrice: number }>(cacheKey) : null;
      
      if (cachedData !== null) {
        return cachedData;
      }

      const restService = RestService.Instance();
      const response = await restService.Get<ApiResponse>(
        `https://finnhub.io/api/v1/stock/option-chain?symbol=${symbol}&token=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No data received from API');
      }
      
      const data = response.body;
      const currentPrice = data.lastTradePrice;

      if (!data.data || !data.data.length) {
        throw new Error('No options data available');
      }

      const options = this.transformOptionsData(data.data, currentPrice);

      // Save to database if available
      if (this.dbService && options.length > 0) {
        try {
          const scores = options.map(option => 
            OptionScorer.calculateScore(option, currentPrice)
          );
          
          await this.dbService.saveCompleteSnapshot(
            symbol,
            currentPrice,
            options,
            scores
          );
        } catch (dbError) {
          console.error('Failed to save to database:', dbError);
          // Continue execution even if database save fails
        }
      }

      const result = { options, currentPrice };
      this.setCachedData(cacheKey, result);
      
      return result;
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

  private transformOptionsData(data: ApiResponse['data'], currentPrice: number): OptionData[] {
    if (!data || !data.length) {
      return [];
    }

    const today = new Date();
    const priceRange = {
      min: currentPrice * 0.9,
      max: currentPrice * 1.1
    };

    // Process all expiry dates
    return data.flatMap(dateGroup => {
      if (!dateGroup.options?.PUT) return [];

      return dateGroup.options.PUT
        .filter(option => {
          const expiryDate = new Date(option.expirationDate);
          const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return option.strike >= priceRange.min && 
                 option.strike <= priceRange.max && 
                 daysToExpiry <= 60;
        })
        .map((option): OptionData => ({
          contractName: option.contractName,
          strike: option.strike,
          lastPrice: option.lastPrice,
          bid: option.bid,
          ask: option.ask,
          volume: option.volume,
          openInterest: option.openInterest,
          expirationDate: option.expirationDate,
          impliedVolatility: option.impliedVolatility,
          delta: option.delta,
          gamma: option.gamma,
          theta: option.theta
        }));
    });
  }

  // Get the timestamp when the data was last fetched
  getLastFetchTime(symbol: string, dataType: 'price' | 'options'): Date | null {
    const key = dataType === 'price' ? `price_${symbol}` : `options_${symbol}`;
    const cachedData = this.cache.get(key);
    
    if (cachedData) {
      return new Date(cachedData.timestamp);
    }
    
    return null;
  }

  // Get time remaining until cache expiration in minutes
  getCacheTimeRemaining(symbol: string, dataType: 'price' | 'options'): number | null {
    const key = dataType === 'price' ? `price_${symbol}` : `options_${symbol}`;
    const cachedData = this.cache.get(key);
    
    if (cachedData) {
      const expirationTime = cachedData.timestamp + this.CACHE_DURATION;
      const timeRemaining = Math.max(0, expirationTime - Date.now());
      return Math.ceil(timeRemaining / 60000); // Convert to minutes
    }
    
    return null;
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