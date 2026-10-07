import type { OptionData, OptionScore } from './option';

export interface StockSnapshot {
  id: string;
  symbol: string;
  currentPrice: number;
  fetchedAt: string; // ISO timestamp
  source: string; // e.g., 'finnhub'
  createdAt?: string;
}

export interface OptionSnapshot {
  id: string;
  snapshotId: string; // foreign key to StockSnapshot
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
  createdAt?: string;
}

export interface OptionScoreSnapshot {
  id: string;
  optionSnapshotId: string; // foreign key to OptionSnapshot
  totalScore: number;
  yieldScore: number;
  riskScore: number;
  dteScore: number;
  liquidityScore: number;
  spreadPenalty: number;
  createdAt?: string;
}

export interface CreateStockSnapshotParams {
  symbol: string;
  currentPrice: number;
  source?: string;
}

export interface CreateOptionSnapshotParams extends Omit<OptionData, 'contractName'> {
  snapshotId: string;
  contractName: string;
}

export interface CreateOptionScoreSnapshotParams extends OptionScore {
  optionSnapshotId: string;
}

export interface HistoricalOptionData extends OptionSnapshot {
  stockSnapshot: StockSnapshot;
  score?: OptionScoreSnapshot;
}

export interface StockPerformanceData {
  symbol: string;
  snapshots: Array<{
    date: string;
    avgPrice: number;
    lowPrice: number;
    highPrice: number;
    topOptionScore: number;
    avgOptionScore: number;
    uniqueOptionsCount: number;
    snapshotCount: number;
  }>;
}

export interface TopPerformingOption {
  strike: number;
  expirationDate: string;
  totalScore: number;
  avgPrice: number;
  maxVolume: number;
  maxOpenInterest: number;
  bestBid: number;
  bestAsk: number;
  snapshotCount: number;
}
/** A contract past expiry with no outcome row yet, plus its oldest surviving snapshot */
export interface ExpiredContract {
  contractName: string;
  symbol: string;
  strike: number;
  expirationDate: string;
  firstSeenAt: string;
  firstSeenBid: number;
  firstSeenScore: number | null;
}

export interface OptionOutcome extends ExpiredContract {
  settlementPrice: number;
  expiredOtm: boolean;
  realizedReturn: number;
}
