# Long Call Value Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Score every tradeable 12-month-plus call on the 19 preferred symbols once per market day and show the results on a new `/calls` page.

**Architecture:** Pure utilities (pricing, quote gates, scorer) feed a new fetch method on `OptionsService`. The existing cron worker runs one symbol's call refresh per tick between 15:00 and 15:55 ET in place of that tick's put refresh, writing to two new D1 tables. `/calls` is a server-rendered Astro page that reads the latest stored day per symbol.

**Tech Stack:** Astro 5 SSR, Tailwind, Cloudflare D1, Cloudflare Worker cron, yahoo-finance2, vitest.

**Spec:** `docs/superpowers/specs/2026-11-12-long-call-value-score-design.md`. Read it first; this plan does not repeat its reasoning.

## Global Constraints

- No new third-party libraries.
- Reuse, do not copy: `bsTerms`/`normalCdf` in `blackScholes.ts`, `realizedVolatility()`, `isBidConsistentWithChain`, `rankStats`, `OptionScorer.getScoreClass`, the Yahoo session restore/persist in `optionsService.ts`, `runInBatches` in `database_service.ts`.
- All D1 access goes through `src/services/database_service.ts`.
- Put pipeline behaviour and scores unchanged: every existing test stays green, existing put function signatures keep working with no new required arguments.
- No page-view query aggregates over history; the migration creates tables only (no backfill, no scan).
- Constants from the spec, verbatim: forecast window 756 closes (minimum 252); forecast error 0.19; delta band 0.60 to 0.90 scored, 0.50 to 0.95 fetched as neighbours; minimum 365 days to expiry; gate 4 tolerance 20% against up to 4 neighbours, minimum 2; gate 5 spread limit 15% of ask; score 100 at -4%/yr, 0 at +8%/yr; cap at 66.67 unless verdict is Cheap; refresh window 15:00 to 15:55 ET; at most 3 attempts per symbol per day, provider errors only.
- `npm run all` passes at the end of every task.
- **Commits:** each task ends at a commit point with the message given, but no commit is made until Stephen says so. Work happens on branch `feat/long-call-score`. Never add Claude as commit author or co-author.
- Production steps (migration on prod, worker deploy) are not part of this plan's execution; they are listed in Task 9 for Stephen.

## Review Focus

Conditions the spec implies that the happy-path tests would miss. Each has a test in the task named.

1. **Yahoo returns `dividendYield` as a percent (4.2) but `trailingAnnualDividendYield` as a fraction (0.042).** Mixing them prices BX with a 420% yield. Test in Task 4.
2. **A symbol has fewer than 252 closes, or the chart call fails.** It must be logged as not scored and must not throw or write partial rows. Test in Task 4.
3. **Every quote of an expiration is dropped, or a symbol ends with zero scored calls.** The page lists it under "no call passed the quote checks"; nothing divides by zero. Tests in Tasks 2 and 7.
4. **The same symbol is refreshed twice in one day (retry after a partial write).** Rows are replaced, not duplicated or rejected. Test in Task 5.
5. **No refresh happened today (holiday, early close, before 15:00, or first deploy with empty tables).** The page shows each symbol's last data date, or an empty state, without error. Test in Task 7.

---

## File map

| File                                                                                                                                              | Responsibility                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `src/utils/blackScholes.ts` (modify)                                                                                                              | Add call price, call delta, implied vol from a call price; optional dividend yield in `bsTerms`; export `RISK_FREE_RATE` |
| `src/utils/optionsUtils.ts` (modify)                                                                                                              | `isBidConsistentWithChain` takes an option side                                                                          |
| `src/types/call.ts` (create)                                                                                                                      | `CallQuote`, `GatedCall`, `CallScore`, `CallVerdict`, `CallQuoteRow`, `CallRefreshLogRow`                                |
| `src/utils/callQuoteGates.ts` (create)                                                                                                            | The five quote gates for one expiration                                                                                  |
| `src/utils/callScorer.ts` (create)                                                                                                                | Fair value, range, verdict, excess cost, score; display helpers; ordering                                                |
| `src/utils/marketHoursUtils.ts` (modify)                                                                                                          | `isCallRefreshWindow`, `easternDay`                                                                                      |
| `src/migrations/016_call_quotes.sql` (create)                                                                                                     | `call_quotes`, `call_refresh_log`                                                                                        |
| `src/services/database_service.ts` (modify)                                                                                                       | Save/read call quotes and the refresh log                                                                                |
| `src/services/optionsService.ts` (modify)                                                                                                         | `fetchFreshCallData(symbol)`                                                                                             |
| `src/services/background_refresh_service.ts`, `src/workers/background_refresh.ts` (modify)                                                        | Pick and run one call refresh per tick in the window                                                                     |
| `src/pages/api/refresh-calls.ts` (create)                                                                                                         | Dev trigger for one symbol                                                                                               |
| `src/pages/calls.astro`, `src/components/callSymbolRow.astro`, `src/components/callFairRange.astro` (create); `src/layouts/Layout.astro` (modify) | The page and nav link                                                                                                    |
| `scripts/backtest-call-vol.ts`, `scripts/backtest-call-score.ts` (create); `package.json` (modify)                                                | Proof scripts                                                                                                            |

