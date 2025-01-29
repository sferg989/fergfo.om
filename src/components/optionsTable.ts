interface OptionData {
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  expirationDate: string;
}

class OptionsTableManager {
  private static instance: OptionsTableManager;
  private apiKey: string;

  private constructor() {
    this.apiKey = import.meta.env.PUBLIC_FINNHUB_API_KEY;
  }

  static getInstance(): OptionsTableManager {
    if (!this.instance) {
      this.instance = new OptionsTableManager();
    }
    return this.instance;
  }

  async fetchOptionsData(symbol: string): Promise<OptionData[]> {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/stock/option-chain?symbol=${symbol}&token=${this.apiKey}`
      );
      const data = await response.json();
      return this.transformOptionsData(data.data);
    } catch (error) {
      console.error('Error fetching options data:', error);
      return [];
    }
  }

  private transformOptionsData(data: any): OptionData[] {
    // Transform the API response into our OptionData format
    // Only including PUT options
    return data
      .filter((option: any) => option.type === 'put')
      .map((option: any) => ({
        strike: option.strike,
        lastPrice: option.lastPrice,
        bid: option.bid,
        ask: option.ask,
        volume: option.volume,
        openInterest: option.openInterest,
        expirationDate: new Date(option.expirationDate).toLocaleDateString()
      }));
  }
}

export default OptionsTableManager; 