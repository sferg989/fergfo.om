import { describe, expect, it } from 'vitest';
import { evaluateCallQuotes, gateCallQuotes, SCORE_DELTA_MAX, SCORE_DELTA_MIN } from '../callQuoteGates';
import { CALL_RISK_FREE_RATE, callDelta, callPrice } from '../blackScholes';
import type { CallQuote } from '../../types/call';

const quote = (strike: number, bid: number, ask: number): CallQuote => ({
  contractName: `TEST${strike}`, strike, expirationDate: '2028-06-16T00:00:00.000Z', bid, ask, volume: 10, openInterest: 100,
});

/** Real five-strike blocks captured from Yahoo on 2026-11-12 (design doc appendix) */
const NET = { ctx: { spot: 318.5, daysToExpiry: 434, dividendYield: 0, forecastVol: 0.56 },
  quotes: [quote(175, 169.85, 174), quote(180, 166.5, 171), quote(185, 120, 123.5), quote(190, 166.5, 171), quote(195, 156.2, 160.85)] };
const CRWD = { ctx: { spot: 229.87, daysToExpiry: 581, dividendYield: 0, forecastVol: 0.5 },
  quotes: [quote(120, 128, 137), quote(125, 125, 134), quote(127.5, 90.1, 96), quote(130, 121, 130), quote(132.5, 145, 151.75)] };
const DELL = { ctx: { spot: 371.17, daysToExpiry: 581, dividendYield: 0.007, forecastVol: 0.63 },
  quotes: [quote(230, 194, 198.5), quote(240, 188.5, 193.5), quote(260, 144.15, 148), quote(280, 169, 173.5), quote(290, 165, 169)] };

const CLEAN_CTX = { spot: 100, daysToExpiry: 500, dividendYield: 0, forecastVol: 0.4 };
const CLEAN_STRIKES = [60, 70, 80, 90, 100, 110, 120];
/** A chain priced at one volatility with a 1% spread: nothing in it should be dropped */
const cleanChain = (): CallQuote[] => CLEAN_STRIKES.map(strike => {
  const fair = callPrice(CLEAN_CTX.spot, strike, CLEAN_CTX.daysToExpiry, 0.45, 0, CALL_RISK_FREE_RATE)!;
  return quote(strike, fair * 0.995, fair * 1.005);
});
const inBand = (strike: number) => {
  const delta = callDelta(CLEAN_CTX.spot, strike, CLEAN_CTX.daysToExpiry, CLEAN_CTX.forecastVol, 0, CALL_RISK_FREE_RATE)!;
  return delta >= SCORE_DELTA_MIN && delta <= SCORE_DELTA_MAX;
};
const passed = (block: typeof NET, strike: number) => {
  const result = evaluateCallQuotes(block.quotes, block.ctx).find(r => r.quote.strike === strike);
  expect(result).toBeDefined();
  return result!.passed;
};

describe('gateCallQuotes on real bad quotes', () => {
  it('drops the NET $185 call whose ask is below intrinsic', () => {
    expect(passed(NET, 185)).toBe(false);
    expect(gateCallQuotes(NET.quotes, NET.ctx).kept.map(c => c.strike)).not.toContain(185);
  });

  it('drops the CRWD $127.50 call whose ask is below intrinsic', () => {
    expect(passed(CRWD, 127.5)).toBe(false);
  });

  it('drops the DELL $260 call that passes the intrinsic check but breaks the chain and the smile', () => {
    expect(DELL.quotes[2].ask).toBeGreaterThan(DELL.ctx.spot - 260);
    expect(passed(DELL, 260)).toBe(false);
    // The sound quotes either side of it stay
    for (const strike of [230, 240, 280, 290]) expect(passed(DELL, strike)).toBe(true);
  });

  it('drops CRWD $132.50, priced above the lower strikes beside it', () => {
    expect(passed(CRWD, 132.5)).toBe(false);
  });
});

describe('gateCallQuotes', () => {
  it('keeps a clean chain intact and returns only the scored delta band', () => {
    const { kept, dropped } = gateCallQuotes(cleanChain(), CLEAN_CTX);
    expect(dropped).toBe(0);
    expect(kept.map(c => c.strike)).toEqual(CLEAN_STRIKES.filter(inBand));
    expect(kept.length).toBeGreaterThan(2);
    kept.forEach(c => expect(c.impliedVol).toBeCloseTo(0.45, 2));
  });

  it('drops a quote with zero bid, with ask below bid, or with a spread over 15% of the ask', () => {
    const strikes = CLEAN_STRIKES.filter(inBand);
    const withBad = (mutate: (q: CallQuote) => CallQuote) =>
      gateCallQuotes(cleanChain().map(q => (q.strike === strikes[1] ? mutate(q) : q)), CLEAN_CTX);

    for (const mutate of [
      (q: CallQuote) => ({ ...q, bid: 0 }),
      (q: CallQuote) => ({ ...q, bid: q.ask + 1 }),
      (q: CallQuote) => ({ ...q, bid: q.ask * 0.8 }),
    ]) {
      const { kept, dropped } = withBad(mutate);
      expect(kept.map(c => c.strike)).not.toContain(strikes[1]);
      expect(dropped).toBe(1);
    }
  });

  it('drops a quote whose implied volatility is far from its neighbours', () => {
    const strikes = CLEAN_STRIKES.filter(inBand);
    // Cheaper by a third of its time value, yet still above intrinsic and inside the chain bounds
    const chain = cleanChain().map(q => {
      if (q.strike !== strikes[1]) return q;
      const intrinsic = Math.max(0, CLEAN_CTX.spot - q.strike);
      const ask = intrinsic + (q.ask - intrinsic) * 0.55;
      return { ...q, bid: ask * 0.99, ask };
    });
    expect(gateCallQuotes(chain, CLEAN_CTX).kept.map(c => c.strike)).not.toContain(strikes[1]);
  });

  it('drops a contract that has fewer than two usable neighbours', () => {
    const twoStrikes = cleanChain().filter(q => q.strike === 80 || q.strike === 90);
    expect(gateCallQuotes(twoStrikes, CLEAN_CTX)).toEqual({ kept: [], dropped: 2 });
  });

  it('returns an empty result for an empty expiration', () => {
    expect(gateCallQuotes([], CLEAN_CTX)).toEqual({ kept: [], dropped: 0 });
  });
});
