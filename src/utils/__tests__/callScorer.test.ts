import { describe, expect, it } from 'vitest';
import { FAIR_SCORE, callBreakevenPerYear, callLeverage, compareByScore, scoreCall } from '../callScorer';
import { CALL_RISK_FREE_RATE, callPrice } from '../blackScholes';

// NVDA Dec 2028 $185 call on 2026-11-12
const ctx = { spot: 166.19, daysToExpiry: 763, dividendYield: 0.006, forecastVol: 0.471 };
const STRIKE = 185;
const DELTA = 0.61;
const YEARS = 763 / 365;
const fairAt = (vol: number) => callPrice(ctx.spot, STRIKE, ctx.daysToExpiry, vol, ctx.dividendYield, CALL_RISK_FREE_RATE)!;
const FAIR = fairAt(0.471);
/** A zero-spread quote whose excess cost is exactly `cost` */
const quoteAtCost = (cost: number) => {
  const price = FAIR + cost * DELTA * ctx.spot * YEARS;
  return { strike: STRIKE, bid: price, ask: price, delta: DELTA };
};

describe('scoreCall', () => {
  it('scores a call at exactly fair value with no spread at the fair score, in range', () => {
    const s = scoreCall(quoteAtCost(0), ctx);
    expect(s.fairValue).toBeCloseTo(FAIR, 10);
    expect(s.excessCost).toBeCloseTo(0, 10);
    expect(s.score).toBeCloseTo(200 / 3, 6);
    expect(s.verdict).toBe('In range');
  });

  it('computes excess cost as (ask - fair + half the spread) / (delta x spot) / years', () => {
    const s = scoreCall({ strike: STRIKE, bid: FAIR + 1, ask: FAIR + 3, delta: DELTA }, ctx);
    expect(s.excessCost).toBeCloseTo((3 + 1) / (DELTA * ctx.spot) / YEARS, 10);
  });

  it('brackets fair value with the range at forecast volatility 19% lower and higher', () => {
    const s = scoreCall(quoteAtCost(0.02), ctx);
    expect(s.fairLow).toBeCloseTo(fairAt(0.471 * 0.81), 6);
    expect(s.fairHigh).toBeCloseTo(fairAt(0.471 * 1.19), 6);
  });

  it('maps +8% a year to 0 and clamps beyond it', () => {
    expect(scoreCall(quoteAtCost(0.08), ctx).score).toBeCloseTo(0, 6);
    expect(scoreCall(quoteAtCost(0.2), ctx).score).toBe(0);
  });

  it('scores 50 at +2% a year', () => {
    expect(scoreCall(quoteAtCost(0.02), ctx).score).toBeCloseTo(50, 6);
  });

  it('marks a call Rich when the ask is above the range', () => {
    const ask = fairAt(0.471 * 1.19) + 0.5;
    expect(scoreCall({ strike: STRIKE, bid: ask, ask, delta: DELTA }, ctx).verdict).toBe('Rich');
  });

  it('caps a discount that is inside the range at the fair score', () => {
    const ask = (fairAt(0.471 * 0.81) + FAIR) / 2;
    const s = scoreCall({ strike: STRIKE, bid: ask, ask, delta: DELTA }, ctx);
    expect(s.excessCost).toBeLessThan(0);
    expect(s.verdict).toBe('In range');
    expect(s.score).toBeCloseTo(FAIR_SCORE, 10);
  });

  it('lets a Cheap call score above the fair score, up to 100 at -4% a year', () => {
    const ask = fairAt(0.471 * 0.81) - 0.5;
    const s = scoreCall({ strike: STRIKE, bid: ask, ask, delta: DELTA }, ctx);
    expect(s.verdict).toBe('Cheap');
    expect(s.score).toBeGreaterThan(FAIR_SCORE);
    // A deep in-the-money call has a narrow range, so -4% a year is Cheap there
    const deep = { spot: 100, daysToExpiry: 400, dividendYield: 0, forecastVol: 0.3 };
    const deepFair = callPrice(100, 60, 400, 0.3, 0, CALL_RISK_FREE_RATE)!;
    const price = deepFair - 0.05 * 0.9 * 100 * (400 / 365);
    const deepScore = scoreCall({ strike: 60, bid: price, ask: price, delta: 0.9 }, deep);
    expect(deepScore.verdict).toBe('Cheap');
    expect(deepScore.score).toBe(100);
  });
});

describe('compareByScore', () => {
  it('orders by score, then by lower excess cost', () => {
    const calls = [{ score: 66.67, excessCost: -0.01 }, { score: 66.67, excessCost: -0.03 }, { score: 70, excessCost: -0.05 }];
    expect(calls.sort(compareByScore).map(c => c.excessCost)).toEqual([-0.05, -0.03, -0.01]);
  });
});

describe('display helpers', () => {
  it('computes the yearly rise needed to break even at expiry', () => {
    expect(callBreakevenPerYear(185, 41.45, 166.19, 763)).toBeCloseTo(Math.pow((185 + 41.45) / 166.19, 365 / 763) - 1, 10);
  });

  it('computes leverage as stock exposure per dollar spent', () => {
    expect(callLeverage(0.61, 166.19, 41.45)).toBeCloseTo(0.61 * 166.19 / 41.45, 10);
  });
});

describe('scoreCall on a high-dividend stock', () => {
  it('never puts fair value below intrinsic, since the holder can exercise early', () => {
    // 4.2% yield, 2 years, strike 52 on a $100 stock: the no-early-exercise price is about
    // 44.50, below the 48.00 the call is worth exercised today
    const highYield = { spot: 100, daysToExpiry: 730, dividendYield: 0.042, forecastVol: 0.25 };
    expect(callPrice(100, 52, 730, 0.25, 0.042, CALL_RISK_FREE_RATE)!).toBeLessThan(48);
    const s = scoreCall({ strike: 52, bid: 48.2, ask: 48.6, delta: 0.9 }, highYield);
    expect(s.fairLow).toBeGreaterThanOrEqual(48);
    expect(s.fairValue).toBeGreaterThanOrEqual(48);
    // 60 cents over intrinsic with a 40 cent spread: a small cost, not a 1.9% a year penalty
    expect(s.excessCost).toBeCloseTo((0.6 + 0.2) / (0.9 * 100) / 2, 10);
  });
});