---

### Task 1: Call pricing in Black-Scholes

**Files:**

- Modify: `src/utils/blackScholes.ts`
- Test: `src/utils/__tests__/blackScholes.test.ts`

**Interfaces:**

- Produces:
  - `export const RISK_FREE_RATE` (existing constant, now exported)
  - `callPrice(spot: number, strike: number, daysToExpiry: number, volatility: number, dividendYield = 0): number | undefined`
  - `callDelta(spot, strike, daysToExpiry, volatility, dividendYield = 0): number | undefined`
  - `impliedVolFromCallPrice(price: number, spot: number, strike: number, daysToExpiry: number, dividendYield = 0): number | undefined`

- [ ] **Step 1: Check the rate constant.** Look up the current 1-year US Treasury yield. If it differs from `RISK_FREE_RATE` (0.04) by more than 0.0025, stop and report to Stephen before changing it: the put scorer's Greeks use the same constant.

- [ ] **Step 2: Write failing tests**

```ts
describe("callPrice", () => {
  it("matches the textbook value", () => {
    // Hull: S=42, K=40, r=10%, vol=20%, T=0.5 gives 4.76. With this module's r=4%:
    // S=100, K=100, 365 days, vol 0.20, no dividend -> 9.925
    expect(callPrice(100, 100, 365, 0.2)!).toBeCloseTo(9.925, 2);
  });
  it("falls when a dividend yield is added", () => {
    // S=100, K=100, 365 days, vol 0.20, q=3% -> 8.13 (compute once with an independent calculator and pin to 2 dp)
    expect(callPrice(100, 100, 365, 0.2, 0.03)!).toBeLessThan(
      callPrice(100, 100, 365, 0.2)!,
    );
  });
  it("satisfies put-call parity against the existing put loss", () => {
    // C - P = S - K e^{-rT} with q = 0; putExpectedAssignmentLoss is the undiscounted put, so discount it
    const T = 500 / 365,
      df = Math.exp(-RISK_FREE_RATE * T);
    const put = putExpectedAssignmentLoss(150, 120, 500, 0.45)! * df;
    expect(callPrice(150, 120, 500, 0.45)! - put).toBeCloseTo(
      150 - 120 * df,
      6,
    );
  });
  it("is undefined for inputs that make the model undefined", () => {
    expect(callPrice(100, 100, 0, 0.2)).toBeUndefined();
  });
});
describe("callDelta", () => {
  it("is between 0 and 1, higher deeper in the money, and is put delta + 1 with no dividend", () => {
    expect(callDelta(100, 60, 400, 0.4)!).toBeGreaterThan(
      callDelta(100, 100, 400, 0.4)!,
    );
    expect(callDelta(100, 100, 400, 0.4)!).toBeCloseTo(
      putDelta(100, 100, 400, 0.4)! + 1,
      10,
    );
  });
});
describe("impliedVolFromCallPrice", () => {
  it("round-trips a price", () => {
    const price = callPrice(166, 140, 581, 0.52, 0.006)!;
    expect(impliedVolFromCallPrice(price, 166, 140, 581, 0.006)!).toBeCloseTo(
      0.52,
      4,
    );
  });
  it("is undefined when the price is at or below the minimum the model can produce", () => {
    // NET Jan 2028 $185 on 2026-11-12: mid 121.75 with spot 318.50 is below intrinsic
    expect(impliedVolFromCallPrice(121.75, 318.5, 185, 434)).toBeUndefined();
  });
});
```

Pin the dividend case to a number in step 3 once the implementation exists and agrees with an independent calculation.

- [ ] **Step 3: Run** `npx vitest run src/utils/__tests__/blackScholes.test.ts`. Expected: FAIL, functions not exported.

- [ ] **Step 4: Implement.** Give `bsTerms` a fifth parameter `dividendYield = 0` so `d1` uses `(RISK_FREE_RATE - dividendYield + vol²/2)`; existing put callers pass nothing and are unchanged. `callPrice = S e^{-qT} N(d1) - K e^{-rT} N(d2)`. `callDelta = e^{-qT} N(d1)`. `impliedVolFromCallPrice`: bisection on volatility between 0.01 and 5, 60 iterations; return undefined if `price <= callPrice(.., 0.01, ..)` or `price >= callPrice(.., 5, ..)`.

