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
  premiumScore: number;
  thetaScore: number;
  strikeScore: number;
  dteScore: number;
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
    currentPrice: number;
    topOptionScore: number;
    optionCount: number;
  }>;
}
