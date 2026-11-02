import { describe, expect, it } from 'vitest';
import { settleShortPut } from '../optionOutcome';

describe('settleShortPut', () => {
  it('keeps the whole premium when the stock settles above the strike', () => {
    expect(settleShortPut({ strike: 92, premium: 1.2, settlementPrice: 101 }))
      .toEqual({ expiredOtm: true, realizedReturn: 1.2, realizedReturnPct: 6.52 });
  });

  it('keeps the whole premium when the stock settles exactly at the strike', () => {
    expect(settleShortPut({ strike: 92, premium: 1.2, settlementPrice: 92 }).expiredOtm).toBe(true);
  });

  it('loses the intrinsic value net of premium when assigned', () => {
    expect(settleShortPut({ strike: 92, premium: 1.2, settlementPrice: 88 }))
      .toEqual({ expiredOtm: false, realizedReturn: -2.8, realizedReturnPct: -15.22 });
  });

  it('reports the premium as a percentage of collateral when the put expires worthless', () => {
    // collateral = 92 x 0.20 = 18.40; 1.2 / 18.4 = 6.52%
    expect(settleShortPut({ strike: 92, premium: 1.2, settlementPrice: 101 }).realizedReturnPct).toBe(6.52);
  });

  it('reports a negative percentage of collateral when assigned at a loss', () => {
    // (1.2 - 4) / 18.4 = -15.22%
    expect(settleShortPut({ strike: 92, premium: 1.2, settlementPrice: 88 }).realizedReturnPct).toBe(-15.22);
  });
});
