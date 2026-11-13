import { describe, expect, it } from 'vitest';
import { isBidConsistentWithChain, isExpirationScorable, isStrikeInDeltaBand, MAX_PUT_DELTA, MIN_PUT_DELTA } from '../optionsUtils';
import { DTE_ZERO_UPPER } from '../optionScorer';
import { putDelta } from '../blackScholes';

const SPOT = 100;
const DTE = 35;

describe('isStrikeInDeltaBand', () => {
  it('keeps a ~20-delta strike more than 10% below spot at high IV', () => {
    const strike = 85;
    expect(Math.abs(putDelta(SPOT, strike, DTE, 0.8)!)).toBeCloseTo(0.2, 1);
    expect(isStrikeInDeltaBand(SPOT, strike, DTE, 0.8)).toBe(true);
  });

  it('drops a deep OTM ~2-delta strike', () => {
    const strike = 55;
    expect(Math.abs(putDelta(SPOT, strike, DTE, 0.8)!)).toBeLessThan(0.05);
    expect(isStrikeInDeltaBand(SPOT, strike, DTE, 0.8)).toBe(false);
  });

  it('drops an ITM put with |delta| above 0.5', () => {
    expect(isStrikeInDeltaBand(SPOT, 115, DTE, 0.8)).toBe(false);
  });

  describe('inclusive delta bounds at IV 0.8', () => {
    const IV = 0.8;
    const absDelta = (strike: number) => Math.abs(putDelta(SPOT, strike, DTE, IV)!);

    it('keeps a strike just above the MIN_PUT_DELTA floor', () => {
      expect(absDelta(69)).toBeGreaterThanOrEqual(MIN_PUT_DELTA);
      expect(absDelta(69)).toBeLessThan(MIN_PUT_DELTA + 0.01);
      expect(isStrikeInDeltaBand(SPOT, 69, DTE, IV)).toBe(true);
    });

    it('drops a strike just below the MIN_PUT_DELTA floor', () => {
      expect(absDelta(68)).toBeLessThan(MIN_PUT_DELTA);
      expect(absDelta(68)).toBeGreaterThan(MIN_PUT_DELTA - 0.01);
      expect(isStrikeInDeltaBand(SPOT, 68, DTE, IV)).toBe(false);
    });

    it('keeps a strike just below the MAX_PUT_DELTA ceiling', () => {
      expect(absDelta(103)).toBeLessThanOrEqual(MAX_PUT_DELTA);
      expect(absDelta(103)).toBeGreaterThan(MAX_PUT_DELTA - 0.01);
      expect(isStrikeInDeltaBand(SPOT, 103, DTE, IV)).toBe(true);
    });

    it('drops a strike just above the MAX_PUT_DELTA ceiling', () => {
      expect(absDelta(104)).toBeGreaterThan(MAX_PUT_DELTA);
      expect(absDelta(104)).toBeLessThan(MAX_PUT_DELTA + 0.01);
      expect(isStrikeInDeltaBand(SPOT, 104, DTE, IV)).toBe(false);
    });
  });

  it.each([0, undefined])('falls back to +/-10%% of spot when IV is %s', (iv) => {
    expect(isStrikeInDeltaBand(SPOT, 95, DTE, iv)).toBe(true);
    expect(isStrikeInDeltaBand(SPOT, 85, DTE, iv)).toBe(false);
  });
});

describe('isExpirationScorable', () => {
  const now = Date.UTC(2026, 10, 9);
  const daysOut = (d: number) => new Date(now + d * 24 * 60 * 60 * 1000);

  it('keeps an expiration inside the DTE window the scorer credits', () => {
    expect(isExpirationScorable(daysOut(38), now)).toBe(true);
  });

  it('drops an expiration at or past the DTE where the score reaches zero', () => {
    expect(isExpirationScorable(daysOut(DTE_ZERO_UPPER), now)).toBe(false);
    expect(isExpirationScorable(daysOut(400), now)).toBe(false);
  });

  it('drops an already-expired date', () => {
    expect(isExpirationScorable(daysOut(-1), now)).toBe(false);
  });
});

describe('isBidConsistentWithChain', () => {
  const quote = (strike: number, bid: number) => ({ strike, bid });

  it('keeps a quote whose bid rises with strike by no more than the strike gap', () => {
    const chain = [quote(90, 1.0), quote(95, 2.0), quote(100, 4.0)];
    expect(isBidConsistentWithChain(chain, chain[1])).toBe(true);
  });

  it('drops a bad print bid far above both neighbours, as Yahoo served for MSFT Jan-27 665', () => {
    const chain = [quote(655, 111.0), quote(660, 116.0), quote(665, 267.9), quote(670, 125.75), quote(675, 130.3)];
    expect(isBidConsistentWithChain(chain, chain[2])).toBe(false);
    // The good quotes either side break a bound against the bad print only, so they stay
    expect(isBidConsistentWithChain(chain, chain[1])).toBe(true);
    expect(isBidConsistentWithChain(chain, chain[3])).toBe(true);
  });

  it('keeps a quote whose bid dips a touch below the lower strike, as stale bids do', () => {
    const chain = [quote(90, 0.52), quote(95, 0.51), quote(100, 0.80)];
    expect(isBidConsistentWithChain(chain, chain[1])).toBe(true);
  });

  it('ignores zero-bid neighbours when comparing', () => {
    const chain = [quote(90, 1.0), quote(95, 0), quote(100, 2.0)];
    expect(isBidConsistentWithChain(chain, chain[2])).toBe(true);
  });

  it('keeps a quote with no priced neighbours', () => {
    const chain = [quote(100, 2.0)];
    expect(isBidConsistentWithChain(chain, chain[0])).toBe(true);
  });
});

describe('isBidConsistentWithChain for calls', () => {
  it('applies the mirrored bound: a lower strike is worth more, by at most the strike gap', () => {
    // DELL Jun 2028 on 2026-11-12: the $260 call was quoted far below both neighbours
    const chain = [{ strike: 230, bid: 194 }, { strike: 240, bid: 188.5 }, { strike: 260, bid: 144.15 }, { strike: 280, bid: 169 }];
    expect(isBidConsistentWithChain(chain, chain[2], 'call')).toBe(false);
    expect(isBidConsistentWithChain(chain, chain[1], 'call')).toBe(true);
  });
});
