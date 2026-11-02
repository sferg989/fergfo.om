import { ReturnCalculator } from './returnCalculator';

const MARGIN_RATE = 0.20;

export interface ShortPutSettlement {
  expiredOtm: boolean;
  /** Per-share profit or loss: premium kept minus any intrinsic value paid on assignment */
  realizedReturn: number;
  /** realizedReturn as a percentage of collateral (strike x margin) */
  realizedReturnPct: number;
}

/** What a seller of this put ended up with, given the underlying's close at expiration */
export const settleShortPut = ({ strike, premium, settlementPrice }: {
  strike: number;
  premium: number;
  settlementPrice: number;
}): ShortPutSettlement => {
  const intrinsicAtExpiry = Math.max(0, strike - settlementPrice);
  return {
    expiredOtm: intrinsicAtExpiry === 0,
    realizedReturn: Math.round((premium - intrinsicAtExpiry) * 100) / 100,
    realizedReturnPct: Math.round(
      (ReturnCalculator.calculateSimpleReturn({ premium, strike, marginRate: MARGIN_RATE })
        - ReturnCalculator.calculateSimpleReturn({ premium: intrinsicAtExpiry, strike, marginRate: MARGIN_RATE })) * 100
    ) / 100,
  };
};
