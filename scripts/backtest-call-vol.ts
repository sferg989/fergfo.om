/**
 * How well does a stock's past volatility predict its next year's volatility?
 * The long-call score prices fair value at a volatility forecast, so this is the assumption
 * everything else rests on. FORECAST_VOL_CLOSES and FORECAST_ERROR are taken from this output.
 *
 * Run: npm run backtest:call-vol
 *
 * Method: about 12 years of daily closes per preferred symbol from Yahoo. For each symbol, a
 * test point every 21 trading days, starting once 756 closes exist and stopping when fewer
 * than 252 remain ahead. Each candidate forecast is compared with the volatility realized over
 * the next 252 trading days. Error is |forecast - realized| / realized. Symbols with a short
 * history contribute the points they have. Yahoo is fetched live, so numbers drift between runs.
 *
 * Result on 2026-11-12 (1,585 test points): 756-day trailing volatility had the lowest median
 * error (18.6%) and no bias; 252-day was 23.7%.
 */
import YahooFinance from 'yahoo-finance2';
import { PreferredStocks } from '../src/enums/preferredStocks';
import { realizedVolatility } from '../src/utils/realizedVolatility';

const HISTORY_DAYS = 12 * 365;
const HORIZON = 252;
const STEP = 21;
const LONGEST_WINDOW = 756;
const DAY_MS = 24 * 60 * 60 * 1000;

const trailing = (window: number) => (closes: number[], t: number): number =>
  realizedVolatility(closes.slice(t - window, t + 1)) ?? NaN;
const forecasts: [string, (closes: number[], t: number) => number][] = [
  ['63 days', trailing(63)],
  ['252 days', trailing(252)],
  ['504 days', trailing(504)],
  ['756 days', trailing(756)],
  ['252/756 blend', (closes, t) => Math.sqrt((trailing(252)(closes, t) ** 2 + trailing(756)(closes, t) ** 2) / 2)],
];

const quantile = (values: number[], p: number): number => [...values].sort((a, b) => a - b)[Math.floor(values.length * p)];
const pct = (fraction: number): string => `${(fraction * 100).toFixed(1)}%`;

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
const errors = new Map<string, { relative: number[]; signed: number[] }>(forecasts.map(([name]) => [name, { relative: [], signed: [] }]));
const perSymbol: string[] = [];

for (const symbol of Object.values(PreferredStocks)) {
  const chart = await yahooFinance.chart(symbol, { period1: new Date(Date.now() - HISTORY_DAYS * DAY_MS), interval: '1d' });
  const closes = chart.quotes.map(q => q.close).filter((c): c is number => typeof c === 'number' && c > 0);
  const symbolErrors: number[] = [];

  for (let t = LONGEST_WINDOW; t + HORIZON < closes.length; t += STEP) {
    const realized = realizedVolatility(closes.slice(t, t + HORIZON + 1))!;
    for (const [name, forecast] of forecasts) {
      const value = forecast(closes, t);
      errors.get(name)!.relative.push(Math.abs(value - realized) / realized);
      errors.get(name)!.signed.push(value - realized);
      if (name === '756 days') symbolErrors.push(Math.abs(value - realized) / realized);
    }
  }
  perSymbol.push(`${symbol.padEnd(6)} closes=${String(closes.length).padStart(4)}  test points=${String(symbolErrors.length).padStart(3)}  ` +
    `median error=${symbolErrors.length ? pct(quantile(symbolErrors, 0.5)) : 'n/a'}`);
}

console.log('== forecast of next-252-day volatility, all symbols ==');
for (const [name] of forecasts) {
  const { relative, signed } = errors.get(name)!;
  console.log(`${name.padEnd(14)} n=${relative.length}  median error=${pct(quantile(relative, 0.5))}  ` +
    `80th pct=${pct(quantile(relative, 0.8))}  bias=${(quantile(signed, 0.5) * 100).toFixed(1)} vol pts`);
}
console.log('\n== 756-day forecast by symbol ==');
perSymbol.forEach(line => console.log(line));
