import { describe, expect, it } from 'vitest';
import { putDelta, putExpectedAssignmentLoss } from '../blackScholes';

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

describe('putExpectedAssignmentLoss', () => {
  it('matches the undiscounted fair put value at the pricing volatility', () => {
    // A 35-day 92 put at 35% vol is worth about 1.24; undiscounted a few cents more
    expect(putExpectedAssignmentLoss(100, 92, 35, 0.35)!).toBeCloseTo(1.25, 1);
  });

  it('grows with volatility and shrinks as the strike moves further out of the money', () => {
    expect(putExpectedAssignmentLoss(100, 92, 35, 0.5)!).toBeGreaterThan(putExpectedAssignmentLoss(100, 92, 35, 0.35)!);
    expect(putExpectedAssignmentLoss(100, 85, 35, 0.35)!).toBeLessThan(putExpectedAssignmentLoss(100, 92, 35, 0.35)!);
  });

  it('returns undefined when an input makes Black-Scholes undefined', () => {
    expect(putExpectedAssignmentLoss(100, 92, 35, 0)).toBeUndefined();
  });
});
