import { optional } from "astro:schema";

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
  private CACHE_DURATION = 60000; // 60 seconds

  private constructor() {
    this.apiKey = import.meta.env.PUBLIC_FINNHUB_API_KEY;
  }

  static getInstance(): OptionsService {
    if (!this.instance) {
      this.instance = new OptionsService();
    }
    return this.instance;
  }

  async getCurrentPrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.apiKey}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      return data.c || 0; // Current price
    } catch (error) {
      console.error('Error fetching current price:', error);
      return 0;
    }
  }

  async fetchOptionsData(symbol: string): Promise<{ options: OptionData[]; currentPrice: number; error?: string }> {
    try {
      const cacheKey = `options_${symbol}`;
      const cachedData = this.cache.get(cacheKey);
      
      if (cachedData && Date.now() - cachedData.timestamp < this.CACHE_DURATION) {
        return cachedData.data;
      }

      const response = await fetch(
        `https://finnhub.io/api/v1/stock/option-chain?symbol=${symbol}&token=${this.apiKey}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      const currentPrice = data.lastTradePrice;

      if (!data.data || !data.data.length) {
        throw new Error('No options data available');
      }

      const options = this.transformOptionsData(data.data, currentPrice);

      const result = { options, currentPrice };
      this.cache.set(cacheKey, { timestamp: Date.now(), data: result });
      
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
    // console.log('data', data[5].expirationDate)
    // console.log('data', data[5].options.PUT)
    const rightdata = data[5].options.PUT.filter(option=>{
      
      

      
    })

    console.log(rightdata);
    
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
} 