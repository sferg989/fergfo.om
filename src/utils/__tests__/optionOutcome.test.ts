import { describe, expect, it } from 'vitest';
import { settleShortPut } from '../optionOutcome';

describe('settleShortPut', () => {
  it('keeps the whole premium when the stock settles above the strike', () => {
    expect(settleShortPut({ strike: 92, premium: 1.2, settlementPrice: 101 }))
      .toEqual({ expiredOtm: true, realizedReturn: 1.2 });
  });

  it('keeps the whole premium when the stock settles exactly at the strike', () => {
    expect(settleShortPut({ strike: 92, premium: 1.2, settlementPrice: 92 }).expiredOtm).toBe(true);
  });

  it('loses the intrinsic value net of premium when assigned', () => {
    expect(settleShortPut({ strike: 92, premium: 1.2, settlementPrice: 88 }))
      .toEqual({ expiredOtm: false, realizedReturn: -2.8 });
  });
});
