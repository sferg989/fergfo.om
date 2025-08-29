import type {
  StockSnapshot,
  CreateStockSnapshotParams,
  HistoricalOptionData,
  StockPerformanceData
} from '../types/database';
import type { OptionData, OptionScore } from '../types/option';

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
    const optionIds: string[] = [];
    
    for (const option of options) {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO option_snapshots (
          id, snapshot_id, contract_name, strike, last_price, bid, ask,
          volume, open_interest, expiration_date, implied_volatility,
          delta, gamma, theta, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      await stmt.bind(
        id,
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
      ).run();
      
      optionIds.push(id);
    }
    
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

    for (let i = 0; i < optionSnapshotIds.length; i++) {
      const id = crypto.randomUUID();
      const optionId = optionSnapshotIds[i];
      const score = scores[i];
      const now = new Date().toISOString();
      
      const stmt = this.db.prepare(`
        INSERT INTO option_score_snapshots (
          id, option_snapshot_id, total_score, premium_score,
          theta_score, strike_score, dte_score, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      await stmt.bind(
        id,
        optionId,
        score.total,
        score.premiumScore,
        score.thetaScore,
        score.strikeScore,
        score.dteScore,
        now
      ).run();
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
   * Get recent snapshots for a symbol
   */
  async getRecentSnapshots(symbol: string, limit: number = 10): Promise<StockSnapshot[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM stock_snapshots 
      WHERE symbol = ? 
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
  ): Promise<HistoricalOptionData[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const stmt = this.db.prepare(`
      SELECT 
        os.*,
        ss.symbol, ss.current_price, ss.fetched_at, ss.source,
        oss.total_score, oss.premium_score, oss.theta_score, 
        oss.strike_score, oss.dte_score
      FROM option_snapshots os
      JOIN stock_snapshots ss ON os.snapshot_id = ss.id
      JOIN option_score_snapshots oss ON os.id = oss.option_snapshot_id
      WHERE ss.symbol = ? AND ss.created_at >= ?
      ORDER BY oss.total_score DESC
      LIMIT ?
    `);
    
    const result = await stmt.bind(
      symbol.toUpperCase(),
      cutoffDate.toISOString(),
      limit
    ).all();
    
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
          id: r.snapshot_id as string,
          symbol: r.symbol as string,
          currentPrice: r.current_price as number,
          fetchedAt: r.fetched_at as string,
          source: r.source as string
        },
        score: {
          id: '',
          optionSnapshotId: r.id as string,
          totalScore: r.total_score as number,
          premiumScore: r.premium_score as number,
          thetaScore: r.theta_score as number,
          strikeScore: r.strike_score as number,
          dteScore: r.dte_score as number
        }
      } as HistoricalOptionData;
    });
  }

  /**
   * Add a symbol to the tracking table for background refresh
   */
  async addSymbolToTracking(symbol: string, isPreferred: boolean = false): Promise<void> {
    const now = new Date().toISOString();
    const id = `${isPreferred ? 'preferred' : 'user'}_${symbol.toLowerCase()}`;
    
    try {
      await this.db.prepare(`
        INSERT OR IGNORE INTO symbol_tracking 
        (id, symbol, is_preferred, priority, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `).bind(
        id, 
        symbol.toUpperCase(), 
        isPreferred ? 1 : 0, 
        isPreferred ? 10 : 5, // Preferred symbols get higher priority
        now, 
        now
      ).run();
      
      console.log(`Added ${symbol} to tracking (preferred: ${isPreferred})`);
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
        ss.current_price,
        MAX(oss.total_score) as top_option_score,
        COUNT(os.id) as option_count
      FROM stock_snapshots ss
      LEFT JOIN option_snapshots os ON ss.id = os.snapshot_id
      LEFT JOIN option_score_snapshots oss ON os.id = oss.option_snapshot_id
      WHERE ss.symbol = ? AND ss.created_at >= ?
      GROUP BY DATE(ss.created_at), ss.current_price
      ORDER BY date DESC
    `);
    
    const result = await stmt.bind(symbol.toUpperCase(), cutoffDate.toISOString()).all();
    
    return {
      symbol: symbol.toUpperCase(),
      snapshots: result.results.map((row: unknown) => {
        const r = row as Record<string, unknown>;
        return {
          date: r.date as string,
          currentPrice: r.current_price as number,
          topOptionScore: (r.top_option_score as number) || 0,
          optionCount: r.option_count as number
        };
      })
    };
  }
}
