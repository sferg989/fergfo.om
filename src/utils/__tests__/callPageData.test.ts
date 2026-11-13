import { describe, expect, it } from 'vitest';
import { buildCallSections } from '../callPageData';
import type { CallQuoteRow, CallRefreshLogRow } from '../../types/call';

const TODAY = '2026-11-13';

const call = (symbol: string, strike: number, score: number, excessCost: number, overrides: Partial<CallQuoteRow> = {}): CallQuoteRow => ({
  contractName: `${symbol}C${strike}`, strike, expirationDate: '2028-01-21T00:00:00.000Z', bid: 10, ask: 10.5, volume: 1, openInterest: 10,
  impliedVol: 0.5, delta: 0.7, fairValue: 10, fairLow: 8, fairHigh: 12, excessCost, score, verdict: 'In range',
  symbol, day: TODAY, spot: 100, dividendYield: 0, forecastVol: 0.45, scorerVersion: 'test', ...overrides,
});
const refresh = (symbol: string, overrides: Partial<CallRefreshLogRow> = {}): CallRefreshLogRow => ({
  symbol, day: TODAY, attempts: 1, status: 'ok', error: null, scored: 3, dropped: 2, fetchedAt: '2026-11-13T20:05:00Z', ...overrides,
});
const build = (symbols: string[], quotes: CallQuoteRow[], refreshes: CallRefreshLogRow[]) =>
  buildCallSections(symbols, quotes, refreshes);

describe('buildCallSections', () => {
  it("picks each symbol's best call by score, then by lower excess cost", () => {
    const [section] = build(['NVDA'], [
      call('NVDA', 140, 60, 0.01), call('NVDA', 150, 66.67, -0.01), call('NVDA', 160, 66.67, -0.02),
    ], [refresh('NVDA')]);
    expect(section.best?.strike).toBe(160);
  });

  it('orders symbols by their best call and puts symbols without one last, alphabetically', () => {
    const sections = build(['ZETA', 'AAPL', 'NVDA', 'BX'], [call('AAPL', 300, 50, 0.02), call('NVDA', 140, 65, 0.002)], [refresh('AAPL'), refresh('NVDA')]);
    expect(sections.map(s => s.symbol)).toEqual(['NVDA', 'AAPL', 'BX', 'ZETA']);
  });

  it("groups a symbol's calls by expiration, nearest first, best score first within each", () => {
    const later = { expirationDate: '2028-12-15T00:00:00.000Z' };
    const [section] = build(['NVDA'], [
      call('NVDA', 185, 66, 0.001, later), call('NVDA', 140, 40, 0.03), call('NVDA', 150, 55, 0.015), call('NVDA', 170, 60, 0.01, later),
    ], [refresh('NVDA')]);
    expect(section.expirations.map(e => e.expirationDate)).toEqual(['2028-01-21T00:00:00.000Z', '2028-12-15T00:00:00.000Z']);
    expect(section.expirations[0].calls.map(c => c.strike)).toEqual([150, 140]);
    expect(section.expirations[1].calls.map(c => c.strike)).toEqual([185, 170]);
  });

  it('carries the data day, fetch time and dropped count from the refresh that produced the quotes', () => {
    const [section] = build(['NVDA'], [call('NVDA', 140, 60, 0.01)], [refresh('NVDA')]);
    expect(section).toMatchObject({ day: TODAY, fetchedAt: '2026-11-13T20:05:00Z', dropped: 2, stale: false, note: null });
  });

  it('does not call quotes stale when every symbol is from the same earlier day', () => {
    const [section] = build(['NVDA'], [call('NVDA', 140, 60, 0.01, { day: '2026-11-12' })], [refresh('NVDA', { day: '2026-11-12' })]);
    expect(section.stale).toBe(false);
    expect(section.day).toBe('2026-11-12');
  });

  it('marks a symbol stale when it missed the latest refresh, and ranks it below every fresh symbol', () => {
    const sections = build(['NET', 'AAPL', 'KKR'],
      [call('NET', 185, 66, 0.001, { day: '2026-11-12' }), call('AAPL', 300, 40, 0.03)],
      [refresh('NET', { status: 'provider_error', error: 'Failed to fetch call data: status 429', scored: 0 }), refresh('AAPL')]);
    expect(sections.map(s => s.symbol)).toEqual(['AAPL', 'NET', 'KKR']);
    expect(sections[1]).toMatchObject({ stale: true, day: '2026-11-12', note: 'Failed to fetch call data: status 429' });
  });

  it('keeps showing older quotes, marked stale, when the latest refresh failed', () => {
    const [section] = build(['NVDA', 'AAPL'], [call('NVDA', 140, 60, 0.01, { day: '2026-11-12' }), call('AAPL', 300, 40, 0.03)],
      [refresh('NVDA', { status: 'failed', error: 'Failed to fetch call data: boom', scored: 0 }), refresh('AAPL')]).filter(s => s.symbol === 'NVDA');
    expect(section.best?.strike).toBe(140);
    expect(section.stale).toBe(true);
    expect(section.note).toBe('Failed to fetch call data: boom');
  });

  it('explains a symbol whose refresh ran but left nothing to score', () => {
    const [section] = build(['KKR'], [], [refresh('KKR', { scored: 0, dropped: 34 })]);
    expect(section.best).toBeNull();
    expect(section.expirations).toEqual([]);
    expect(section.note).toBe('No call passed the quote checks');
    expect(section.dropped).toBe(34);
  });

  it('reports every symbol as not refreshed yet when both tables are empty', () => {
    const sections = build(['NVDA', 'AAPL'], [], []);
    expect(sections.map(s => s.symbol)).toEqual(['AAPL', 'NVDA']);
    expect(sections.map(s => s.note)).toEqual(['Not refreshed yet', 'Not refreshed yet']);
    expect(sections.every(s => s.best === null && s.day === null)).toBe(true);
  });

  it('ignores quotes for symbols that are no longer preferred', () => {
    expect(build(['NVDA'], [call('OLD', 10, 90, -0.05)], [refresh('OLD')]).map(s => s.symbol)).toEqual(['NVDA']);
  });
});
