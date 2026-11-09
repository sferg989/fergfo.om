import { describe, expect, it } from 'vitest';
import { dailyStatRowsFor } from '../optionDailyStats';
import type { OptionData, OptionScore } from '../../types/option';

const option = (overrides: Partial<OptionData>): OptionData => ({
  contractName: 'AMZN261218P00200000',
  strike: 200,
  lastPrice: 5,
  bid: 4.8,
  ask: 5.2,
  volume: 10,
  openInterest: 100,
  expirationDate: '2026-12-18T00:00:00.000Z',
  impliedVolatility: 0.4,
  ...overrides
});
const score = (total: number): OptionScore => ({ total, expectedReturnScore: 0, dteScore: 0, liquidityScore: 0, spreadPenalty: 0 });

describe('dailyStatRowsFor', () => {
  it('emits one row per option keyed by symbol, day, strike and expiration with the snapshot counted once', () => {
    const rows = dailyStatRowsFor('amzn', '2026-11-09T15:00:00.000Z', [option({})], [score(72.5)]);
    expect(rows).toEqual([{
      symbol: 'AMZN',
      day: '2026-11-09',
      strike: 200,
      expirationDate: '2026-12-18T00:00:00.000Z',
      snapshotCount: 1,
      maxScore: 72.5,
      sumScore: 72.5,
      sumLastPrice: 5,
      maxVolume: 10,
      maxOpenInterest: 100,
      minBid: 4.8,
      maxAsk: 5.2
    }]);
  });

  it('pairs each option with its score by position', () => {
    const rows = dailyStatRowsFor('AMZN', '2026-11-09T15:00:00.000Z',
      [option({ strike: 200 }), option({ strike: 195 })], [score(10), score(20)]);
    expect(rows.map(r => [r.strike, r.maxScore])).toEqual([[200, 10], [195, 20]]);
  });

  it('rejects mismatched option and score lengths', () => {
    expect(() => dailyStatRowsFor('AMZN', '2026-11-09T15:00:00.000Z', [option({})], [])).toThrow();
  });
});
