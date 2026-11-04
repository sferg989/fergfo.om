/**
 * Backtest the current OptionScorer against settled put outcomes.
 *
 * Run: npm run backtest:scorer [-- path/to/dataset.json]   (default scripts/data/put-outcomes.json)
 *
 * Dataset format: JSON array of option_outcomes rows carrying the scoring inputs:
 *   contract_name, symbol, strike, expiration_date, first_seen_at (ISO, the snapshot time),
 *   bid (the table column is first_seen_bid; the export query aliases it), ask, implied_volatility, spot_price, dte_at_score, volume, open_interest,
 *   realized_vol (annualized, null when unavailable), scorer_version (nullable, informational),
 *   first_seen_score (nullable, stored score at the time), expired_otm (0/1),
 *   realized_return (per-share $ kept from the premium after settlement).
 *
 * Refresh the dataset from prod (NOT run automatically; needs the option_outcomes input columns):
 *   npx wrangler d1 execute options-tracker --env production --remote --json \
 *     --command "SELECT *, first_seen_bid AS bid FROM option_outcomes" > scripts/data/raw-export.json
 *   then unwrap with: node -e "const r=JSON.parse(require('fs').readFileSync('scripts/data/raw-export.json'))[0].results;require('fs').writeFileSync('scripts/data/put-outcomes.json',JSON.stringify(r))"
 */
import { readFileSync } from 'node:fs';
import { OptionScorer } from '../src/utils/optionScorer';
import { putDelta } from '../src/utils/blackScholes';
import { DEFAULT_MARGIN_RATE, ReturnCalculator } from '../src/utils/returnCalculator';
import { mean, spearman } from '../src/utils/rankStats';

interface OutcomeRow {
  symbol: string;
  strike: number;
  expiration_date: string;
  first_seen_at: string;
  bid: number;
  ask: number;
  implied_volatility: number;
  spot_price: number;
  dte_at_score: number;
  volume: number;
  open_interest: number;
  realized_vol: number | null;
  expired_otm: number;
  realized_return: number;
}

interface Scored extends OutcomeRow {
  score: number;
  expectedReturnScore: number;
  retPct: number;
  absDelta: number;
  annYield: number;
  group: string;
}

const MIN_GROUP_SIZE = 5;
const datasetPath = process.argv[2] ?? 'scripts/data/put-outcomes.json';
const rows: OutcomeRow[] = JSON.parse(readFileSync(datasetPath, 'utf8'));

const realNow = Date.now;
const scored: Scored[] = rows.map(r => {
  Date.now = () => new Date(r.first_seen_at).getTime();
  const s = OptionScorer.calculateScore({
    bid: r.bid, ask: r.ask, strike: r.strike, expirationDate: r.expiration_date,
    impliedVolatility: r.implied_volatility, volume: r.volume, openInterest: r.open_interest,
  }, r.spot_price, r.realized_vol ?? undefined);
  Date.now = realNow;
  // realized_return is per-share dollars; express as % of collateral
  const retPct = ReturnCalculator.calculateSimpleReturn({ premium: 1, strike: r.strike, marginRate: DEFAULT_MARGIN_RATE }) * r.realized_return;
  const absDelta = Math.abs(putDelta(r.spot_price, r.strike, r.dte_at_score, r.implied_volatility) ?? NaN);
  const annYield = ReturnCalculator.calculateAnnualizedReturn({ premium: r.bid, strike: r.strike, daysToExpiry: r.dte_at_score, marginRate: DEFAULT_MARGIN_RATE });
  return { ...r, score: s.total, expectedReturnScore: s.expectedReturnScore, retPct, absDelta, annYield, group: `${r.symbol}|${r.expiration_date}` };
}).filter(r => r.dte_at_score > 0 && r.bid > 0 && r.absDelta >= 0.05 && r.absDelta <= 0.5);

const groupsOf = (xs: Scored[]): Scored[][] => {
  const m = new Map<string, Scored[]>();
  for (const r of xs) m.set(r.group, [...(m.get(r.group) ?? []), r]);
  return [...m.values()].filter(g => g.length >= MIN_GROUP_SIZE);
};