- [ ] **Step 5: Run** the same command. Expected: PASS, including all pre-existing put tests.

- [ ] **Step 6: Commit point:** `feat: add call price, delta and implied volatility to Black-Scholes`

---

### Task 2: Quote gates

**Files:**

- Modify: `src/utils/optionsUtils.ts` (`isBidConsistentWithChain`)
- Create: `src/types/call.ts`, `src/utils/callQuoteGates.ts`
- Test: `src/utils/__tests__/optionsUtils.test.ts`, `src/utils/__tests__/callQuoteGates.test.ts`

**Interfaces:**

- Consumes: `callDelta`, `impliedVolFromCallPrice` (Task 1).
- Produces:
  - `isBidConsistentWithChain(chain, option, side: 'put' | 'call' = 'put'): boolean`. For calls the bound is mirrored: the lower strike is worth at least as much, and at most the strike gap more.
  - In `src/types/call.ts`:
    ```ts
    export interface CallQuote {
      contractName: string;
      strike: number;
      expirationDate: string;
      bid: number;
      ask: number;
      volume: number;
      openInterest: number;
    }
    export interface GatedCall extends CallQuote {
      impliedVol: number;
      delta: number;
    }
    ```
  - `gateCallQuotes(quotes: CallQuote[], ctx: { spot: number; daysToExpiry: number; dividendYield: number; forecastVol: number }): { kept: GatedCall[]; dropped: number }`. `quotes` is one expiration. `kept` holds only contracts with delta 0.60 to 0.90 that pass every gate; `dropped` counts contracts in that band that failed. Exported constants: `SCORE_DELTA_MIN = 0.6`, `SCORE_DELTA_MAX = 0.9`, `NEIGHBOUR_DELTA_MIN = 0.5`, `NEIGHBOUR_DELTA_MAX = 0.95`.

- [ ] **Step 1: Write failing tests.** Use the three five-strike blocks from the spec's appendix as fixtures (exact bids, asks and spots from that table; days to expiry 434 for NET, 581 for CRWD and DELL; dividend yield 0 for NET and CRWD, 0.007 for DELL; forecast vol 0.56, 0.50, 0.63). Because five strikes alone leave edge rows with too few neighbours, assert on the bad rows and on the middle good rows only:

```ts
it("drops the NET $185 call whose ask is below intrinsic", () => {
  /* kept has no strike 185 */
});
it("drops the CRWD $127.50 call whose ask is below intrinsic", () => {});
it("drops the DELL $260 call that passes the intrinsic check but breaks the chain and the smile", () => {});
it("drops CRWD $132.50, whose implied volatility is far above its neighbours", () => {});
it("keeps a clean chain intact", () => {
  /* 7 strikes priced by callPrice at one vol with a 1% spread: all in-band strikes kept, dropped 0 */
});
it("drops a quote with zero bid, with ask below bid, or with a spread over 15% of the ask", () => {});
it("drops a contract that has fewer than two usable neighbours", () => {
  /* expiration with two strikes */
});
it("returns an empty result for an empty expiration", () => {
  expect(gateCallQuotes([], ctx)).toEqual({ kept: [], dropped: 0 });
});
```

Add to `optionsUtils.test.ts`:

```ts
it("applies the mirrored bound for calls", () => {
  const chain = [
    { strike: 230, bid: 194 },
    { strike: 240, bid: 188.5 },
    { strike: 260, bid: 144.15 },
    { strike: 280, bid: 169 },
  ];
  expect(
    isBidConsistentWithChain(chain, { strike: 260, bid: 144.15 }, "call"),
  ).toBe(false);
  expect(
    isBidConsistentWithChain(chain, { strike: 240, bid: 188.5 }, "call"),
  ).toBe(true);
});
```

