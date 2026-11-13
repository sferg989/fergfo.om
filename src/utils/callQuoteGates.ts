import { CALL_RISK_FREE_RATE, callDelta, impliedVolFromCallPrice } from './blackScholes';
import { isBidConsistentWithChain } from './optionsUtils';
import type { CallQuote, GatedCall } from '../types/call';

/**
 * Delta band that is scored. Below it a call is a bet on a large move rather than a way to
 * hold the stock; above it the call is nearly stock with little leverage.
 */
export const SCORE_DELTA_MIN = 0.6;
export const SCORE_DELTA_MAX = 0.9;
/** Wider band whose quotes serve as neighbours when judging a scored contract's implied volatility */
export const NEIGHBOUR_DELTA_MIN = 0.5;
export const NEIGHBOUR_DELTA_MAX = 0.95;
/** A spread wider than this share of the ask makes the quote too soft to price against */
const MAX_SPREAD_OF_ASK = 0.15;
/** Furthest a contract's implied volatility may sit from the median of its neighbours */
const MAX_IV_GAP_FROM_NEIGHBOURS = 0.2;
const NEIGHBOUR_COUNT = 4;
const MIN_NEIGHBOURS = 2;

export interface CallGateContext {
  spot: number;
  daysToExpiry: number;
  dividendYield: number;
  /** Used only to place each strike in a delta band */
  forecastVol: number;
}

export interface CallQuoteEvaluation {
  quote: CallQuote;
  delta: number;
  impliedVol: number | undefined;
  passed: boolean;
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

/**
 * Judges every quote of one expiration whose delta falls in the neighbour band. Yahoo serves
 * stale and plainly wrong quotes on thin long-dated contracts, and a wrong quote looks exactly
 * like a bargain: on 2026-11-12 the three cheapest-looking calls across 19 symbols were all bad.
 * A quote passes only if it is two-sided, at or above intrinsic value, consistent with the
 * strikes beside it, not too wide, and priced at a volatility close to its neighbours'.
 */
export const evaluateCallQuotes = (quotes: CallQuote[], ctx: CallGateContext): CallQuoteEvaluation[] => {
  const chain = quotes.map(q => ({ strike: q.strike, bid: q.bid }));

  const firstPass = quotes.flatMap(quote => {
    const delta = callDelta(ctx.spot, quote.strike, ctx.daysToExpiry, ctx.forecastVol, ctx.dividendYield, CALL_RISK_FREE_RATE);
    if (delta === undefined || delta < NEIGHBOUR_DELTA_MIN || delta > NEIGHBOUR_DELTA_MAX) return [];

    const twoSided = quote.bid > 0 && quote.ask >= quote.bid;
    const impliedVol = twoSided
      ? impliedVolFromCallPrice((quote.bid + quote.ask) / 2, ctx.spot, quote.strike, ctx.daysToExpiry, ctx.dividendYield, CALL_RISK_FREE_RATE)
      : undefined;
    const sound = twoSided &&
      quote.ask >= ctx.spot - quote.strike &&
      isBidConsistentWithChain(chain, quote, 'call') &&
      (quote.ask - quote.bid) / quote.ask <= MAX_SPREAD_OF_ASK &&
      impliedVol !== undefined;
    return [{ quote, delta, impliedVol, sound }];
  });

  return firstPass.map(({ quote, delta, impliedVol, sound }) => {
    const neighbours = firstPass
      .filter(other => other.quote !== quote && other.sound)
      .sort((a, b) => Math.abs(a.quote.strike - quote.strike) - Math.abs(b.quote.strike - quote.strike))
      .slice(0, NEIGHBOUR_COUNT);
    const neighbourVol = neighbours.length >= MIN_NEIGHBOURS ? median(neighbours.map(n => n.impliedVol!)) : undefined;
    const passed = sound && neighbourVol !== undefined &&
      Math.abs(impliedVol! - neighbourVol) / neighbourVol <= MAX_IV_GAP_FROM_NEIGHBOURS;
    return { quote, delta, impliedVol, passed };
  });
};

/**
 * The quotes of one expiration that are safe to score: inside the scored delta band and past
 * every gate. `dropped` counts in-band quotes that failed a gate.
 */
export const gateCallQuotes = (quotes: CallQuote[], ctx: CallGateContext): { kept: GatedCall[]; dropped: number } => {
  const inBand = evaluateCallQuotes(quotes, ctx).filter(e => e.delta >= SCORE_DELTA_MIN && e.delta <= SCORE_DELTA_MAX);
  const kept = inBand
    .filter(e => e.passed)
    .map(e => ({ ...e.quote, impliedVol: e.impliedVol!, delta: e.delta }));
  return { kept, dropped: inBand.length - kept.length };
};
