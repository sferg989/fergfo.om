import { describe, expect, it } from 'vitest';
import { MIN_CLOSES_FOR_REALIZED_VOL, realizedVolatility } from '../realizedVolatility';

/** Closes that alternate up and down by a fixed log step: stdev of returns is exactly that step */
const alternating = (count: number, dailyMove: number): number[] =>
  Array.from({ length: count }, (_, i) => 100 * Math.exp(i % 2 === 0 ? 0 : dailyMove));

describe('realizedVolatility', () => {
  it('annualizes the daily standard deviation of log returns over 252 trading days', () => {
    const closes = alternating(21, 0.02);
    // Returns are ±0.02 with mean ~0; sample stdev slightly above 0.02
    expect(realizedVolatility(closes)!).toBeCloseTo(0.02 * Math.sqrt(252), 1);
  });

  it('is zero for a flat price series', () => {
    expect(realizedVolatility(Array(15).fill(50))).toBe(0);
  });

  it('is undefined with too few closes or a non-positive close', () => {
    expect(realizedVolatility(alternating(MIN_CLOSES_FOR_REALIZED_VOL - 1, 0.02))).toBeUndefined();
    expect(realizedVolatility([...alternating(14, 0.02), 0])).toBeUndefined();
  });
});