- [ ] **Step 2: Run** `npx vitest run src/utils/__tests__/callQuoteGates.test.ts src/utils/__tests__/optionsUtils.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement.** Order inside `gateCallQuotes`: compute delta at `forecastVol` and discard anything outside 0.50 to 0.95 (not counted as dropped); apply gates 1, 2, 3, 5 and solve implied vol from the mid; then gate 4 against the up-to-four nearest strikes that survived the first pass; finally keep the 0.60 to 0.90 band. Gate 3 compares against the nearest strike on each side among all quotes with a positive bid, exactly as the put version does.

- [ ] **Step 4: Run** the same command plus `npx vitest run`. Expected: all PASS.

- [ ] **Step 5: Commit point:** `feat: add quote gates for long-dated call chains`

---

### Task 3: Call scorer

**Files:**

- Create: `src/utils/callScorer.ts`
- Modify: `src/types/call.ts`
- Test: `src/utils/__tests__/callScorer.test.ts`

**Interfaces:**

- Consumes: `callPrice` (Task 1), `GatedCall` (Task 2).
- Produces:

  ```ts
  // src/types/call.ts
  export type CallVerdict = 'Cheap' | 'In range' | 'Rich';
  export interface CallScore { fairValue: number; fairLow: number; fairHigh: number; excessCost: number; score: number; verdict: CallVerdict; }
  // src/utils/callScorer.ts
  export const CALL_SCORER_VERSION = '2026-11-12-excess-cost';
  export const FORECAST_ERROR = 0.19;
  export const FAIR_SCORE = 200 / 3; // score of a call costing exactly fair value
  export const scoreCall = (call: { strike: number; bid: number; ask: number; delta: number }, ctx: { spot: number; daysToExpiry: number; dividendYield: number; forecastVol: number }): CallScore;
  export const callBreakevenPerYear = (strike: number, ask: number, spot: number, daysToExpiry: number): number;
  export const callLeverage = (delta: number, spot: number, ask: number): number;
  export const compareByScore = (a: { score: number; excessCost: number }, b: { score: number; excessCost: number }): number; // score desc, then excessCost asc
  ```

  `excessCost` is a fraction per year (0.021 = 2.1%). `score` is unrounded, 0 to 100.

- [ ] **Step 1: Write failing tests**

```ts
const ctx = {
  spot: 166.19,
  daysToExpiry: 763,
  dividendYield: 0.006,
  forecastVol: 0.471,
};
it("scores a call at exactly fair value with no spread at the fair score, verdict In range", () => {
  const fair = callPrice(166.19, 185, 763, 0.471, 0.006)!;
  const s = scoreCall({ strike: 185, bid: fair, ask: fair, delta: 0.61 }, ctx);
  expect(s.excessCost).toBeCloseTo(0, 10);
  expect(s.score).toBeCloseTo(200 / 3, 6);
  expect(s.verdict).toBe("In range");
});
it("computes excess cost as (ask - fair + half spread) / (delta x spot) / years", () => {
  const fair = callPrice(166.19, 185, 763, 0.471, 0.006)!;
  const s = scoreCall(
    { strike: 185, bid: fair + 1, ask: fair + 3, delta: 0.61 },
    ctx,
  );
  expect(s.excessCost).toBeCloseTo((3 + 1) / (0.61 * 166.19) / (763 / 365), 10);
});
it("maps -4%/yr to 100 and +8%/yr to 0, clamped", () => {
  /* construct asks giving excessCost -0.04, 0.08, 0.20 with zero spread */
});
it("brackets fair value with the range at forecast vol x 0.81 and x 1.19", () => {
  const s = scoreCall({ strike: 185, bid: 40, ask: 41, delta: 0.61 }, ctx);
  expect(s.fairLow).toBeCloseTo(
    callPrice(166.19, 185, 763, 0.471 * 0.81, 0.006)!,
    6,
  );
  expect(s.fairHigh).toBeCloseTo(
    callPrice(166.19, 185, 763, 0.471 * 1.19, 0.006)!,
    6,
  );
});
it("caps a discount inside the range at the fair score", () => {
  // ask between fairLow and fairValue: negative excess cost, verdict In range, score exactly FAIR_SCORE
});
it("lets a Cheap call score above the fair score", () => {
  /* ask below fairLow -> verdict Cheap, score > FAIR_SCORE */
});
it("marks a call Rich when the ask is above the range", () => {});
it("orders by score, then by lower excess cost", () => {
  expect(
    [
      { score: 66.67, excessCost: -0.01 },
      { score: 66.67, excessCost: -0.03 },
      { score: 70, excessCost: -0.05 },
    ]
      .sort(compareByScore)
      .map((x) => x.excessCost),
  ).toEqual([-0.05, -0.03, -0.01]);
});
it("computes breakeven per year and leverage", () => {
  expect(callBreakevenPerYear(185, 41.45, 166.19, 763)).toBeCloseTo(
    Math.pow((185 + 41.45) / 166.19, 365 / 763) - 1,
    10,
  );
  expect(callLeverage(0.61, 166.19, 41.45)).toBeCloseTo(
    (0.61 * 166.19) / 41.45,
    10,
  );
});
```

- [ ] **Step 2: Run** `npx vitest run src/utils/__tests__/callScorer.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** per the spec's "The score" section. Years = `daysToExpiry / 365`.
- [ ] **Step 4: Run** `npx vitest run`. Expected: PASS.
- [ ] **Step 5: Commit point:** `feat: add excess-cost scorer for long calls`

