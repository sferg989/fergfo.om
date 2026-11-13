import type {
  StockSnapshot,
  CreateStockSnapshotParams,
  HistoricalOptionData,
  StockPerformanceData,
  TopPerformingOption
} from '../types/database';
import type { OptionData, OptionScore } from '../types/option';
import type { ExpiredContract, OptionOutcome } from '../types/database';
import type { CallQuoteRow, CallRefreshLogRow, CallVerdict } from '../types/call';

import { SCORER_VERSION } from '../utils/optionScorer';
import { dailyStatRowsFor, type OptionDailyStatRow } from '../utils/optionDailyStats';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Statements per D1 batch call */
const BATCH_SIZE = 100;

export class DatabaseService {
  private static instance: DatabaseService;
  private db: D1Database;

  private constructor(db: D1Database) {
    this.db = db;
  }

  static getInstance(db: D1Database): DatabaseService {
    if (!this.instance) {
      this.instance = new DatabaseService(db);
    }
    return this.instance;
  }

  /**
   * Create a new stock snapshot with current price and timestamp
   */
  async createStockSnapshot(params: CreateStockSnapshotParams): Promise<string> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO stock_snapshots (id, symbol, current_price, fetched_at, source, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    await stmt.bind(
      id,
      params.symbol.toUpperCase(),
      params.currentPrice,
      now,
      params.source || 'finnhub',
      now
    ).run();
    await this.upsertDailyClose(params.symbol, now, params.currentPrice);

    return id;
  }

  /** Latest fetched price of the UTC day wins (same day definition as DATE(created_at)) */
  private async upsertDailyClose(symbol: string, isoTime: string, close: number): Promise<void> {
    await this.db.prepare(`
      INSERT INTO daily_closes (symbol, day, close) VALUES (?, ?, ?)
      ON CONFLICT(symbol, day) DO UPDATE SET close = excluded.close
    `).bind(symbol.toUpperCase(), isoTime.slice(0, 10), close).run();
  }

  /** Delete daily closes older than `cutoffDay` (YYYY-MM-DD), at most `limit` per call */
  async deleteDailyClosesBefore(cutoffDay: string, limit: number): Promise<number> {
    const result = await this.db.prepare(`
      DELETE FROM daily_closes
      WHERE rowid IN (SELECT rowid FROM daily_closes WHERE day < ? ORDER BY day LIMIT ?)
    `).bind(cutoffDay, limit).run();
    return result.meta.changes ?? 0;
  }

