import { describe, expect, it } from 'vitest';
import { buildCallRows, dividendYieldFromQuote, forecastVolatility, isLongDated } from '../callChain';
import { realizedVolatility } from '../realizedVolatility';
import { CALL_RISK_FREE_RATE, callPrice } from '../blackScholes';
import { CALL_SCORER_VERSION } from '../callScorer';
import type { CallQuote } from '../../types/call';

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date('2026-11-12T20:30:00Z').getTime();

describe('dividendYieldFromQuote', () => {
  it('reads Yahoo dividendYield as a percent and the trailing field as a fraction', () => {
    expect(dividendYieldFromQuote({ dividendYield: 4.2, trailingAnnualDividendYield: 0.039 })).toBeCloseTo(0.042, 10);
    expect(dividendYieldFromQuote({ trailingAnnualDividendYield: 0.0077 })).toBeCloseTo(0.0077, 10);
  });

  it('is zero when the stock pays nothing or Yahoo sends neither field', () => {
    expect(dividendYieldFromQuote({})).toBe(0);
    expect(dividendYieldFromQuote({ dividendYield: 0, trailingAnnualDividendYield: 0 })).toBe(0);
  });

  it('falls back to the trailing field when Yahoo sends a null dividendYield', () => {
    expect(dividendYieldFromQuote({ dividendYield: null, trailingAnnualDividendYield: 0.042 })).toBeCloseTo(0.042, 10);
  });
});

describe('forecastVolatility', () => {
  const closes = Array.from({ length: 1000 }, (_, i) => 100 * Math.exp(0.01 * Math.sin(i)));

  it('uses the last 756 closes', () => {
    expect(forecastVolatility(closes)).toBe(realizedVolatility(closes.slice(-756)));
  });

  it('uses what exists between 252 and 756 closes', () => {
    expect(forecastVolatility(closes.slice(0, 400))).toBe(realizedVolatility(closes.slice(0, 400)));
  });

  it('refuses fewer than 252 closes', () => {
    expect(forecastVolatility(closes.slice(0, 251))).toBeUndefined();
  });
});

describe('isLongDated', () => {
  it('treats 365 days out as long dated and 364 as not', () => {
    expect(isLongDated(new Date(NOW + 365 * DAY_MS), NOW)).toBe(true);
    expect(isLongDated(new Date(NOW + 364 * DAY_MS), NOW)).toBe(false);
  });

  it('counts whole calendar days, as the scorer does, for an expiration stamped at midnight', () => {
    // Refreshed at 15:30 ET on Nov 12 2026; Nov 12 2027 00:00 UTC is 364.15 days later
    expect(isLongDated(new Date('2027-11-12T00:00:00Z'), NOW)).toBe(true);
    expect(isLongDated(new Date('2027-11-11T00:00:00Z'), NOW)).toBe(false);
  });
});

describe('buildCallRows', () => {
  const expiration = (days: number) => new Date(NOW + days * DAY_MS);
  const chain = (expirationDate: Date, days: number, priceScale = 1): CallQuote[] =>
    [60, 70, 80, 90, 100, 110, 120].map(strike => {
      const fair = callPrice(100, strike, days, 0.45, 0.01, CALL_RISK_FREE_RATE)! * priceScale;
      return {
        contractName: `TEST${days}C${strike}`, strike, expirationDate: expirationDate.toISOString(),
        bid: fair * 0.995, ask: fair * 1.005, volume: 5, openInterest: 50,
      };
    });
  const input = (expirations: { expirationDate: Date; quotes: CallQuote[] }[]) =>
    ({ symbol: 'TEST', day: '2026-11-12', spot: 100, dividendYield: 0.01, forecastVol: 0.4, expirations, now: NOW });

  it('builds a scored row for every kept call of every expiration', () => {
    const { rows, dropped } = buildCallRows(input([
      { expirationDate: expiration(400), quotes: chain(expiration(400), 400) },
      { expirationDate: expiration(760), quotes: chain(expiration(760), 760) },
    ]));
    expect(dropped).toBe(0);
    expect(new Set(rows.map(r => r.expirationDate)).size).toBe(2);
    for (const row of rows) {
      expect(row).toMatchObject({ symbol: 'TEST', day: '2026-11-12', spot: 100, dividendYield: 0.01, forecastVol: 0.4, scorerVersion: CALL_SCORER_VERSION });
      expect(row.delta).toBeGreaterThanOrEqual(0.6);
      expect(row.delta).toBeLessThanOrEqual(0.9);
      // Quoted at 45% vol against a 40% forecast: dearer than fair, but inside the range
      expect(row.ask).toBeGreaterThan(row.fairValue);
      expect(row.verdict).toBe('In range');
      expect(row.impliedVol).toBeCloseTo(0.45, 2);
    }
  });

  it('sums dropped counts across expirations', () => {
    const bad = chain(expiration(400), 400).map(q => (q.strike === 80 ? { ...q, bid: 0 } : q));
    const { dropped } = buildCallRows(input([
      { expirationDate: expiration(400), quotes: bad },
      { expirationDate: expiration(760), quotes: chain(expiration(760), 760).map(q => (q.strike === 90 ? { ...q, bid: 0 } : q)) },
    ]));
    expect(dropped).toBe(2);
  });

  it('returns no rows and does not throw when every quote is unusable', () => {
    const dead = chain(expiration(400), 400).map(q => ({ ...q, bid: 0, ask: 0 }));
    const { rows } = buildCallRows(input([{ expirationDate: expiration(400), quotes: dead }]));
    expect(rows).toEqual([]);
  });

  it('returns no rows for a symbol with no long-dated expirations', () => {
    expect(buildCallRows(input([]))).toEqual({ rows: [], dropped: 0 });
  });
});