---

### Task 4: Fetch and score a symbol's long calls

**Files:**

- Modify: `src/services/optionsService.ts`, `src/types/call.ts`
- Create: `src/utils/callChain.ts` (pure assembly, so it is testable without Yahoo)
- Test: `src/utils/__tests__/callChain.test.ts`

**Interfaces:**

- Consumes: `gateCallQuotes` (Task 2), `scoreCall`, `CALL_SCORER_VERSION` (Task 3), `realizedVolatility`.
- Produces:

  ```ts
  // src/types/call.ts
  export interface CallQuoteRow extends CallQuote, CallScore { symbol: string; day: string; spot: number; dividendYield: number; forecastVol: number; impliedVol: number; delta: number; scorerVersion: string; }
  // src/utils/callChain.ts
  export const FORECAST_VOL_CLOSES = 756; export const MIN_FORECAST_VOL_CLOSES = 252; export const MIN_CALL_DTE = 365;
  export const forecastVolatility = (closes: number[]): number | undefined; // realizedVolatility of the last 756 closes; undefined under 252
  export const dividendYieldFromQuote = (quote: { dividendYield?: number; trailingAnnualDividendYield?: number }): number; // fraction
  export const isLongDated = (expiration: Date, now?: number): boolean; // >= 365 days
  export const buildCallRows = (input: { symbol: string; day: string; spot: number; dividendYield: number; forecastVol: number; expirations: { expirationDate: Date; quotes: CallQuote[] }[]; now?: number }): { rows: CallQuoteRow[]; dropped: number };
  // src/services/optionsService.ts
  async fetchFreshCallData(symbol: string, day: string): Promise<{ rows: CallQuoteRow[]; dropped: number; error?: string }>
  ```

- [ ] **Step 1: Write failing tests** in `callChain.test.ts`

```ts
it("reads Yahoo dividendYield as a percent and the trailing field as a fraction", () => {
  expect(
    dividendYieldFromQuote({
      dividendYield: 4.2,
      trailingAnnualDividendYield: 0.039,
    }),
  ).toBeCloseTo(0.042, 10);
  expect(
    dividendYieldFromQuote({ trailingAnnualDividendYield: 0.0077 }),
  ).toBeCloseTo(0.0077, 10);
  expect(dividendYieldFromQuote({})).toBe(0);
});
it("forecasts from the last 756 closes and refuses fewer than 252", () => {
  expect(
    forecastVolatility(Array.from({ length: 251 }, (_, i) => 100 + i)),
  ).toBeUndefined();
  const closes = Array.from(
    { length: 1000 },
    (_, i) => 100 * Math.exp(0.01 * Math.sin(i)),
  );
  expect(forecastVolatility(closes)).toBe(
    realizedVolatility(closes.slice(-756)),
  );
});
it("treats 365 days out as long dated and 364 as not", () => {});
it("builds scored rows for every expiration and sums the dropped counts", () => {
  /* two clean synthetic expirations -> rows carry symbol, day, spot, scorerVersion, and every CallScore field */
});
it("returns no rows and does not throw when every quote is unusable", () => {
  /* all bids zero */
});
```

