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
  premiumScore: number;
  thetaScore: number;
  strikeScore: number;
  dteScore: number;
}

export type ScoreClass = 'score-excellent' | 'score-good' | 'score-moderate' | 'score-weak' | 'score-poor';

export interface StockOptionsData {
  symbol: string;
  options: OptionData[];
  currentPrice: number;
  error?: string;
} 