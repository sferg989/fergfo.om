# Long call value score: design

Date: 2026-11-12. Status: approved by Stephen 2026-11-12, with the score cap below.

## Intent

Stephen wants to evaluate long-dated calls (12 months and longer) on the 19 preferred symbols, with a score solid enough to put money behind. His concern is option value: is a given call worth what it costs. The app today only scores puts for selling, so this is a second scorer, a second data path and a new page.

## Goals

- Every market day, score every tradeable long call (expiring 365+ days out) on each symbol in `PreferredStocks`.
- A new `/calls` page that ranks the symbols by their best-value call and lets him open any symbol to see all its scored calls.
- Every score is shown with the dollars behind it: ask, fair value, fair range, and the cost per year.
- The score never presents more certainty than the evidence supports (see "What the evidence says").
- Keep the daily history so the score can be checked against what later happened.

## Non-goals

- Tracking his actual positions, cost basis, or hold/roll/sell advice. A follow-on project.
- Predicting whether a stock rises. The score rates the contract, not the stock.
- Symbols outside `PreferredStocks`, short calls, spreads, calls under 365 days.
- An implied-volatility percentile per symbol. The stored history makes it possible later.
- Fixing the existing `/scoring` page text, which already describes an old put scorer.

## Anti-goals

- A stale or bad quote appearing as the top bargain. On 2026-11-12 the three "cheapest" calls in a raw scan (NET Jan 2028 $185, CRWD Jun 2028 $127.50, DELL Jun 2028 $260) were all bad quotes, two of them with an ask below intrinsic value. A page that ranks those first is worse than no page.
- A "chance of profit" or expected return figure built from these stocks' past returns. The list is past winners; the number would flatter every contract.
- A weighted blend of unrelated factors whose total cannot be explained in dollars.
- Any change in behaviour or load for the working put pipeline and pages.

## What the evidence says (recon run 2026-11-12)

Two throwaway probes were run against Yahoo before writing this. Their results shape the design.

**1. How well does past volatility predict next-year volatility?** Ten years of daily closes, 19 symbols, 1,585 monthly test points, each forecasting the next 252 trading days.

| Forecast              | Median error | 80th pct error | Bias        |
| --------------------- | ------------ | -------------- | ----------- |
| Trailing 63 days      | 25.5%        | 45.6%          | -2.9 pts    |
| Trailing 252 days     | 23.7%        | 41.6%          | -1.5 pts    |
| Trailing 504 days     | 19.7%        | 36.2%          | -0.9 pts    |
| **Trailing 756 days** | **18.6%**    | 37.4%          | **0.0 pts** |
| 252/756 blend         | 20.7%        | 38.2%          | -0.5 pts    |

Three-year trailing volatility is the best and is unbiased, but it is typically off by about 19% (for a 50% vol stock, about 9 points). That is the honest precision of "fair value".

Method, so the committed script can reproduce it: closes from Yahoo's daily chart; for each symbol a test point every 21 trading days, starting at index 756 and stopping when fewer than 252 closes remain ahead; symbols with shorter history (PLTR, NET, CRWD, SE) contribute the points they have; error is `|forecast - realized| / realized`; the table shows the median and 80th percentile of that, and the median of `forecast - realized` as bias.

**2. What do today's chains look like?** 2,941 calls with delta 0.50 to 0.95 across the 19 symbols, 3 to 6 expirations each.

- Implied volatility is above the forecast for most symbols, so most calls read as costing more than fair. That is normal: it is the same premium the put pages earn by selling.
- Deep in-the-money calls carry 5 to 10 points more implied volatility than at-the-money ones on every symbol.
- The excess cost of holding ranged from about 1% to 7% a year of stock exposure (symbol medians). Spread alone costs 0.3% a year on NVDA, AAPL, META, MSFT and 1.2% to 1.6% on KKR, BX, SE, NFLX.
- Forecast error moves that cost by about ±5% a year for an at-the-money call and ±1.5% a year for a 0.90 delta call.

