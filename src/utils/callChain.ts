import { realizedVolatility } from './realizedVolatility';
import { gateCallQuotes } from './callQuoteGates';
import { CALL_SCORER_VERSION, scoreCall } from './callScorer';
import type { CallQuote, CallQuoteRow } from '../types/call';

/**
 * Daily closes behind the volatility forecast. Three years predicted the following year's
 * volatility better than one or two, and without bias (npm run backtest:call-vol).
 */
export const FORECAST_VOL_CLOSES = 756;
/** A newer listing is forecast from what exists, down to one year; below that it is not scored */
export const MIN_FORECAST_VOL_CLOSES = 252;
/** Calls nearer than this are not long-dated */
export const MIN_CALL_DTE = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Volatility expected over a long call's life, from daily closes oldest first */
export const forecastVolatility = (closes: number[]): number | undefined =>
  closes.length < MIN_FORECAST_VOL_CLOSES ? undefined : realizedVolatility(closes.slice(-FORECAST_VOL_CLOSES));

/**
 * Dividend yield as a fraction per year. Yahoo's `dividendYield` is a percent (4.2) while
 * `trailingAnnualDividendYield` is a fraction (0.042).
 */
export const dividendYieldFromQuote = (quote: { dividendYield?: number | null; trailingAnnualDividendYield?: number | null }): number =>
  typeof quote.dividendYield === 'number' ? quote.dividendYield / 100 : quote.trailingAnnualDividendYield ?? 0;

/** Whole days to expiration, counting a part day as a day, as the put scorer does */
const daysUntil = (expiration: Date, now: number): number => Math.ceil((expiration.getTime() - now) / DAY_MS);

export const isLongDated = (expiration: Date, now = Date.now()): boolean => daysUntil(expiration, now) >= MIN_CALL_DTE;

/** Gates and scores every expiration of one symbol's long-dated call chain */
export const buildCallRows = (input: {
  symbol: string;
  day: string;
  spot: number;
  dividendYield: number;
  forecastVol: number;
  expirations: { expirationDate: Date; quotes: CallQuote[] }[];
  now?: number;
}): { rows: CallQuoteRow[]; dropped: number } => {
  const { symbol, day, spot, dividendYield, forecastVol, now = Date.now() } = input;
  const rows: CallQuoteRow[] = [];
  let dropped = 0;

  for (const { expirationDate, quotes } of input.expirations) {
    const ctx = { spot, daysToExpiry: daysUntil(expirationDate, now), dividendYield, forecastVol };
    const gated = gateCallQuotes(quotes, ctx);
    dropped += gated.dropped;
    for (const call of gated.kept) {
      rows.push({ ...call, ...scoreCall(call, ctx), symbol, day, spot, dividendYield, forecastVol, scorerVersion: CALL_SCORER_VERSION });
    }
  }
  return { rows, dropped };
};