  /**
   * Create multiple option snapshots for a stock snapshot
   */
  async createOptionSnapshots(
    snapshotId: string,
    options: OptionData[]
  ): Promise<string[]> {
    const now = new Date().toISOString();
    const insert = this.db.prepare(`
      INSERT INTO option_snapshots (
        id, snapshot_id, contract_name, strike, last_price, bid, ask,
        volume, open_interest, expiration_date, implied_volatility,
        delta, gamma, theta, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const optionIds = options.map(() => crypto.randomUUID());
    const statements = options.map((option, i) => insert.bind(
      optionIds[i],
      snapshotId,
      option.contractName,
      option.strike,
      option.lastPrice,
      option.bid,
      option.ask,
      option.volume,
      option.openInterest,
      option.expirationDate,
      option.impliedVolatility,
      option.delta || null,
      option.gamma || null,
      option.theta || null,
      now
    ));

    await this.runInBatches(statements);
    return optionIds;
  }

  /**
   * Create option score snapshots
   */
  async createOptionScoreSnapshots(
    optionSnapshotIds: string[],
    scores: OptionScore[]
  ): Promise<void> {
    if (optionSnapshotIds.length !== scores.length) {
      throw new Error('Mismatch between option snapshot IDs and scores');
    }

    const now = new Date().toISOString();
    const insert = this.db.prepare(`
      INSERT INTO option_score_snapshots (
        id, option_snapshot_id, total_score, expected_return_score,
        dte_score, liquidity_score, spread_penalty, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const statements = scores.map((score, i) => insert.bind(
      crypto.randomUUID(),
      optionSnapshotIds[i],
      score.total,
      score.expectedReturnScore,
      score.dteScore,
      score.liquidityScore,
      score.spreadPenalty,
      now
    ));

    await this.runInBatches(statements);
  }

  /**
   * Execute prepared statements in D1 batches: one round trip per chunk instead
   * of one per row. A 400-option refresh went from ~250s to a few seconds.
   */
  private async runInBatches(statements: D1PreparedStatement[]): Promise<void> {
    for (let i = 0; i < statements.length; i += BATCH_SIZE) {
      await this.db.batch(statements.slice(i, i + BATCH_SIZE));
    }
  }

  /**
   * Save a complete dataset (stock + options + scores) in a transaction
   */
  async saveCompleteSnapshot(
    symbol: string,
    currentPrice: number,
    options: OptionData[],
    scores: OptionScore[]
  ): Promise<string> {
    const snapshotId = await this.createStockSnapshot({
      symbol,
      currentPrice
    });

    const optionIds = await this.createOptionSnapshots(snapshotId, options);
    await this.createOptionScoreSnapshots(optionIds, scores);
    await this.upsertOptionDailyStats(dailyStatRowsFor(symbol, new Date().toISOString(), options, scores));

    return snapshotId;
  }

  /** Fold one snapshot's options into the day's running aggregates */
  private async upsertOptionDailyStats(rows: OptionDailyStatRow[]): Promise<void> {
    const upsert = this.db.prepare(`
      INSERT INTO option_daily_stats (
        symbol, day, strike, expiration_date, snapshot_count, max_score, sum_score,
        sum_last_price, max_volume, max_open_interest, min_bid, max_ask
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(symbol, day, strike, expiration_date) DO UPDATE SET
        snapshot_count = snapshot_count + excluded.snapshot_count,
        max_score = MAX(max_score, excluded.max_score),
        sum_score = sum_score + excluded.sum_score,
        sum_last_price = sum_last_price + excluded.sum_last_price,
        max_volume = MAX(max_volume, excluded.max_volume),
        max_open_interest = MAX(max_open_interest, excluded.max_open_interest),
        min_bid = MIN(min_bid, excluded.min_bid),
        max_ask = MAX(max_ask, excluded.max_ask)
    `);
    await this.runInBatches(rows.map(r => upsert.bind(
      r.symbol, r.day, r.strike, r.expirationDate, r.snapshotCount, r.maxScore, r.sumScore,
      r.sumLastPrice, r.maxVolume, r.maxOpenInterest, r.minBid, r.maxAsk
    )));
  }

  /** Delete daily option stats older than `cutoffDay` (YYYY-MM-DD), at most `limit` per call */
  async deleteOptionDailyStatsBefore(cutoffDay: string, limit: number): Promise<number> {
    const result = await this.db.prepare(`
      DELETE FROM option_daily_stats
      WHERE rowid IN (SELECT rowid FROM option_daily_stats WHERE day < ? ORDER BY day LIMIT ?)
    `).bind(cutoffDay, limit).run();
    return result.meta.changes ?? 0;
  }

  /** Store one symbol's scored calls for a day, replacing whatever an earlier refresh that day stored */
  async saveCallQuotes(symbol: string, day: string, rows: CallQuoteRow[]): Promise<void> {
    await this.db.prepare(`DELETE FROM call_quotes WHERE symbol = ? AND day = ?`).bind(symbol, day).run();
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO call_quotes (
        contract_name, day, symbol, strike, expiration_date, spot, bid, ask, volume, open_interest,
        dividend_yield, forecast_vol, implied_vol, delta, fair_value, fair_low, fair_high,
        excess_cost, score, verdict, scorer_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await this.runInBatches(rows.map(r => insert.bind(
      r.contractName, r.day, r.symbol, r.strike, r.expirationDate, r.spot, r.bid, r.ask, r.volume, r.openInterest,
      r.dividendYield, r.forecastVol, r.impliedVol, r.delta, r.fairValue, r.fairLow, r.fairHigh,
      r.excessCost, r.score, r.verdict, r.scorerVersion
    )));
  }

  /**
   * Count an attempt at a symbol's call refresh before any work is done, as failed until
   * finishCallRefresh says otherwise. Written first so that a refresh which dies part-way still
   * uses up the attempt and the worker moves on to the next symbol.
   */
  async startCallRefresh(symbol: string, day: string, fetchedAt: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO call_refresh_log (symbol, day, attempts, status, error, scored, dropped, fetched_at)
      VALUES (?, ?, 1, 'failed', 'Refresh did not finish', 0, 0, ?)
      ON CONFLICT(symbol, day) DO UPDATE SET
        attempts = attempts + 1, status = excluded.status, error = excluded.error,
        scored = 0, dropped = 0, fetched_at = excluded.fetched_at
    `).bind(symbol, day, fetchedAt).run();
  }

  /** Record how the attempt opened by startCallRefresh went */
  async finishCallRefresh(row: Omit<CallRefreshLogRow, 'attempts' | 'fetchedAt'>): Promise<void> {
    await this.db.prepare(`
      UPDATE call_refresh_log SET status = ?, error = ?, scored = ?, dropped = ? WHERE symbol = ? AND day = ?
    `).bind(row.status, row.error, row.scored, row.dropped, row.symbol, row.day).run();
  }

  private static readonly CALL_REFRESH_LOG_COLUMNS =
    'symbol, day, attempts, status, error, scored, dropped, fetched_at AS fetchedAt';

  /** Every symbol's call refresh outcome for one Eastern day */
  async getCallRefreshLog(day: string): Promise<CallRefreshLogRow[]> {
    const result = await this.db.prepare(
      `SELECT ${DatabaseService.CALL_REFRESH_LOG_COLUMNS} FROM call_refresh_log WHERE day = ?`
    ).bind(day).all<CallRefreshLogRow>();
    return result.results;
  }

  /** Each symbol's most recent call refresh outcome */
  async getLatestCallRefreshes(): Promise<CallRefreshLogRow[]> {
    const result = await this.db.prepare(`
      SELECT ${DatabaseService.CALL_REFRESH_LOG_COLUMNS} FROM call_refresh_log
      WHERE (symbol, day) IN (SELECT symbol, MAX(day) FROM call_refresh_log GROUP BY symbol)
    `).all<CallRefreshLogRow>();
    return result.results;
  }

  /**
   * Each symbol's scored calls from its latest successful refresh. The day comes from the small
   * refresh log, so quote history is only touched through its (symbol, day) index.
   */
  async getLatestCallQuotes(): Promise<CallQuoteRow[]> {
    const result = await this.db.prepare(`
      SELECT
        q.contract_name AS contractName, q.day, q.symbol, q.strike, q.expiration_date AS expirationDate,
        q.spot, q.bid, q.ask, q.volume, q.open_interest AS openInterest,
        q.dividend_yield AS dividendYield, q.forecast_vol AS forecastVol, q.implied_vol AS impliedVol, q.delta,
        q.fair_value AS fairValue, q.fair_low AS fairLow, q.fair_high AS fairHigh,
        q.excess_cost AS excessCost, q.score, q.verdict, q.scorer_version AS scorerVersion
      FROM call_quotes q
      JOIN (
        SELECT symbol, MAX(day) AS day FROM call_refresh_log WHERE status = 'ok' AND scored > 0 GROUP BY symbol
      ) latest ON q.symbol = latest.symbol AND q.day = latest.day
    `).all<CallQuoteRow & { verdict: CallVerdict }>();
    return result.results;
  }

  /** Serialized Yahoo cookie jar saved by a previous worker run, or null if none yet. */
  async getYahooSession(): Promise<string | null> {
    const row = await this.db.prepare(`SELECT cookie_jar FROM yahoo_session WHERE id = 'main'`).first<{ cookie_jar: string }>();
    return row?.cookie_jar ?? null;
  }

  async saveYahooSession(cookieJar: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO yahoo_session (id, cookie_jar, updated_at) VALUES ('main', ?, ?)
      ON CONFLICT(id) DO UPDATE SET cookie_jar = excluded.cookie_jar, updated_at = excluded.updated_at
    `).bind(cookieJar, new Date().toISOString()).run();
  }

  /**
   * Delete the oldest stock snapshots created before `cutoffIso`, at most `limit` per call.
   * Option and score rows go with them via ON DELETE CASCADE. Returns total rows deleted,
   * cascaded rows included.
   */
  async deleteSnapshotsBefore(cutoffIso: string, limit: number): Promise<number> {
    const result = await this.db.prepare(`
      DELETE FROM stock_snapshots
      WHERE id IN (
        SELECT id FROM stock_snapshots
        WHERE created_at < ?
        ORDER BY created_at
        LIMIT ?
      )
    `).bind(cutoffIso, limit).run();
    return result.meta.changes ?? 0;
  }

  /**
   * Earliest expiration before `cutoffIso` that has a tracked contract with no outcome row, or
   * null when every expired contract is settled. Puts only, so (symbol, strike, expiration)
   * identifies a contract in both option_daily_stats and option_outcomes.
   */
  private async getOldestUnsettledExpiration(cutoffIso: string): Promise<string | null> {
    const row = await this.db.prepare(`
      SELECT MIN(expiration_date) AS oldest FROM (
        SELECT symbol, strike, expiration_date FROM option_daily_stats WHERE expiration_date < ?
        EXCEPT
        SELECT symbol, strike, expiration_date FROM option_outcomes
      )
    `).bind(cutoffIso).first<{ oldest: string | null }>();
    return row?.oldest ?? null;
  }

  /**
   * Contracts that expired before `cutoffIso` and have no outcome row, each with the
   * snapshot at the largest DTE <= 38 (picked via ROW_NUMBER()). Contracts never seen at
   * or below 38 DTE fall back to their oldest surviving snapshot.
   */
  async getExpiredContractsWithoutOutcome(cutoffIso: string, limit: number): Promise<ExpiredContract[]> {
    // The window query below reads every expired option row (1.4M rows, ~6s) even when all of
    // them are settled, so ask the small per-day aggregates first and start at the oldest gap.
    const oldestUnsettled = await this.getOldestUnsettledExpiration(cutoffIso);
    if (!oldestUnsettled) return [];

    // created_at and expiration_date are both ISO-8601 strings, which julianday() parses.
    // Pick the snapshot at the largest DTE <= 38; contracts never seen that close fall back to the oldest.
    const result = await this.db.prepare(`
      SELECT contract_name, symbol, strike, expiration_date, bid, ask, implied_volatility, volume, open_interest,
             spot_price, total_score, first_seen_at
      FROM (
        SELECT os.contract_name, ss.symbol, os.strike, os.expiration_date, os.bid, os.ask,
               os.implied_volatility, os.volume, os.open_interest, ss.current_price AS spot_price, oss.total_score,
               ss.created_at AS first_seen_at,
               ROW_NUMBER() OVER (
                 PARTITION BY os.contract_name
                 ORDER BY (julianday(os.expiration_date) - julianday(ss.created_at)) > 38,
                          CASE WHEN julianday(os.expiration_date) - julianday(ss.created_at) <= 38
                               THEN julianday(os.expiration_date) - julianday(ss.created_at) END DESC,
                          ss.created_at ASC
               ) AS rn
        FROM option_snapshots os
        JOIN stock_snapshots ss ON ss.id = os.snapshot_id
        LEFT JOIN option_score_snapshots oss ON oss.option_snapshot_id = os.id
        WHERE os.expiration_date < ?
          AND os.expiration_date >= ?
          AND NOT EXISTS (SELECT 1 FROM option_outcomes oo WHERE oo.contract_name = os.contract_name)
      )
      WHERE rn = 1
      ORDER BY expiration_date
      LIMIT ?
    `).bind(cutoffIso, oldestUnsettled, limit).all();

    return result.results.map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        contractName: r.contract_name as string,
        symbol: r.symbol as string,
        strike: r.strike as number,
        expirationDate: r.expiration_date as string,
        firstSeenAt: r.first_seen_at as string,
        firstSeenBid: r.bid as number,
        firstSeenScore: (r.total_score as number | null) ?? null,
        ask: r.ask as number,
        impliedVolatility: r.implied_volatility as number,
        spotPrice: r.spot_price as number,
        // Same convention as OptionScorer.calculateScore, evaluated at the snapshot time
        dteAtScore: Math.ceil((new Date(r.expiration_date as string).getTime() - new Date(r.first_seen_at as string).getTime()) / DAY_MS),
        volume: r.volume as number,
        openInterest: r.open_interest as number,
        realizedVol: null // filled by the outcome sweep from daily_closes
      };
    });
  }

  async saveOptionOutcomes(outcomes: OptionOutcome[]): Promise<void> {
    if (outcomes.length === 0) return;
    const now = new Date().toISOString();
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO option_outcomes (
        contract_name, symbol, strike, expiration_date, settlement_price, expired_otm,
        first_seen_at, first_seen_bid, first_seen_score, realized_return, realized_return_pct, recorded_at,
        implied_volatility, ask, spot_price, dte_at_score, volume, open_interest, realized_vol, scorer_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    await this.runInBatches(outcomes.map(o => insert.bind(
      o.contractName, o.symbol, o.strike, o.expirationDate, o.settlementPrice, o.expiredOtm ? 1 : 0,
      o.firstSeenAt, o.firstSeenBid, o.firstSeenScore, o.realizedReturn, o.realizedReturnPct, now,
      o.impliedVolatility, o.ask, o.spotPrice, o.dteAtScore, o.volume, o.openInterest, o.realizedVol, SCORER_VERSION
    )));
  }

  /**
   * Get recent snapshots for a symbol, deduplicating by meaningful price changes
   * Only deduplicates if price change is < 0.1% within the same hour
   */
  async getRecentSnapshots(symbol: string, limit: number = 10): Promise<StockSnapshot[]> {
    const stmt = this.db.prepare(`
      WITH grouped_snapshots AS (
        SELECT
          id,
          symbol,
          current_price,
          fetched_at,
          source,
          created_at,
          ROW_NUMBER() OVER (
            PARTITION BY
              DATE(created_at),
              strftime('%H', created_at),
              CAST(current_price * 1000 AS INTEGER)
            ORDER BY created_at DESC
          ) as row_num
        FROM stock_snapshots
        WHERE symbol = ?
      )
      SELECT
        id,
        symbol,
        current_price,
        fetched_at,
        source,
        created_at
      FROM grouped_snapshots
      WHERE row_num = 1
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const result = await stmt.bind(symbol.toUpperCase(), limit).all();
    return (result.results as unknown[]).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        symbol: r.symbol as string,
        currentPrice: r.current_price as number,
        fetchedAt: r.fetched_at as string,
        source: (r.source as string) ?? 'finnhub',
        createdAt: r.created_at as string | undefined
      } satisfies StockSnapshot;
    });
  }

  /**
   * Get the most recent snapshot for a symbol that has option rows attached.
   * Price-only snapshots (from the refresh-price endpoint) are skipped.
   */
  async getLatestSnapshotWithOptions(symbol: string): Promise<StockSnapshot | null> {
    const row = await this.db.prepare(`
      SELECT id, symbol, current_price, fetched_at, source, created_at
      FROM stock_snapshots ss
      WHERE symbol = ?
        AND EXISTS (SELECT 1 FROM option_snapshots os WHERE os.snapshot_id = ss.id)
      ORDER BY created_at DESC
      LIMIT 1
    `).bind(symbol.toUpperCase()).first();

    if (!row) return null;
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      symbol: r.symbol as string,
      currentPrice: r.current_price as number,
      fetchedAt: r.fetched_at as string,
      source: (r.source as string) ?? 'finnhub',
      createdAt: r.created_at as string | undefined
    };
  }

  /**
   * Get options for a specific snapshot
   */
  async getOptionsForSnapshot(snapshotId: string): Promise<HistoricalOptionData[]> {
    const stmt = this.db.prepare(`
      SELECT 
        os.*,
        ss.symbol, ss.current_price, ss.fetched_at, ss.source,
        oss.total_score, oss.expected_return_score,
        oss.dte_score, oss.liquidity_score, oss.spread_penalty
      FROM option_snapshots os
      JOIN stock_snapshots ss ON os.snapshot_id = ss.id
      LEFT JOIN option_score_snapshots oss ON os.id = oss.option_snapshot_id
      WHERE os.snapshot_id = ?
      ORDER BY oss.total_score DESC
    `);
    
    const result = await stmt.bind(snapshotId).all();
    
    return result.results.map((row: unknown) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        snapshotId: r.snapshot_id as string,
        contractName: r.contract_name as string,
        strike: r.strike as number,
        lastPrice: r.last_price as number,
        bid: r.bid as number,
        ask: r.ask as number,
        volume: r.volume as number,
        openInterest: r.open_interest as number,
        expirationDate: r.expiration_date as string,
        impliedVolatility: r.implied_volatility as number,
        delta: r.delta as number | undefined,
        gamma: r.gamma as number | undefined,
        theta: r.theta as number | undefined,
        createdAt: r.created_at as string,
        stockSnapshot: {
          id: snapshotId,
          symbol: r.symbol as string,
          currentPrice: r.current_price as number,
          fetchedAt: r.fetched_at as string,
          source: r.source as string
        },
        score: r.total_score ? {
          id: '',
          optionSnapshotId: r.id as string,
          totalScore: r.total_score as number,
          expectedReturnScore: r.expected_return_score as number,
          dteScore: r.dte_score as number,
          liquidityScore: r.liquidity_score as number,
          spreadPenalty: r.spread_penalty as number
        } : undefined
      } as HistoricalOptionData;
    });
  }

  /**
   * Get top performing options for a symbol over time
   */
  async getTopPerformingOptions(
    symbol: string,
    days: number = 30,
    limit: number = 10
  ): Promise<TopPerformingOption[]> {
    const cutoffDay = new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);

    const result = await this.db.prepare(`
      SELECT
        strike,
        expiration_date as expirationDate,
        MAX(max_score) as totalScore,
        SUM(sum_last_price) / SUM(snapshot_count) as avgPrice,
        MAX(max_volume) as maxVolume,
        MAX(max_open_interest) as maxOpenInterest,
        MIN(min_bid) as bestBid,
        MAX(max_ask) as bestAsk,
        SUM(snapshot_count) as snapshotCount
      FROM option_daily_stats
      WHERE symbol = ? AND day >= ?
      GROUP BY strike, expiration_date
      ORDER BY MAX(max_score) DESC
      LIMIT ?
    `).bind(symbol.toUpperCase(), cutoffDay, limit).all();

    return result.results as unknown as TopPerformingOption[];
  }

  async getNextEarningsAt(symbol: string): Promise<string | null> {
    const row = await this.db.prepare('SELECT next_earnings_at FROM symbol_tracking WHERE symbol = ?')
      .bind(symbol.toUpperCase()).first<{ next_earnings_at: string | null }>();
    return row?.next_earnings_at ?? null;
  }

  async setNextEarningsAt(symbol: string, nextEarningsAt: string | null): Promise<void> {
    await this.db.prepare('UPDATE symbol_tracking SET next_earnings_at = ? WHERE symbol = ?')
      .bind(nextEarningsAt, symbol.toUpperCase()).run();
  }

  /**
   * Add a symbol to the tracking table for background refresh
   */
  async addSymbolToTracking(symbol: string, isPreferred: boolean = false): Promise<void> {
    const now = new Date().toISOString();
    const upper = symbol.toUpperCase();

    try {
      // Upsert: a symbol already tracked keeps its refresh state (last_refreshed_at,
      // error_count, is_active). INSERT OR REPLACE used to wipe all of it on every
      // page view. Preference and priority can only ever be upgraded.
      await this.db.prepare(`
        INSERT INTO symbol_tracking
          (id, symbol, is_preferred, priority, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(symbol) DO UPDATE SET
          is_preferred = MAX(is_preferred, excluded.is_preferred),
          priority = MAX(priority, excluded.priority),
          updated_at = excluded.updated_at
      `).bind(
        `${isPreferred ? 'preferred' : 'user'}_${symbol.toLowerCase()}`,
        upper,
        isPreferred ? 1 : 0,
        isPreferred ? 10 : 5,
        now,
        now
      ).run();

      console.log(`Added/Updated ${upper} in tracking (preferred: ${isPreferred})`);
    } catch (error) {
      console.error(`Error adding symbol ${symbol} to tracking:`, error);
      throw error;
    }
  }

  /**
   * Last recorded price on each day in the `days` before `before` (exclusive of that day),
   * oldest first, from daily_closes (kept 90 days). Defaults to the window ending now.
   */
  async getDailyCloses(symbol: string, days: number, before: string = new Date().toISOString()): Promise<number[]> {
    const endMs = new Date(before).getTime();
    const cutoffDay = new Date(endMs - days * DAY_MS).toISOString().slice(0, 10);
    const result = await this.db.prepare(`
      SELECT close FROM daily_closes WHERE symbol = ? AND day >= ? AND day < ? ORDER BY day
    `).bind(symbol.toUpperCase(), cutoffDay, before.slice(0, 10)).all();
    return result.results.map((row: unknown) => (row as { close: number }).close);
  }

  /**
   * Per-day price range from stock_snapshots joined to the day's option aggregates
   */
  async getStockPerformanceData(symbol: string, days: number = 30): Promise<StockPerformanceData> {
    const cutoffDay = new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);

    const result = await this.db.prepare(`
      SELECT
        p.date,
        p.low_price,
        p.high_price,
        p.avg_price,
        o.top_option_score,
        o.avg_option_score,
        o.options_count
      FROM (
        SELECT DATE(created_at) as date,
               MIN(current_price) as low_price,
               MAX(current_price) as high_price,
               AVG(current_price) as avg_price
        FROM stock_snapshots
        WHERE symbol = ? AND created_at >= ?
        GROUP BY DATE(created_at)
      ) p
      LEFT JOIN (
        SELECT day,
               MAX(max_score) as top_option_score,
               SUM(sum_score) / SUM(snapshot_count) as avg_option_score,
               SUM(snapshot_count) as options_count
        FROM option_daily_stats
        WHERE symbol = ? AND day >= ?
        GROUP BY day
      ) o ON o.day = p.date
      ORDER BY p.date DESC
    `).bind(symbol.toUpperCase(), cutoffDay, symbol.toUpperCase(), cutoffDay).all();

    return {
      symbol: symbol.toUpperCase(),
      snapshots: result.results.map((row: unknown) => {
        const r = row as Record<string, number | string | null>;
        return {
          date: r.date as string,
          lowPrice: r.low_price as number,
          highPrice: r.high_price as number,
          avgPrice: r.avg_price as number,
          topOptionScore: (r.top_option_score as number | null) ?? 0,
          avgOptionScore: (r.avg_option_score as number | null) ?? 0,
          // Every stored option row is a distinct contract observation, as the old COUNT(DISTINCT os.id) counted
          uniqueOptionsCount: (r.options_count as number | null) ?? 0,
          snapshotCount: (r.options_count as number | null) ?? 0
        };
      })
    };
  }
}