**What follows:**

- Comparing strikes and expirations within one symbol is reliable. It depends on the skew and the spread, both observed directly.
- Comparing symbols against each other is soft. Most cross-symbol differences sit inside the forecast error. The page must say so on every row (the verdict, below) and must not present the cross-symbol ranking as precise.
- Quote filtering is not optional polish. It decides whether the page is trustworthy.

## Approaches considered

1. **Own daily pipeline with history (chosen by Stephen).** The existing worker refreshes long calls once per market day into new tables; `/calls` reads stored rows; daily history is kept for later checks. Most work, but the only option that produces evidence.
2. **Live on page load, nothing stored.** About 100 Yahoo calls per view against a rate limit the app already fights, and no history, so the score could never be checked.
3. **Fold calls into the put pipeline.** One code path, but it refetches slow-moving prices every 15 minutes, grows a database that has hit its limits twice, and risks the working put page.

## The score

### One quantity

The score is a banding of a single number, the **excess cost of holding**, in percent of stock exposure per year:

```
excess cost = [ (ask - fair) + (ask - bid) / 2 ] / (delta x spot) / years to expiry
```

- `ask - fair`: what you pay above the call's fair value.
- `(ask - bid) / 2`: the half-spread you give up again when you sell.
- `delta x spot`: the stock exposure one contract share gives you.
- Read it like a fund's expense ratio: "holding this call costs 2.1% a year more than a fairly priced call on the same exposure." Zero is fair. Negative is a bargain.
- It assumes the call is held to expiry.

This folds together the five things agreed in conversation. Price against fair value and cost of carry are the same dollars seen from two sides (a call is financed stock plus a put; overpaying for the call is overpaying for that put). Trading cost is the spread term. Breakeven and leverage are shown beside the score but do not move it, because which is better depends on how much leverage he wants, not on value. **This is Claude's call, see the list at the end.**

### Fair value

Black-Scholes call price with:

- **Volatility:** realized volatility of the last 756 daily closes, fetched from Yahoo's chart on each refresh (so splits are always adjusted and no closes table is needed). Reuse `realizedVolatility()`. Symbols with fewer than 756 closes use what exists, minimum 252; fewer than that, the symbol is not scored.
- **Rate:** the existing `RISK_FREE_RATE` constant in `blackScholes.ts`. The builder checks it against the current 1-year Treasury yield at build time and updates the constant if it is off by more than 0.25 points. A 0.5 point error moves the excess cost by about 0.3% a year on deep in-the-money calls.
- **Dividend yield:** from the Yahoo quote (`dividendYield`, falling back to `trailingAnnualDividendYield`, else 0). BX yields 4.2%, so this cannot be skipped. The existing put functions keep their current behaviour (yield 0).
- **Fair range:** fair value recomputed at forecast volatility x 0.81 and x 1.19 (the 18.6% median error).
- **Delta:** Black-Scholes delta at the forecast volatility.

### Verdict

Shown next to every score:

- **Cheap**: ask is below the low end of the fair range.
- **Rich**: ask is above the high end.
- **In range**: the ask is inside the range, so the difference from fair is within forecast error.

### Mapping to 0-100

Linear and fixed: excess cost of -4% a year or better scores 100; +8% a year or worse scores 0. A fairly priced call (0%) scores 67. Bands and CSS classes are the existing ones (`OptionScorer.getScoreClass`): 80+ excellent (-1.6%/yr or better), 65+ good (up to 0.2%), 50+ moderate (up to 2%), 35+ weak (up to 3.8%). Changing either endpoint is a scorer version bump (`CALL_SCORER_VERSION`, stored on each row).

**Cap inside forecast error (decided by Stephen after the mockup).** A call scores above the fair-value score (cost 0%, 66.67 before rounding) only when its verdict is Cheap. Otherwise the score is the lower of the linear score and 66.67. Score and verdict can then never disagree. Wherever calls are ordered (best call per symbol, symbol ranking, rows within an expiration) the order is score first, then lower excess cost, so capped calls keep their order. The mockup showed why: on 2026-11-12 TSLA scored 100 and PLTR 96 while both read "In range", and no call on any symbol was Cheap (962 In range, 838 Rich).

