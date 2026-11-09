import type { OptionData, OptionScore } from '../types/option';

/** One snapshot's contribution to option_daily_stats for a (symbol, UTC day, strike, expiration) */
export interface OptionDailyStatRow {
  symbol: string;
  day: string;
  strike: number;
  expirationDate: string;
  snapshotCount: number;
  maxScore: number;
  sumScore: number;
  sumLastPrice: number;
  maxVolume: number;
  maxOpenInterest: number;
  minBid: number;
  maxAsk: number;
}

/**
 * Rows to upsert into option_daily_stats for a snapshot taken at `isoTime`. Each option in a
 * snapshot is a distinct (strike, expiration), so every row counts exactly one snapshot and the
 * database upsert folds it into the day's running max/min/sum.
 */
export const dailyStatRowsFor = (
  symbol: string,
  isoTime: string,
  options: OptionData[],
  scores: OptionScore[]
): OptionDailyStatRow[] => {
  if (options.length !== scores.length) {
    throw new Error('Mismatch between options and scores');
  }
  const day = isoTime.slice(0, 10);
  return options.map((option, i) => ({
    symbol: symbol.toUpperCase(),
    day,
    strike: option.strike,
    expirationDate: option.expirationDate,
    snapshotCount: 1,
    maxScore: scores[i].total,
    sumScore: scores[i].total,
    sumLastPrice: option.lastPrice,
    maxVolume: option.volume,
    maxOpenInterest: option.openInterest,
    minBid: option.bid,
    maxAsk: option.ask
  }));
};