const strategies: [string, (r: Scored) => number][] = [
  ['score', r => r.score],
  ['annualized yield', r => r.annYield],
  ['nearest 20 delta', r => -Math.abs(r.absDelta - 0.2)],
  ['lowest |delta|', r => -r.absDelta],
];

const withinSpearman = (groups: Scored[][], f: (r: Scored) => number) => {
  const rhos = groups.map(g => spearman(g.map(f), g.map(r => r.retPct))).filter(x => !Number.isNaN(x));
  return `mean rho=${mean(rhos).toFixed(3)}  groups=${rhos.length}  positive=${(rhos.filter(x => x > 0).length / rhos.length * 100).toFixed(0)}%`;
};

const topPickRet = (groups: Scored[][], f: (r: Scored) => number) =>
  mean(groups.map(g => g.reduce((best, r) => f(r) > f(best) ? r : best).retPct));

const withDteBucket = (name: string, xs: Scored[]) => {
  const groups = groupsOf(xs);
  if (!groups.length) {
    console.log(`${name.padEnd(14)} n=${String(xs.length).padStart(4)}  (no groups of ${MIN_GROUP_SIZE}+)`);
    return;
  }
  const picks = strategies.map(([n, f]) => `${n}=${topPickRet(groups, f).toFixed(2)}%`).join('  ');
  console.log(`${name.padEnd(14)} n=${String(xs.length).padStart(4)} groups=${groups.length}  rho score=${withinSpearman(groups, r => r.score).replace(/ +groups.*/, '')}  top-pick ret: ${picks}`);
};

const dteIn = (lo: number, hi: number) => scored.filter(r => r.dte_at_score >= lo && r.dte_at_score < hi);

console.log(`dataset: ${datasetPath}`);
console.log(`rows scored (dte>0, bid>0, |delta| 0.05-0.5): ${scored.length} of ${rows.length}; with realized vol: ${scored.filter(r => r.realized_vol !== null).length}`);
console.log(`overall: OTM ${(mean(scored.map(r => r.expired_otm)) * 100).toFixed(1)}%  mean return on collateral ${mean(scored.map(r => r.retPct)).toFixed(2)}%`);

const all = groupsOf(scored);
console.log(`\n== within symbol+expiry Spearman vs realized return on collateral (groups >=${MIN_GROUP_SIZE}) ==`);
for (const [name, f] of strategies) console.log(`${name.padEnd(18)} ${withinSpearman(all, f)}`);

console.log('\n== top pick per group: mean realized return on collateral ==');
for (const [name, f] of strategies) console.log(`${name.padEnd(18)} n=${all.length}  meanRet=${topPickRet(all, f).toFixed(2)}%`);
console.log(`${'average contract'.padEnd(18)} meanRet=${mean(all.flat().map(r => r.retPct)).toFixed(2)}%`);

console.log('\n== expected-return factor calibration ==');
for (const [lo, hi] of [[0, 10], [10, 20], [20, 30], [30, 45], [45, 61]]) {
  const g = scored.filter(r => r.expectedReturnScore >= lo && r.expectedReturnScore < hi);
  if (g.length) console.log(`ER score ${String(lo).padStart(2)}-${String(hi).padStart(2)}: n=${String(g.length).padStart(4)}  OTM=${(mean(g.map(r => r.expired_otm)) * 100).toFixed(0)}%  meanRet=${mean(g.map(r => r.retPct)).toFixed(2)}%`);
}

console.log('\n== split by realized vol ==');
withDteBucket('rv present', scored.filter(r => r.realized_vol !== null));
withDteBucket('rv absent', scored.filter(r => r.realized_vol === null));

console.log('\n== split by DTE ==');
withDteBucket('dte < 10', dteIn(0, 10));
withDteBucket('dte 10-19', dteIn(10, 20));
withDteBucket('dte 20+', dteIn(20, Infinity));