Why these endpoints: run over the 2026-11-12 capture with the gates below, a 0 to 8% mapping put five of 19 symbols at exactly 100 and lost their order. With -4 to +8, that day's best calls spread from 100 (TSLA, cost -4.8%) through 66 (NVDA, 0.1%) and 47 (MSFT, 2.3%) down to 33 (CRWD, 4.1%). Most long calls are somewhat rich, and the score should say so.

### Which contracts are scored

- Expiration at least 365 days away on the refresh day.
- Delta between 0.60 and 0.90. Below 0.60 the call is a bet on a large move, not a way to hold the stock; above 0.90 it is nearly stock with little leverage. **Claude's call.**

### Quote gates (a contract failing any is dropped, not scored)

1. Bid and ask both above zero, ask at or above bid.
2. Ask at or above intrinsic value (`spot - strike`).
3. Consistent with neighbouring strikes in the same expiration: a lower strike's call is worth at least as much, and at most the strike gap more. Generalise the existing `isBidConsistentWithChain` to take the option side; do not write a second copy.
4. Implied volatility solved from the mid price (bisection; do not use Yahoo's `impliedVolatility`, which was 0 or 118% on bad rows) must be within 20% of the median implied volatility of its neighbours. Neighbours are the up-to-four nearest strikes in the same expiration, at any delta from 0.50 to 0.95, that pass gates 1, 2, 3 and 5 and have a solvable implied volatility. A contract with fewer than two neighbours, or with no solvable implied volatility, is dropped. A real bargain shows across an expiration, not on one strike.
5. Spread no wider than 15% of the ask.

The count of dropped contracts per symbol is logged by the worker.

### Known limits (to appear on the page's explanation panel)

- Fair value is only as good as the volatility forecast; hence the range and verdict.
- Black-Scholes assumes no jumps. Real crash risk makes the protection inside a deep in-the-money call worth somewhat more than the model says, so those calls read slightly richer than they are.
- Early exercise is ignored. It matters little for these names; BX is the most affected.
- Yahoo quotes are delayed and occasionally wrong; the gates catch the kinds seen so far.

## Data and refresh

- **When (changed during the build, 2026-11-13):** once per market day per preferred symbol, after the close, between 16:30 and 17:25 ET. One symbol per one-minute worker tick; no put refresh is displaced. Reason: Yahoo reports its option quotes as delayed 15 to 20 minutes while its stock price is live, so an in-session refresh prices calls against a stock price from a different moment. On 2026-11-13 at 09:40 ET most long-dated bids were still zero. After the close both are closing values (the 2026-11-12 capture at 22:33 ET kept 1,800 of 1,873 in-band quotes). Not yet observed: a refresh at 16:30 ET itself.
- **Attempts per symbol per day.** A provider error (`PROVIDER_ERROR`: rate limit or crumb failure) does not use up the day: the symbol is retried on a later tick, up to three attempts in total, and never after 17:25 ET. Any other failure, or a successful run, ends that symbol's attempts for the day. Failures are logged and recorded; the page shows each symbol's data date, so a stale symbol is visible. Builder decides where the day's attempt count is recorded.
- **Per symbol:** one Yahoo options call (spot, expirations, dividend yield), one chart call (three years of closes), one options call per qualifying expiration (3 to 6). About 150 Yahoo calls a day in total. Reuse the existing Yahoo session restore/persist.
- **Storage:** one new table, one row per contract per day, written through `database_service.ts`. Columns: symbol, day, contract name, strike, expiration date, spot, bid, ask, volume, open interest, dividend yield, forecast volatility, implied volatility (from mid), fair value, fair low, fair high, delta, excess cost, score, verdict, scorer version. Primary key (contract name, day); index on (symbol, day). Migration `016_*.sql`.
- **Volume:** roughly 1,700 rows a day, about 430k a year. No pruning in this build: the first rows must survive until their contracts expire (400 to 800 days) to check outcomes. Revisit at one year.
- **Page read:** the latest day's rows per symbol, about 1,700 rows per view, one indexed query. No aggregation over history on page load.
- Local dev: the builder provides a way to run the call refresh once on demand for one symbol (script or existing worker dev flow) so the page can be developed with real data.

## The page: `/calls`

Server-rendered Astro, Tailwind, no client framework. Add a "Long Calls" link to the nav in `Layout.astro`.

```
Long Calls                                             Prices as of Nov 12, 3:41 PM ET
Best-value call per symbol, 12+ months out. Score rates the contract's price, not the stock.

      Stock           Best call          Score  Verdict    Ask     Fair (range)        Cost/yr  Breakeven/yr  Delta  Leverage  Spread
 >  NVDA $166.19   Jun 16 '28 $140     84    In range   $55.10  $53.90 (49.2-58.8)   1.3%     +9.8%        0.74   2.2x      1.6%
 >  AAPL $355.02   Dec 17 '27 $300     79    In range   ...
 >  KKR   $97.20   Jan 19 '29 $80      46    Rich       ...
 >  SE    $75.10   no call passed the quote checks                                              data from Nov 11

 [opened row]
 NVDA   forecast vol 47% (3-yr)   dividend 0.6%   158 quotes, 11 dropped
   Jun 16 '28 (581 days)
     Strike  Score  Verdict   Bid     Ask     Fair (range)   Cost/yr  Breakeven/yr  Delta  Leverage  IV    OI
     $120     78   In range  ...
     $140     84   ...
   Jan 21 '28 (434 days)
     ...

 How to read this  (collapsed panel: the formula in words, the verdicts, the known limits)
```

- One row per symbol showing its highest-scoring contract; rows sorted by score, then by lower excess cost. Under the heading, one sentence stating that differences between symbols are often within forecast error and the verdict column says when.
- Each row opens (native `<details>`, no script) to every scored contract for that symbol, grouped by expiration, best score first within each.
- Breakeven per year: `((strike + ask) / spot) ^ (1 / years) - 1`. Leverage: `delta x spot / ask`. Spread: `(ask - bid) / ask`.
- Cheap verdicts get a distinct chip and the note "passed quote checks; confirm the live quote before trading."
- Symbols with no scored contract, or with data older than today, are shown at the bottom with the reason.
- Works at phone width (the opened table scrolls horizontally inside its own container).

Visual styling follows the existing pages; the builder applies the frontend-design guidance within that. Stephen can ask for a mockup before the build if he wants to judge the look first.

## Proof

1. **Volatility forecast test, committed and repeatable.** `scripts/backtest-call-vol.ts` plus an npm script, mirroring `backtest-scorer`. It fetches Yahoo live, so numbers drift slightly between runs. The 756-day window and the 0.19 error in this document stand as the constants. If a re-run picks a different best window, or a median error outside 17% to 21%, the builder stops and reports it instead of changing constants.
2. **Pricing tests.** Unit tests (vitest, existing pattern): call price and delta against published Black-Scholes values including a dividend case; put-call parity against the existing put functions; implied-volatility solver round trip; the scorer on fixed inputs; every quote gate, using the real bad quotes in the appendix as fixtures.
3. **Forward check, usable from about day 30.** `scripts/backtest-call-score.ts` reads an export of the history table and, for each contract seen on two days 30/60/90 days apart, compares its excess cost on the first day with what holding it actually cost beyond the model: `(later bid - first ask) - (later fair - first fair)`, per dollar of exposure. Reports rank correlation (reuse `rankStats`) pooled and per symbol. Expectation stated in the script header: with 19 correlated stocks this is a direction check, not proof.
4. **Expiry outcomes** become possible from December 2027. Not built now; the retained history is what makes them possible.

## Constraints

- Project rules in `CLAUDE.md`: reuse before writing (Black-Scholes helpers, `realizedVolatility`, the chain-consistency check, `rankStats`, `getScoreClass`, the Yahoo session handling), no new third-party libraries, all D1 access through `database_service.ts`, atomic commits.
- D1: no aggregation over history on page views; migration must not backfill or scan big tables.
- The put pipeline's behaviour and scores must be unchanged. Existing tests stay green; `npm run all` passes.
- Production steps after merge (migration, worker deploy) are run by Stephen or with his explicit go-ahead.

## Left to the builder

- Table and column names, file and component layout, type names.
- Where "attempted today" is recorded and the exact tick-selection logic in the worker.
- How Black-Scholes helpers are extended for calls and dividend yield without duplicating the put code.
- Bisection bounds and tolerance for the implied-volatility solver.
- Visual detail of the page within the sketch above.

## Calls Claude made that Stephen did not explicitly decide

1. Only price and trading cost move the score. Breakeven and leverage are displayed, not scored.
2. Scored calls are limited to delta 0.60 to 0.90.
3. The -4% to +8% a year mapping onto 0-100, which makes a fairly priced call score 67. (The cap at 67 unless Cheap is Stephen's decision.)
4. Refresh runs after the close (16:30 to 17:25 ET). The first version of this design said the last hour of the session; live data during the build showed option quotes lag the stock price by 15 to 20 minutes.
5. No pruning of call history.
6. The risk-free rate stays a hard-coded constant.
7. Cross-symbol ranking is shown but explicitly labelled as soft.

## Appendix: real bad quotes from 2026-11-12 (test fixtures)

Each block is five consecutive strikes of one expiration, captured after the close. The gates above were run over the whole capture (2,941 quotes): 73 of 1,873 in-band contracts were dropped and all the rows marked below were caught.

| Symbol, expiration, spot  | Strike    | Bid    | Ask    | IV from mid | Must fail                                                                             |
| ------------------------- | --------- | ------ | ------ | ----------- | ------------------------------------------------------------------------------------- |
| NET Jan 21 2028, $318.50  | 175       | 169.85 | 174.00 | 0.725       | passes                                                                                |
|                           | 180       | 166.50 | 171.00 | 0.725       | passes                                                                                |
|                           | **185**   | 120.00 | 123.50 | none        | gates 2, 3, 4 (ask below intrinsic $133.50)                                           |
|                           | 190       | 166.50 | 171.00 | 0.805       | gate 3 (the bad 185 below it; the 195 above is $10.30 cheaper across a $5 strike gap) |
|                           | 195       | 156.20 | 160.85 | 0.709       | passes                                                                                |
| CRWD Jun 16 2028, $229.87 | 120       | 128.00 | 137.00 | 0.687       | passes                                                                                |
|                           | 125       | 125.00 | 134.00 | 0.688       | passes                                                                                |
|                           | **127.5** | 90.10  | 96.00  | none        | gates 2, 3, 4 (ask below intrinsic $102.37)                                           |
|                           | 130       | 121.00 | 130.00 | 0.669       | gate 3                                                                                |
|                           | 132.5     | 145.00 | 151.75 | 1.063       | gates 3, 4                                                                            |
| DELL Jun 16 2028, $371.17 | 230       | 194.00 | 198.50 | 0.748       | passes                                                                                |
|                           | 240       | 188.50 | 193.50 | 0.745       | passes                                                                                |
|                           | **260**   | 144.15 | 148.00 | 0.449       | gates 3, 4 (ask is above intrinsic, so gate 2 alone misses it)                        |
|                           | 280       | 169.00 | 173.50 | 0.734       | passes                                                                                |
|                           | 290       | 165.00 | 169.00 | 0.734       | passes                                                                                |

Gate 3 here compares each strike with its nearest strike on each side, bad or not, and fails only when it is inconsistent with every neighbour it has, as `isBidConsistentWithChain` does today. That is why the good NET $190 and CRWD $130 rows are dropped alongside the bad row next to them: an accepted cost of a simple check.
