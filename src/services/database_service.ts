import type {
  StockSnapshot,
  CreateStockSnapshotParams,
  HistoricalOptionData,
  StockPerformanceData,
  TopPerformingOption
} from '../types/database';
import type { OptionData, OptionScore } from '../types/option';

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

    return id;
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
        id, option_snapshot_id, total_score, premium_score,
        theta_score, strike_score, dte_score, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const statements = scores.map((score, i) => insert.bind(
      crypto.randomUUID(),
      optionSnapshotIds[i],
      score.total,
      score.premiumScore,
      score.thetaScore,
      score.strikeScore,
      score.dteScore,
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

    return snapshotId;
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
        oss.total_score, oss.premium_score, oss.theta_score, 
        oss.strike_score, oss.dte_score
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
          premiumScore: r.premium_score as number,
          thetaScore: r.theta_score as number,
          strikeScore: r.strike_score as number,
          dteScore: r.dte_score as number
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
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const stmt = this.db.prepare(`
      SELECT
        os.strike,
        os.expiration_date as expirationDate,
        MAX(oss.total_score) as totalScore,
        AVG(os.last_price) as avgPrice,
        MAX(os.volume) as maxVolume,
        MAX(os.open_interest) as maxOpenInterest,
        MIN(os.bid) as bestBid,
        MAX(os.ask) as bestAsk,
        COUNT(*) as snapshotCount
      FROM option_snapshots os
      JOIN stock_snapshots ss ON os.snapshot_id = ss.id
      JOIN option_score_snapshots oss ON os.id = oss.option_snapshot_id
      WHERE ss.symbol = ? AND ss.created_at >= ?
      GROUP BY os.strike, os.expiration_date
      ORDER BY MAX(oss.total_score) DESC
      LIMIT ?
    `);

    const result = await stmt.bind(symbol.toUpperCase(), cutoffDate.toISOString(), limit).all();

    return result.results as unknown as TopPerformingOption[];
  }

  /**
   * Add a symbol to the tracking table for background refresh
   */
  async addSymbolToTracking(symbol: string, isPreferred: boolean = false): Promise<void> {
    const now = new Date().toISOString();

    try {
      // First check if the symbol already exists and what its current priority is
      const existing = await this.db.prepare(`
        SELECT is_preferred, priority FROM symbol_tracking WHERE symbol = ?
      `).bind(symbol.toUpperCase()).first();

      // If it exists and is preferred, keep it preferred (don't downgrade)
      const finalIsPreferred = existing?.is_preferred ? true : isPreferred;
      const finalPriority = existing?.is_preferred ? 10 : (isPreferred ? 10 : 5);
      const finalId = `${finalIsPreferred ? 'preferred' : 'user'}_${symbol.toLowerCase()}`;

      await this.db.prepare(`
        INSERT OR REPLACE INTO symbol_tracking
        (id, symbol, is_preferred, priority, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1,
          COALESCE((SELECT created_at FROM symbol_tracking WHERE symbol = ?), ?),
          ?)
      `).bind(
        finalId,
        symbol.toUpperCase(),
        finalIsPreferred ? 1 : 0,
        finalPriority,
        symbol.toUpperCase(), // For the COALESCE subquery
        now, // Default created_at if new
        now  // updated_at
      ).run();

      console.log(`Added/Updated ${symbol} to tracking (preferred: ${finalIsPreferred})`);
    } catch (error) {
      console.error(`Error adding symbol ${symbol} to tracking:`, error);
      throw error;
    }
  }

  /**
   * Get performance summary for a symbol
   */
  async getStockPerformanceData(symbol: string, days: number = 30): Promise<StockPerformanceData> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const stmt = this.db.prepare(`
      SELECT 
        DATE(ss.created_at) as date,
        MIN(ss.current_price) as low_price,
        MAX(ss.current_price) as high_price,
        AVG(ss.current_price) as avg_price,
        MAX(oss.total_score) as top_option_score,
        AVG(oss.total_score) as avg_option_score,
        COUNT(DISTINCT os.id) as unique_options_count,
        COUNT(ss.id) as snapshot_count
      FROM stock_snapshots ss
      LEFT JOIN option_snapshots os ON ss.id = os.snapshot_id
      LEFT JOIN option_score_snapshots oss ON os.id = oss.option_snapshot_id
      WHERE ss.symbol = ? AND ss.created_at >= ?
      GROUP BY DATE(ss.created_at)
      ORDER BY date DESC
    `);
    
    const result = await stmt.bind(symbol.toUpperCase(), cutoffDate.toISOString()).all();
    
    return {
      symbol: symbol.toUpperCase(),
      snapshots: result.results.map((row: unknown) => {
        const r = row as Record<string, any>;
        return {
          date: r.date,
          lowPrice: r.low_price,
          highPrice: r.high_price,
          avgPrice: r.avg_price,
          topOptionScore: r.top_option_score || 0,
          avgOptionScore: r.avg_option_score || 0,
          uniqueOptionsCount: r.unique_options_count,
          snapshotCount: r.snapshot_count
        };
      })
    };
  }
}
