import { DEFAULT_MARGIN_RATE, ReturnCalculator } from './returnCalculator';

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
  const returnPct = (amount: number) =>
    ReturnCalculator.calculateSimpleReturn({ premium: amount, strike, marginRate: DEFAULT_MARGIN_RATE });
  return {
    expiredOtm: intrinsicAtExpiry === 0,
    realizedReturn: Math.round((premium - intrinsicAtExpiry) * 100) / 100,
    realizedReturnPct: Math.round((returnPct(premium) - returnPct(intrinsicAtExpiry)) * 100) / 100,
  };
};