- [ ] **Step 2: Run** `npx vitest run src/utils/__tests__/callChain.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `callChain.ts`.**
- [ ] **Step 4: Implement `fetchFreshCallData`.** Sequence: restore Yahoo session; `yahooFinance.options(symbol, {})` for spot, expiration dates and the quote's dividend fields; `yahooFinance.chart(symbol, { period1: <1,150 calendar days ago>, interval: '1d' })` for closes; if `forecastVolatility` is undefined return `{ rows: [], dropped: 0, error: 'Not enough price history to forecast volatility' }`; for each long-dated expiration fetch `options(symbol, { date })` and map `calls` to `CallQuote` (missing bid/ask/volume/openInterest become 0), with a failed expiration logged and skipped as the put fetch does; persist the session; return `buildCallRows(...)`. Any thrown error is caught and returned as `error` with the same message shape as `fetchFreshOptionsData`, so `PROVIDER_ERROR` matches it. This method does not write to the database.
- [ ] **Step 5: Run** `npm run all`. Expected: PASS.
- [ ] **Step 6: Commit point:** `feat: fetch and score long-dated calls for a symbol`

---

### Task 5: Storage

**Files:**

- Create: `src/migrations/016_call_quotes.sql`
- Modify: `src/services/database_service.ts`, `src/types/call.ts`
- Test: none automated (the repo has no D1 test harness); verified in step 4.

**Interfaces:**

- Consumes: `CallQuoteRow` (Task 4).
- Produces:

  ```ts
  // src/types/call.ts
  export type CallRefreshStatus = 'ok' | 'provider_error' | 'failed';
  export interface CallRefreshLogRow { symbol: string; day: string; attempts: number; status: CallRefreshStatus; error: string | null; scored: number; dropped: number; fetchedAt: string; }
  // DatabaseService
  async saveCallQuotes(rows: CallQuoteRow[]): Promise<void>            // INSERT OR REPLACE, via runInBatches
  async recordCallRefresh(row: Omit<CallRefreshLogRow, 'attempts'>): Promise<void> // upsert on (symbol, day), attempts = attempts + 1
  async getCallRefreshLog(day: string): Promise<CallRefreshLogRow[]>
  async getLatestCallQuotes(): Promise<CallQuoteRow[]>                  // each symbol's rows for its latest 'ok' day
  async getLatestCallRefreshes(): Promise<CallRefreshLogRow[]>          // each symbol's most recent log row
  ```

- [ ] **Step 1: Write the migration.** `call_quotes`: columns for every `CallQuoteRow` field in snake_case (`contract_name`, `symbol`, `day`, `strike`, `expiration_date`, `spot`, `bid`, `ask`, `volume`, `open_interest`, `dividend_yield`, `forecast_vol`, `implied_vol`, `delta`, `fair_value`, `fair_low`, `fair_high`, `excess_cost`, `score`, `verdict`, `scorer_version`), `PRIMARY KEY (contract_name, day)`, index on `(symbol, day)`. `call_refresh_log`: fields of `CallRefreshLogRow`, `PRIMARY KEY (symbol, day)`. `CREATE TABLE IF NOT EXISTS` only. Header comment states that rows are never pruned and why (spec, "Volume").
- [ ] **Step 2: Implement the five methods.** `getLatestCallQuotes` joins `call_quotes` to `(SELECT symbol, MAX(day) AS day FROM call_refresh_log WHERE status = 'ok' GROUP BY symbol)` so it never scans quote history.
- [ ] **Step 3: Apply locally:** `npm run db:migrate`. Expected: `016_call_quotes.sql` applied.
- [ ] **Step 4: Verify replace-not-duplicate** with a throwaway script or `wrangler d1 execute options-tracker-local --local`: insert the same `(contract_name, day)` twice with different asks through the generated SQL; expect one row holding the second ask. Call `recordCallRefresh` semantics twice for one `(symbol, day)`; expect `attempts = 2`.
- [ ] **Step 5: Run** `npm run all`. Expected: PASS.
- [ ] **Step 6: Commit point:** `feat: add call quote and call refresh log tables`

---

### Task 6: Daily refresh in the worker

**Files:**

- Modify: `src/utils/marketHoursUtils.ts`, `src/services/background_refresh_service.ts`, `src/workers/background_refresh.ts`
- Create: `src/utils/callRefreshPlan.ts`, `src/pages/api/refresh-calls.ts`
- Test: `src/utils/__tests__/callRefreshPlan.test.ts`, plus a `marketHoursUtils` test file if none exists

**Interfaces:**

- Consumes: Task 4 and Task 5 methods; `PROVIDER_ERROR` regex and `PreferredStocks`.
- Produces:

  ```ts
  // marketHoursUtils.ts
  export function easternDay(date?: Date): string;            // 'YYYY-MM-DD' in ET
  export function isCallRefreshWindow(date?: Date): boolean;  // isMarketHours(date) and ET time 15:00 through 15:55 inclusive
  // callRefreshPlan.ts
  export const MAX_CALL_ATTEMPTS = 3;
  export const nextCallSymbol = (symbols: string[], todaysLog: CallRefreshLogRow[]): string | undefined;
  // BackgroundRefreshService
  async refreshNextCallSymbol(now?: Date): Promise<boolean>   // true when a symbol was attempted this tick
  async refreshCallsFor(symbol: string, now?: Date): Promise<CallRefreshLogRow>
  ```

- [ ] **Step 1: Write failing tests**

```ts
// nextCallSymbol
it("picks the first symbol with no log row today", () => {});
it("skips symbols that are ok or failed today", () => {});
it("retries a provider_error symbol until it has 3 attempts, after untried symbols", () => {});
it("returns undefined when every symbol is done", () => {});
// isCallRefreshWindow (dates given in UTC; 2026-11-12 is EST, UTC-5)
it("is true at 15:00 and 15:55 ET on a trading day", () => {
  expect(isCallRefreshWindow(new Date("2026-11-12T20:00:00Z"))).toBe(true);
  expect(isCallRefreshWindow(new Date("2026-11-12T20:55:00Z"))).toBe(true);
});
it("is false at 14:59 and 15:56 ET, on a weekend, and on a market holiday", () => {});
it("gives the Eastern calendar day", () => {
  expect(easternDay(new Date("2026-11-13T03:30:00Z"))).toBe("2026-11-12");
});
```

- [ ] **Step 2: Run** the two test files. Expected: FAIL.
- [ ] **Step 3: Implement** the pure functions, then `refreshCallsFor` (fetch, `saveCallQuotes` when rows exist, `recordCallRefresh` with status `ok` when there was no error, `provider_error` when the error matches `PROVIDER_ERROR`, else `failed`; log scored and dropped counts with a `[CALLS]` prefix) and `refreshNextCallSymbol` (symbols = `Object.values(PreferredStocks)`, day = `easternDay(now)`). A run that succeeds with zero scored rows is `ok`.
- [ ] **Step 4: Wire the worker.** In the market-open branch, before `getNextSymbolToRefresh`: if `isCallRefreshWindow(now)` and `await refreshService.refreshNextCallSymbol(now)` returned true, skip the put refresh for this tick; pruning and stats still run. Wrap the call refresh in its own try/catch so a failure falls through to the put refresh.
- [ ] **Step 5: Dev trigger.** `POST /api/refresh-calls?symbol=NVDA`, modelled on `src/pages/api/refresh-price.ts` (same validation with `isValidSymbol`, same auth posture as that file), calls `refreshCallsFor` and returns the log row as JSON. It ignores the time window.
- [ ] **Step 6: Run it for real, locally.** `npm run dev`, then `curl -X POST "http://localhost:4321/api/refresh-calls?symbol=NVDA"` and the same for KKR. Expected: status `ok`, scored > 0. Then `npx wrangler d1 execute options-tracker-local --local --command "SELECT symbol, COUNT(*), MIN(score), MAX(score) FROM call_quotes GROUP BY symbol"`. Outside market hours bids may be zero; if scored is 0 for that reason, say so in the task report and repeat during the session.
- [ ] **Step 7: Run** `npm run all`. Expected: PASS.
- [ ] **Step 8: Commit point:** `feat: refresh long calls once per market day in the worker`

---

### Task 7: The `/calls` page

**Files:**

- Create: `src/pages/calls.astro`, `src/components/callSymbolRow.astro`, `src/components/callFairRange.astro`, `src/utils/callPageData.ts`
- Modify: `src/layouts/Layout.astro` (nav link "Long Calls" to `/calls`, between Preferred and Scoring Guide)
- Test: `src/utils/__tests__/callPageData.test.ts`

**Interfaces:**

- Consumes: `getLatestCallQuotes`, `getLatestCallRefreshes` (Task 5); `compareByScore`, `callBreakevenPerYear`, `callLeverage` (Task 3); `OptionScorer.getScoreClass`; `PreferredStocks`.
- Produces:

  ```ts
  // callPageData.ts
  export interface CallSymbolSection { symbol: string; day: string | null; fetchedAt: string | null; stale: boolean; dropped: number; best: CallQuoteRow | null; expirations: { expirationDate: string; daysToExpiry: number; calls: CallQuoteRow[] }[]; note: string | null; }
  export const buildCallSections = (symbols: string[], quotes: CallQuoteRow[], refreshes: CallRefreshLogRow[], today: string): CallSymbolSection[];
  ```

  Sections with a `best` come first, ordered by `compareByScore` on `best`; sections without one follow, alphabetically. `stale` is true when `day` is not `today`. `note` is "No call passed the quote checks", "Not refreshed yet", or the log's error text.

- [ ] **Step 1: Write failing tests**

```ts
it("picks each symbol's best call by score then lower excess cost", () => {});
it("orders symbols by their best call and puts symbols without one last", () => {});
it("groups a symbol's calls by expiration, nearest first, best score first within each", () => {});
it("marks a symbol stale when its data day is before today", () => {});
it("returns a section with a note for a symbol with a log row but zero quotes", () => {});
it('returns "Not refreshed yet" sections for every symbol when both tables are empty', () => {
  const s = buildCallSections(["NVDA", "AAPL"], [], [], "2026-11-13");
  expect(s.map((x) => x.note)).toEqual([
    "Not refreshed yet",
    "Not refreshed yet",
  ]);
});
```

- [ ] **Step 2: Run** `npx vitest run src/utils/__tests__/callPageData.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `buildCallSections`.**
- [ ] **Step 4: Build the page.** Load `frontend-design:frontend-design` first. The approved mockup is `.superpowers/brainstorm/27073-1794542380/content/calls-page-v3.html`; its generator is in the session scratchpad as `mock.mjs`. Reproduce its structure and look with Tailwind utilities (no `@apply`), keeping these fixed elements from the spec and mockup:
  - heading, lede, the amber "Comparing stocks is approximate" note, the legend;
  - one native `<details>` per symbol; the summary row shows stock and price, best call and days, score badge (rounded score, class from `getScoreClass`) and verdict chip, the fair-range bar, then cost/yr, breakeven/yr, delta, leverage, spread;
  - `callFairRange.astro`: track, shaded band from fair low to fair high, line at fair value, dot at the ask coloured by verdict, with an `aria-label` giving the four numbers, and the "ask / fair (low–high)" line beneath;
  - opened body: forecast volatility, dividend yield, scored and dropped counts, then a table per expiration with the columns in the spec's sketch, the best call's row highlighted, the table in its own horizontal scroll container;
  - a Cheap verdict carries the note "passed quote checks; confirm the live quote before trading";
  - "Prices as of" shows the most recent `fetchedAt` in ET; a stale symbol shows "data from <day>" on its row;
  - symbols without a scored call are listed at the bottom with their note;
  - the collapsed "How to read this" panel with the copy from the mockup, including the cap sentence;
  - `export const prerender = false;`, database from `Astro.locals.runtime?.env?.DB` as `preferredStocksView.astro` does, and a plain "Database not available" state.
