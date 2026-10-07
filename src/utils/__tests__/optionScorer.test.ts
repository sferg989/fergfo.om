import { describe, expect, it } from 'vitest';
import { OptionScorer } from '../optionScorer';
import { ScoreThresholds } from '../../enums/scoreThresholds';

/** ISO expiry such that Math.ceil on the day difference yields exactly `days` */
const expiringIn = (days: number): string =>
  new Date(Date.now() + days * 86_400_000 - 3_600_000).toISOString();

const SPOT = 100;

const put = (overrides: Partial<Parameters<typeof OptionScorer.calculateScore>[0]> = {}) => ({
  bid: 1.2,
  ask: 1.3,
  strike: 92,
  expirationDate: expiringIn(35),
  impliedVolatility: 0.35,
  volume: 100,
  openInterest: 800,
  ...overrides,
});

describe('OptionScorer', () => {
  it('reports yield, risk, dte, liquidity and spread components', () => {
    const score = OptionScorer.calculateScore(put(), SPOT);
    expect(Object.keys(score).sort()).toEqual(
      ['dteScore', 'liquidityScore', 'riskScore', 'spreadPenalty', 'total', 'yieldScore']
    );
  });

  it('dte score rises until 38 days then falls, with no jumps between adjacent days', () => {
    const scores = Array.from({ length: 120 }, (_, i) =>
      OptionScorer.calculateScore(put({ expirationDate: expiringIn(i + 1) }), SPOT).dteScore
    );
    for (let dte = 2; dte <= 120; dte++) {
      const prev = scores[dte - 2];
      const curr = scores[dte - 1];
      if (dte <= 38) {
        expect(curr, `dte ${dte} should not score below dte ${dte - 1}`).toBeGreaterThanOrEqual(prev);
      } else {
        expect(curr, `dte ${dte} should not score above dte ${dte - 1}`).toBeLessThanOrEqual(prev);
      }
      expect(Math.abs(curr - prev), `jump between dte ${dte - 1} and ${dte}`).toBeLessThanOrEqual(1);
    }
    expect(scores[37]).toBe(15);
  });

  it('a richer premium at the same strike and expiry earns a higher yield score', () => {
    const thin = OptionScorer.calculateScore(put({ bid: 0.6, ask: 0.7 }), SPOT);
    const rich = OptionScorer.calculateScore(put({ bid: 1.8, ask: 1.9 }), SPOT);
    expect(rich.yieldScore).toBeGreaterThan(thin.yieldScore);
  });

  it('yield counts only extrinsic value, so an in-the-money bid made of intrinsic value earns little', () => {
    const otm = OptionScorer.calculateScore(put({ strike: 92, bid: 1.2, ask: 1.3 }), SPOT);
    const itm = OptionScorer.calculateScore(put({ strike: 109, bid: 9.5, ask: 9.7 }), SPOT);
    expect(itm.yieldScore).toBeLessThan(otm.yieldScore);
  });

  it('an in-the-money put scores lower on risk than an equally distant out-of-the-money put', () => {
    const otm = OptionScorer.calculateScore(put({ strike: 95 }), SPOT);
    const itm = OptionScorer.calculateScore(put({ strike: 105, bid: 5.8, ask: 6 }), SPOT);
    expect(itm.riskScore).toBeLessThan(otm.riskScore);
    expect(otm.riskScore).toBeGreaterThan(0);
  });

  it('a textbook 35-day, ~20-delta put clears the standard threshold', () => {
    const score = OptionScorer.calculateScore(put(), SPOT);
    expect(score.total).toBeGreaterThanOrEqual(ScoreThresholds.STANDARD);
  });

  it('a deep in-the-money put falls below the minimum threshold', () => {
    const score = OptionScorer.calculateScore(put({ strike: 109, bid: 9.5, ask: 9.7 }), SPOT);
    expect(score.total).toBeLessThan(ScoreThresholds.MINIMUM);
  });

  it('the preferred threshold is reachable', () => {
    const ideal = OptionScorer.calculateScore(
      put({ strike: 85, bid: 2.5, ask: 2.55, impliedVolatility: 0.9, expirationDate: expiringIn(38), openInterest: 20000, volume: 5000 }),
      SPOT
    );
    expect(ideal.total).toBeGreaterThanOrEqual(ScoreThresholds.PREFERRED);
  });

  it('penalises a wide bid-ask spread', () => {
    const tight = OptionScorer.calculateScore(put({ bid: 1.2, ask: 1.25 }), SPOT);
    const wide = OptionScorer.calculateScore(put({ bid: 1.2, ask: 1.6 }), SPOT);
    expect(tight.spreadPenalty).toBe(0);
    expect(wide.spreadPenalty).toBeGreaterThan(0);
    expect(wide.total).toBeLessThan(tight.total);
  });
});
