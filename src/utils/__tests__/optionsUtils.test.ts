import { describe, expect, it } from 'vitest';
import { isStrikeInDeltaBand } from '../optionsUtils';
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

  it.each([0, undefined])('falls back to +/-10%% of spot when IV is %s', (iv) => {
    expect(isStrikeInDeltaBand(SPOT, 95, DTE, iv)).toBe(true);
    expect(isStrikeInDeltaBand(SPOT, 85, DTE, iv)).toBe(false);
  });
});
