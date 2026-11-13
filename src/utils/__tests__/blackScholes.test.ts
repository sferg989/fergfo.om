import { describe, expect, it } from 'vitest';
import { RISK_FREE_RATE, callDelta, callPrice, impliedVolFromCallPrice, putDelta, putExpectedAssignmentLoss } from '../blackScholes';

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

describe('callPrice', () => {
  it('matches the textbook value', () => {
    // S=100, K=100, 1 year, vol 20%, r=4%: d1=0.3, d2=0.1 -> 9.925
    expect(callPrice(100, 100, 365, 0.2)!).toBeCloseTo(9.925, 2);
  });

  it('falls when a dividend yield is added', () => {
    // q=3%: d1=0.15, d2=-0.05 -> 8.18
    expect(callPrice(100, 100, 365, 0.2, 0.03)!).toBeCloseTo(8.18, 1);
  });

  it('rises with the interest rate', () => {
    expect(callPrice(100, 100, 365, 0.2, 0, 0.05)!).toBeGreaterThan(callPrice(100, 100, 365, 0.2)!);
  });

  it('satisfies put-call parity against the existing put loss', () => {
    // C - P = S - K e^{-rT} with no dividend; putExpectedAssignmentLoss is the undiscounted put
    const df = Math.exp(-RISK_FREE_RATE * 500 / 365);
    const put = putExpectedAssignmentLoss(150, 120, 500, 0.45)! * df;
    expect(callPrice(150, 120, 500, 0.45)! - put).toBeCloseTo(150 - 120 * df, 6);
  });

  it('is undefined for inputs that make the model undefined', () => {
    expect(callPrice(100, 100, 0, 0.2)).toBeUndefined();
  });
});

describe('callDelta', () => {
  it('is higher deeper in the money and equals put delta + 1 with no dividend', () => {
    expect(callDelta(100, 60, 400, 0.4)!).toBeGreaterThan(callDelta(100, 100, 400, 0.4)!);
    expect(callDelta(100, 100, 400, 0.4)!).toBeCloseTo(putDelta(100, 100, 400, 0.4)! + 1, 10);
  });
});

describe('impliedVolFromCallPrice', () => {
  it('round-trips a price', () => {
    const price = callPrice(166, 140, 581, 0.52, 0.006)!;
    expect(impliedVolFromCallPrice(price, 166, 140, 581, 0.006)!).toBeCloseTo(0.52, 4);
  });

  it('is undefined when the price is below what the model can produce', () => {
    // NET Jan 2028 $185 on 2026-11-12: mid 121.75 against spot 318.50 is below intrinsic
    expect(impliedVolFromCallPrice(121.75, 318.5, 185, 434)).toBeUndefined();
  });
});
