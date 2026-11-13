import { describe, expect, it } from 'vitest';
import { MAX_CALL_ATTEMPTS, nextCallSymbol } from '../callRefreshPlan';
import { easternDay, isCallRefreshWindow } from '../marketHoursUtils';
import type { CallRefreshLogRow, CallRefreshStatus } from '../../types/call';

const log = (symbol: string, status: CallRefreshStatus, attempts = 1): CallRefreshLogRow =>
  ({ symbol, day: '2026-11-12', attempts, status, error: null, scored: 0, dropped: 0, fetchedAt: '2026-11-12T20:01:00Z' });

describe('nextCallSymbol', () => {
  const symbols = ['TSLA', 'NET', 'LRCX'];

  it('picks the first symbol with no log row today', () => {
    expect(nextCallSymbol(symbols, [])).toBe('TSLA');
    expect(nextCallSymbol(symbols, [log('TSLA', 'ok')])).toBe('NET');
  });

  it('skips symbols that finished today, whether they succeeded or failed', () => {
    expect(nextCallSymbol(symbols, [log('TSLA', 'ok'), log('NET', 'failed')])).toBe('LRCX');
  });

  it('retries a symbol Yahoo rejected only after the untried symbols', () => {
    expect(nextCallSymbol(symbols, [log('TSLA', 'provider_error')])).toBe('NET');
    expect(nextCallSymbol(symbols, [log('TSLA', 'provider_error'), log('NET', 'ok'), log('LRCX', 'ok')])).toBe('TSLA');
  });

  it('gives up on a rejected symbol after three attempts', () => {
    expect(MAX_CALL_ATTEMPTS).toBe(3);
    const done = [log('TSLA', 'provider_error', 3), log('NET', 'ok'), log('LRCX', 'ok')];
    expect(nextCallSymbol(symbols, done)).toBeUndefined();
    expect(nextCallSymbol(symbols, [log('TSLA', 'provider_error', 2), log('NET', 'ok'), log('LRCX', 'ok')])).toBe('TSLA');
  });

  it('returns undefined when every symbol is done', () => {
    expect(nextCallSymbol(symbols, symbols.map(s => log(s, 'ok')))).toBeUndefined();
  });
});

// 2026-11-12 is a Thursday in EST (UTC-5); 2026-07-15 is a Wednesday in EDT (UTC-4)
describe('isCallRefreshWindow', () => {
  it('is true from 16:30 through 17:25 ET on a trading day', () => {
    expect(isCallRefreshWindow(new Date('2026-11-12T21:30:00Z'))).toBe(true);
    expect(isCallRefreshWindow(new Date('2026-11-12T22:25:00Z'))).toBe(true);
    expect(isCallRefreshWindow(new Date('2026-07-15T21:00:00Z'))).toBe(true);
  });

  it('is false just outside the window and during the session', () => {
    expect(isCallRefreshWindow(new Date('2026-11-12T21:29:00Z'))).toBe(false);
    expect(isCallRefreshWindow(new Date('2026-11-12T22:26:00Z'))).toBe(false);
    expect(isCallRefreshWindow(new Date('2026-11-12T20:30:00Z'))).toBe(false);
  });

  it('is false on a weekend and on a market holiday', () => {
    expect(isCallRefreshWindow(new Date('2026-11-14T21:45:00Z'))).toBe(false);
    expect(isCallRefreshWindow(new Date('2026-11-26T21:45:00Z'))).toBe(false); // Thanksgiving
  });

  it('still runs after a 1:00 PM early close, when the closing quotes are just as final', () => {
    expect(isCallRefreshWindow(new Date('2026-11-27T21:45:00Z'))).toBe(true);
  });
});

describe('easternDay', () => {
  it('gives the Eastern calendar day, not the UTC one', () => {
    expect(easternDay(new Date('2026-11-13T03:30:00Z'))).toBe('2026-11-12');
    expect(easternDay(new Date('2026-11-12T20:30:00Z'))).toBe('2026-11-12');
  });
});
