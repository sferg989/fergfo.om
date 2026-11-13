import { compareByScore } from './callScorer';
import type { CallQuoteRow, CallRefreshLogRow } from '../types/call';

/** One symbol on /calls: its best long call and every scored call behind it */
export interface CallSymbolSection {
  symbol: string;
  /** Eastern day the shown quotes are from; null when the symbol has none */
  day: string | null;
  fetchedAt: string | null;
  /** The shown quotes are older than the latest refresh any symbol has: this symbol missed it */
  stale: boolean;
  /** In-band contracts the quote checks rejected in the most recent refresh */
  dropped: number;
  best: CallQuoteRow | null;
  expirations: { expirationDate: string; calls: CallQuoteRow[] }[];
  /** Why there is nothing, or nothing fresh, to show */
  note: string | null;
}

const noteFor = (latest: CallRefreshLogRow | undefined): string | null => {
  if (!latest) return 'Not refreshed yet';
  if (latest.status !== 'ok') return latest.error ?? 'Refresh failed';
  return latest.scored === 0 ? 'No call passed the quote checks' : null;
};

/**
 * Shapes stored call quotes for the page. Symbols with fresh quotes come first, best call
 * first; then symbols still showing an older day's quotes, so a stale price can never top the
 * ranking; then symbols with nothing, alphabetically. The last two carry the reason.
 * @param quotes Each symbol's rows from its latest successful refresh
 * @param refreshes Each symbol's most recent refresh outcome
 */
export const buildCallSections = (
  symbols: string[],
  quotes: CallQuoteRow[],
  refreshes: CallRefreshLogRow[]
): CallSymbolSection[] => {
  const shown = quotes.filter(q => symbols.includes(q.symbol));
  const latestDay = shown.reduce((latest, q) => (q.day > latest ? q.day : latest), '');

  const sections = symbols.map((symbol): CallSymbolSection => {
    const calls = shown.filter(q => q.symbol === symbol).sort(compareByScore);
    const latest = refreshes.find(r => r.symbol === symbol);
    const day = calls[0]?.day ?? null;

    const byExpiration = new Map<string, CallQuoteRow[]>();
    for (const call of calls) {
      byExpiration.set(call.expirationDate, [...(byExpiration.get(call.expirationDate) ?? []), call]);
    }
    const expirations = [...byExpiration.entries()]
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([expirationDate, expirationCalls]) => ({ expirationDate, calls: expirationCalls }));

    return {
      symbol,
      day,
      fetchedAt: latest && latest.day === day ? latest.fetchedAt : null,
      stale: day !== null && day !== latestDay,
      dropped: latest?.dropped ?? 0,
      best: calls[0] ?? null,
      expirations,
      note: noteFor(latest),
    };
  });

  return sections.sort((a, b) => {
    if (a.best && b.best) return Number(a.stale) - Number(b.stale) || compareByScore(a.best, b.best);
    if (a.best || b.best) return a.best ? -1 : 1;
    return a.symbol.localeCompare(b.symbol);
  });
};
