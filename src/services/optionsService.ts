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

interface OptionChainData {
  expirationDate: string;
  options: {
    CALL: OptionData[];
    PUT: OptionData[];
  }
}

interface GroupedOptions {
  expiryDate: string;
  rawExpiryDate: string;
  daysToExpiry: number;
  options: OptionData[];
}

export class OptionsService {
  private static instance: OptionsService;
  private apiKey: string;

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
      const data = await response.json();
      return data.c; // Current price
    } catch (error) {
      console.error('Error fetching current price:', error);
      return 0;
    }
  }

  async fetchOptionsData(symbol: string): Promise<{ options: OptionData[], currentPrice: number }> {
    try {
      const [currentPrice, response] = await Promise.all([
        this.getCurrentPrice(symbol),
        fetch(`https://finnhub.io/api/v1/stock/option-chain?symbol=${symbol}&token=${this.apiKey}`)
      ]);

      const data = await response.json();
      const options = this.transformOptionsData(data.data, currentPrice);
      return { options, currentPrice };
    } catch (error) {
      console.error('Error fetching options data:', error);
      return { options: [], currentPrice: 0 };
    }
  }

  private transformOptionsData(data: OptionChainData[], currentPrice: number): OptionData[] {
    if (!data || !data.length) {
      return [];
    }

    const today = new Date();
    const priceRange = {
      min: currentPrice * 0.8,
      max: currentPrice * 1.2
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
        .map((option) => ({
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