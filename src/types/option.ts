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

export interface ScoredOption extends OptionData {
  score: OptionScore;
}

export interface OptionScore {
  total: number;
  expectedReturnScore: number;
  dteScore: number;
  liquidityScore: number;
  spreadPenalty: number;
}

export interface GroupedOption {
  expiryDate: string;
  rawExpiryDate: string;
  daysToExpiry: number;
  options: OptionData[];
}

export type ScoreClass = 'score-excellent' | 'score-good' | 'score-moderate' | 'score-weak' | 'score-poor';

export interface StockOptionsData {
  symbol: string;
  options: OptionData[];
  currentPrice: number;
  /** Annualized realized volatility of the underlying, when enough daily closes exist */
  realizedVol?: number;
  /** Known earnings report times used by the scorer */
  earningsDates?: string[];
  fetchedAt?: string;
  error?: string;
} 
/** One preferred symbol's top-scoring options, as rendered on /preferred */
export interface StockSectionData {
  symbol: string;
  currentPrice: number;
  topOptions: ScoredOption[];
  highestScore: number;
  /** Annualized premium % of the best top option, used to rank symbols with equal scores */
  bestAnnualizedPremium: number;
  error?: string;
}
