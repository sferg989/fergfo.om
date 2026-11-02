const TRADING_DAYS_PER_YEAR = 252;
/** Fewer daily closes than this and the estimate is too noisy to price against */
export const MIN_CLOSES_FOR_REALIZED_VOL = 10;

/**
 * Annualized close-to-close realized volatility from consecutive daily closes, oldest first.
 * Undefined when there are too few closes or any close is not positive.
 */
export const realizedVolatility = (closes: number[]): number | undefined => {
  if (closes.length < MIN_CLOSES_FOR_REALIZED_VOL || closes.some(c => c <= 0)) return undefined;

  const logReturns = closes.slice(1).map((close, i) => Math.log(close / closes[i]));
  const mean = logReturns.reduce((sum, r) => sum + r, 0) / logReturns.length;
  const variance = logReturns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / (logReturns.length - 1);
  return Math.sqrt(variance * TRADING_DAYS_PER_YEAR);
};
