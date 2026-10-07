export interface ShortPutSettlement {
  expiredOtm: boolean;
  /** Per-share profit or loss: premium kept minus any intrinsic value paid on assignment */
  realizedReturn: number;
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
  };
};
