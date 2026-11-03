import { describe, expect, it } from 'vitest';
import { OptionScorer } from '../optionScorer';
import { ScoreThresholds } from '../../enums/scoreThresholds';

/** ISO expiry such that Math.ceil on the day difference yields exactly `days` */
const expiringIn = (days: number): string =>
  new Date(Date.now() + days * 86_400_000 - 3_600_000).toISOString();

const SPOT = 100;
/** Realized vol 10 points under the textbook put's 0.35 IV: a typical volatility risk premium */
const REALIZED_VOL = 0.25;

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
  it('reports expected return, dte, liquidity and spread components', () => {
    const score = OptionScorer.calculateScore(put(), SPOT, REALIZED_VOL);
    expect(Object.keys(score).sort()).toEqual(
      ['dteScore', 'expectedReturnScore', 'liquidityScore', 'spreadPenalty', 'total']
    );
  });

  it('dte score rises until 38 days then falls, with no jumps between adjacent days', () => {
    const scores = Array.from({ length: 120 }, (_, i) =>
      OptionScorer.calculateScore(put({ expirationDate: expiringIn(i + 1) }), SPOT, REALIZED_VOL).dteScore
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
    expect(scores[37]).toBe(20);
  });

  it('a richer premium at the same strike, expiry and realized vol earns a higher expected return score', () => {
    const thin = OptionScorer.calculateScore(put({ bid: 0.8, ask: 0.9 }), SPOT, REALIZED_VOL);
    const rich = OptionScorer.calculateScore(put({ bid: 1.8, ask: 1.9 }), SPOT, REALIZED_VOL);
    expect(rich.expectedReturnScore).toBeGreaterThan(thin.expectedReturnScore);
  });

  it('a put whose premium is below its expected assignment loss scores zero on expected return', () => {
    // Premium is fair at IV 0.35; the stock actually moves at 0.5, so expected loss exceeds it
    const score = OptionScorer.calculateScore(put(), SPOT, 0.5);
    expect(score.expectedReturnScore).toBe(0);
  });

  it('a fairly priced put with no IV-over-realized gap scores below the minimum threshold', () => {
    const score = OptionScorer.calculateScore(put(), SPOT, 0.35);
    expect(score.total).toBeLessThan(ScoreThresholds.MINIMUM);
  });

  it('a higher-IV put does not outscore a lower-IV put just for its IV when neither has edge', () => {
    const lowIv = OptionScorer.calculateScore(put({ strike: 95.25, bid: 0.67, ask: 0.7, impliedVolatility: 0.2 }), SPOT, 0.2);
    const highIv = OptionScorer.calculateScore(put({ strike: 81, bid: 4, ask: 4.2, impliedVolatility: 1.0 }), SPOT, 1.0);
    expect(highIv.expectedReturnScore).toBeLessThanOrEqual(lowIv.expectedReturnScore + 1);
  });

  it('yield counts only extrinsic value, so an in-the-money bid made of intrinsic value earns little', () => {
    const otm = OptionScorer.calculateScore(put(), SPOT, REALIZED_VOL);
    const itm = OptionScorer.calculateScore(put({ strike: 109, bid: 9.5, ask: 9.7 }), SPOT, REALIZED_VOL);
    expect(itm.expectedReturnScore).toBeLessThan(otm.expectedReturnScore);
  });

  it('falls back to a haircut of the option IV when realized vol is unknown, scoring the put more cautiously', () => {
    const withoutRealized = OptionScorer.calculateScore(put(), SPOT);
    const withRealized = OptionScorer.calculateScore(put(), SPOT, REALIZED_VOL);
    expect(withoutRealized.expectedReturnScore).toBeGreaterThan(0);
    expect(withoutRealized.expectedReturnScore).toBeLessThan(withRealized.expectedReturnScore);
    expect(withoutRealized.total).toBeGreaterThanOrEqual(ScoreThresholds.MINIMUM);
  });

  it('expected return scales linearly with edge so twice the net premium scores about twice', () => {
    const thin = OptionScorer.calculateScore(put({ bid: 0.8, ask: 0.9 }), SPOT, REALIZED_VOL);
    const rich = OptionScorer.calculateScore(put({ bid: 1.8, ask: 1.9 }), SPOT, REALIZED_VOL);
    expect(rich.expectedReturnScore - thin.expectedReturnScore).toBeGreaterThan(30);
  });

  it('a textbook 35-day, ~20-delta put with a 10-point vol premium clears the standard threshold', () => {
    const score = OptionScorer.calculateScore(put(), SPOT, REALIZED_VOL);
    expect(score.total).toBeGreaterThanOrEqual(ScoreThresholds.STANDARD);
  });

  it('a deep in-the-money put falls below the minimum threshold', () => {
    const score = OptionScorer.calculateScore(put({ strike: 109, bid: 9.5, ask: 9.7 }), SPOT, REALIZED_VOL);
    expect(score.total).toBeLessThan(ScoreThresholds.MINIMUM);
  });

  it('the preferred threshold is reachable', () => {
    const ideal = OptionScorer.calculateScore(
      put({ strike: 87.25, bid: 2.25, ask: 2.3, impliedVolatility: 0.6, expirationDate: expiringIn(38), openInterest: 20000, volume: 5000 }),
      SPOT,
      0.45
    );
    expect(ideal.total).toBeGreaterThanOrEqual(ScoreThresholds.PREFERRED);
  });

  it('penalises a wide bid-ask spread', () => {
    const tight = OptionScorer.calculateScore(put({ bid: 1.2, ask: 1.25 }), SPOT, REALIZED_VOL);
    const wide = OptionScorer.calculateScore(put({ bid: 1.2, ask: 1.6 }), SPOT, REALIZED_VOL);
    expect(tight.spreadPenalty).toBe(0);
    expect(wide.spreadPenalty).toBeGreaterThan(0);
    expect(wide.total).toBeLessThan(tight.total);
  });
});
