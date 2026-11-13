import type { CallRefreshLogRow } from '../types/call';

/** Tries a symbol gets in one day when Yahoo rejects the request before looking at it */
export const MAX_CALL_ATTEMPTS = 3;

/**
 * The symbol whose long calls should be refreshed next today, or undefined when all are done.
 * Symbols not yet tried go first. A symbol Yahoo rejected (rate limit, crumb failure) comes
 * round again after them, up to MAX_CALL_ATTEMPTS; any other outcome ends its day.
 */
export const nextCallSymbol = (symbols: string[], todaysLog: CallRefreshLogRow[]): string | undefined => {
  const bySymbol = new Map(todaysLog.map(row => [row.symbol, row]));
  return symbols.find(symbol => !bySymbol.has(symbol)) ??
    symbols.find(symbol => {
      const row = bySymbol.get(symbol)!;
      return row.status === 'provider_error' && row.attempts < MAX_CALL_ATTEMPTS;
    });
};
