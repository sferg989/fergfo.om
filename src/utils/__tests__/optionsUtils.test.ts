import { describe, expect, it } from 'vitest';
import { isStrikeInDeltaBand, MAX_PUT_DELTA, MIN_PUT_DELTA } from '../optionsUtils';
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