- [ ] **Step 5: Look at it.** With local data from Task 6, open `http://localhost:4321/calls` at 1360 px and 390 px wide. Check: no horizontal page scroll at 390 px; an opened symbol's table scrolls inside its container; keyboard focus is visible on each summary; score badge and verdict never disagree (no score above 67 without Cheap). Screenshot both widths for the task report.
- [ ] **Step 6: Run** `npm run all`. Expected: PASS.
- [ ] **Step 7: Commit point:** `feat: add the Long Calls page`

---

### Task 8: Proof scripts

**Files:**

- Create: `scripts/backtest-call-vol.ts`, `scripts/backtest-call-score.ts`
- Modify: `package.json` (`backtest:call-vol`, `backtest:call-score`, same esbuild-then-node form as `backtest:scorer`)

**Interfaces:**

- Consumes: `realizedVolatility`, `rankStats` (`spearman`, `mean`), `PreferredStocks`.

- [ ] **Step 1: `backtest-call-vol.ts`.** Method exactly as the spec's "What the evidence says" method paragraph: 12 years of daily closes per preferred symbol from Yahoo; windows 63, 252, 504, 756 and the 252/756 variance blend; test points every 21 trading days from index 756 while 252 closes remain ahead; print median and 80th percentile of `|forecast - realized| / realized`, and median bias, per window, then per symbol for 756.
- [ ] **Step 2: Run** `npm run backtest:call-vol`. Expected: 756 has the lowest median error, between 17% and 21%. If not, stop and report; do not change constants.
- [ ] **Step 3: `backtest-call-score.ts`.** Input: a JSON export of `call_quotes` (header comment gives the `wrangler d1 execute ... --json` export command, as `backtest-scorer.ts` does). For each contract with rows on two days 30, 60 or 90 calendar days apart (±3 days), compute `((later.bid - first.ask) - (later.fair_value - first.fair_value)) / (first.delta * first.spot)` and report Spearman correlation with `first.excess_cost`, pooled and per symbol, with pair counts. Print "not enough history" when no pairs exist. The header states that with 19 correlated stocks this is a direction check, not proof.
- [ ] **Step 4: Run** `npm run backtest:call-score -- <path to an export of the local table>`. Expected: runs and prints "not enough history".
- [ ] **Step 5: Run** `npm run all`. Expected: PASS.
- [ ] **Step 6: Commit point:** `feat: add volatility forecast and call score backtests`

---

### Task 9: Final verification and handover

- [ ] **Step 1:** `npm run all` and `npm run build`. Expected: both pass.
- [ ] **Step 2:** Confirm the put pipeline is untouched in behaviour: `git diff main -- src/utils/optionScorer.ts` is empty, and the existing `/preferred` page renders locally as before.
- [ ] **Step 3:** Independent review of the whole branch against the spec (code-reviewer agent), then address findings.
- [ ] **Step 4:** Report to Stephen with: what was verified and how, anything not verified (for example an in-session refresh if the build happened after hours), and the production steps he must approve: `npm run db:migrate:prod`, `npm run worker:deploy:prod`, the Pages deploy via merge, and a check after the next 15:00 to 15:55 ET window that `call_refresh_log` shows 19 `ok` rows.
