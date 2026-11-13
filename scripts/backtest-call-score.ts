/**
 * Did calls the score called expensive go on to cost more to hold?
 *
 * Run: npm run backtest:call-score [-- path/to/call-quotes.json]   (default scripts/data/call-quotes.json)
 *
 * For every contract seen on two days about 30, 60 or 90 days apart, compare its excess cost on
 * the first day with what holding it then cost beyond the model, per dollar of stock exposure:
 *   ((later bid - first ask) - (later fair value - first fair value)) / (first delta x first spot)
 * Buying at the ask and marking at the bid, less what the fair-value model says the stock's own
 * move and the passing time were worth. A useful score shows a negative rank correlation:
 * higher excess cost, worse result.
 *
 * Read this as a direction check, not proof. The symbols are 19 correlated stocks, a long
 * call's richness need not correct within 90 days, and a change in implied volatility swamps
 * the effect in any single pair. Expiry outcomes (from December 2027) are the real test.
 *
 * Refresh the dataset from prod (NOT run automatically):
 *   npx wrangler d1 execute options-tracker --env production --remote --json \
 *     --command "SELECT contract_name, symbol, day, spot, bid, ask, delta, fair_value, excess_cost FROM call_quotes" > scripts/data/raw-call-export.json
 *   then unwrap with: node -e "const r=JSON.parse(require('fs').readFileSync('scripts/data/raw-call-export.json'))[0].results;require('fs').writeFileSync('scripts/data/call-quotes.json',JSON.stringify(r))"
 */
import { existsSync, readFileSync } from 'node:fs';
import { mean, spearman } from '../src/utils/rankStats';

interface QuoteRow {
  contract_name: string;
  symbol: string;
  day: string;
  spot: number;
  bid: number;
  ask: number;
  delta: number;
  fair_value: number;
  excess_cost: number;
}

interface Pair {
  symbol: string;
  excessCost: number;
  result: number;
}

const HORIZONS = [30, 60, 90];
const TOLERANCE_DAYS = 3;
const MIN_PAIRS = 20;
const DAY_MS = 24 * 60 * 60 * 1000;

const datasetPath = process.argv[2] ?? 'scripts/data/call-quotes.json';
if (!existsSync(datasetPath)) {
  console.log(`No dataset at ${datasetPath}. See the header of this script for the export command.`);
  process.exit(0);
}
const rows: QuoteRow[] = JSON.parse(readFileSync(datasetPath, 'utf8'));

const byContract = new Map<string, QuoteRow[]>();
for (const row of rows) byContract.set(row.contract_name, [...(byContract.get(row.contract_name) ?? []), row]);
const daysBetween = (a: QuoteRow, b: QuoteRow): number => (new Date(b.day).getTime() - new Date(a.day).getTime()) / DAY_MS;

const pairsAt = (horizon: number): Pair[] => {
  const pairs: Pair[] = [];
  for (const history of byContract.values()) {
    const sorted = [...history].sort((a, b) => a.day.localeCompare(b.day));
    for (const first of sorted) {
      const later = sorted.find(row => Math.abs(daysBetween(first, row) - horizon) <= TOLERANCE_DAYS);
      if (!later) continue;
      const result = ((later.bid - first.ask) - (later.fair_value - first.fair_value)) / (first.delta * first.spot);
      pairs.push({ symbol: first.symbol, excessCost: first.excess_cost, result });
    }
  }
  return pairs;
};

const rho = (pairs: Pair[]): string =>
  pairs.length < MIN_PAIRS ? 'too few pairs' : spearman(pairs.map(p => p.excessCost), pairs.map(p => p.result)).toFixed(3);

console.log(`dataset: ${datasetPath}  rows=${rows.length}  contracts=${byContract.size}`);
let anyPairs = false;
for (const horizon of HORIZONS) {
  const pairs = pairsAt(horizon);
  if (pairs.length === 0) continue;
  anyPairs = true;
  console.log(`\n== ${horizon} days: ${pairs.length} pairs ==`);
  console.log(`pooled        rho=${rho(pairs)}  mean result=${(mean(pairs.map(p => p.result)) * 100).toFixed(2)}% of exposure`);
  for (const symbol of [...new Set(pairs.map(p => p.symbol))].sort()) {
    const own = pairs.filter(p => p.symbol === symbol);
    console.log(`${symbol.padEnd(13)} rho=${rho(own)}  pairs=${own.length}`);
  }
}
if (!anyPairs) console.log(`Not enough history: no contract appears on two days ${HORIZONS.join(', ')} days apart yet.`);
