import { describe, expect, it } from 'vitest';
import { putDelta } from '../blackScholes';

describe('putDelta', () => {
  it('is about -0.5 at the money', () => {
    expect(putDelta(100, 100, 35, 0.35)).toBeCloseTo(-0.48, 1);
  });

  it('approaches -1 deep in the money and 0 far out of the money', () => {
    expect(putDelta(100, 140, 35, 0.35)!).toBeLessThan(-0.95);
    expect(putDelta(100, 70, 35, 0.35)!).toBeGreaterThan(-0.02);
  });

  it('returns undefined when an input makes Black-Scholes undefined', () => {
    expect(putDelta(100, 100, 0, 0.35)).toBeUndefined();
    expect(putDelta(100, 100, 35, 0)).toBeUndefined();
  });
});
