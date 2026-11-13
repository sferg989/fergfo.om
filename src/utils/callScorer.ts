import { CALL_RISK_FREE_RATE, callPrice } from './blackScholes';
import type { CallScore, CallVerdict } from '../types/call';

/** Stored on every call quote row; bump when the scoring logic or its constants change */
export const CALL_SCORER_VERSION = '2026-11-12-excess-cost';

/**
 * Typical error of the volatility forecast: three-year trailing volatility missed the next
 * year's by a median 18.6% across the preferred symbols over ten years
 * (npm run backtest:call-vol). The fair range is fair value at the forecast less and plus this.
 */
export const FORECAST_ERROR = 0.19;
/** Excess cost per year that scores 100, and the one that scores 0; linear between */
const BEST_EXCESS_COST = -0.04;
const WORST_EXCESS_COST = 0.08;
/** Score of a call that costs exactly its fair value */
export const FAIR_SCORE = 100 * WORST_EXCESS_COST / (WORST_EXCESS_COST - BEST_EXCESS_COST);
const DAYS_PER_YEAR = 365;

export interface CallScoreContext {
  spot: number;
  daysToExpiry: number;
  dividendYield: number;
  /** Annualized volatility expected over the call's life */
  forecastVol: number;
}

/**
 * Rates what a long call costs against what it is worth. The single measure is the excess cost
 * of holding: what the buyer pays above fair value, plus the half-spread given up again on the
 * way out, per dollar of stock exposure (delta x spot) per year held to expiry. It reads like a
 * fund's expense ratio: zero is a fairly priced call, negative a bargain.
 *
 * Fair value is only as good as the volatility forecast, so a discount that sits inside the
 * forecast's typical error earns no credit: a call scores above FAIR_SCORE only when its ask is
 * below the whole fair range. Breakeven and leverage are left out on purpose; which is better
 * depends on how much leverage the buyer wants, not on value.
 */
export const scoreCall = (
  call: { strike: number; bid: number; ask: number; delta: number },
  ctx: CallScoreContext
): CallScore => {
  // The model prices a call that cannot be exercised early. On a high-yield stock that falls
  // below intrinsic value for deep in-the-money strikes, which the holder can always realise.
  const intrinsic = Math.max(0, ctx.spot - call.strike);
  const fairAt = (vol: number): number =>
    Math.max(intrinsic, callPrice(ctx.spot, call.strike, ctx.daysToExpiry, vol, ctx.dividendYield, CALL_RISK_FREE_RATE) ?? 0);
  const fairValue = fairAt(ctx.forecastVol);
  const fairLow = fairAt(ctx.forecastVol * (1 - FORECAST_ERROR));
  const fairHigh = fairAt(ctx.forecastVol * (1 + FORECAST_ERROR));

  const years = ctx.daysToExpiry / DAYS_PER_YEAR;
  const excessCost = (call.ask - fairValue + (call.ask - call.bid) / 2) / (call.delta * ctx.spot) / years;

  const verdict: CallVerdict = call.ask < fairLow ? 'Cheap' : call.ask > fairHigh ? 'Rich' : 'In range';
  const linear = 100 * (WORST_EXCESS_COST - excessCost) / (WORST_EXCESS_COST - BEST_EXCESS_COST);
  const clamped = Math.max(0, Math.min(100, linear));
  const score = verdict === 'Cheap' ? clamped : Math.min(clamped, FAIR_SCORE);

  return { fairValue, fairLow, fairHigh, excessCost, score, verdict };
};

/** Best first: higher score, then lower excess cost so calls capped at the same score keep an order */
export const compareByScore = (
  a: { score: number; excessCost: number },
  b: { score: number; excessCost: number }
): number => b.score - a.score || a.excessCost - b.excessCost;

/** Yearly rise in the stock needed for the call to be worth its ask at expiry */
export const callBreakevenPerYear = (strike: number, ask: number, spot: number, daysToExpiry: number): number =>
  Math.pow((strike + ask) / spot, DAYS_PER_YEAR / daysToExpiry) - 1;

/** Dollars of stock exposure per dollar spent on the call */
export const callLeverage = (delta: number, spot: number, ask: number): number => delta * spot / ask;
