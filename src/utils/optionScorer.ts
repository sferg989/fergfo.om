import type { OptionScore } from '../types/option';

// Adjusted weights to sum to 100 for better score distribution
const SCORE_WEIGHT = {
  PREMIUM: 25,    // Premium as percentage of strike price
  THETA: 20,      // Time decay rate (theta)
  STRIKE: 15,     // Strike distance from current price
  DTE: 15,        // Days till expiration
  IV: 15,         // Implied Volatility
  LIQUIDITY: 10,  // Volume and open interest
} as const;

export type ScoreClass = 'score-excellent' | 'score-good' | 'score-moderate' | 'score-weak' | 'score-poor';

export class OptionScorer {
  /**
   * Evaluates the premium as a percentage of strike price
   * Uses a logarithmic function to prevent excessive scaling
   * Max score (25) reached around 5% premium with diminishing returns
   */
  private static calculatePremiumScore(premiumPct: number): number {
    // Cap at 10% premium to prevent unrealistic scores
    const cappedPct = Math.min(premiumPct, 10);
    return Math.min(SCORE_WEIGHT.PREMIUM, Math.log1p(cappedPct) * 8);
  }

  /**
   * Evaluates the rate of time decay (theta)
   * More negative theta = better score (faster time decay)
   * Properly bounded to max score of 20
   */
  private static calculateThetaScore(theta?: number): number {
    if (!theta) return 0;
    
    // Normalize theta to a reasonable range (-0.1 to 0)
    const normalizedTheta = Math.max(-0.1, Math.min(0, theta));
    // Convert to positive scale and bound to max score
    return Math.min(SCORE_WEIGHT.THETA, Math.abs(normalizedTheta) * 200);
  }

  /**
   * Evaluates how far the strike price is from current price
   * Closer to current price = better score
   * Each 1% away from current price reduces score by 1.5 points
   */
  private static calculateStrikeScore(strikeDistance: number): number {
    return Math.max(0, SCORE_WEIGHT.STRIKE - (strikeDistance * 150));
  }

  /**
   * Evaluates the days till expiration (DTE)
   * Optimal range is 30-45 DTE with peak at 35-40
   * Gradual decay outside optimal range
   */
  private static calculateDteScore(dte: number): number {
    const maxScore = SCORE_WEIGHT.DTE;

    if (dte < 25) {
      // Too close to expiration - rapid score decay
      return Math.max(0, maxScore - (25 - dte) * 1.5);
    } else if (dte > 50) {
      // Too far from expiration - gradual score decay
      return Math.max(0, maxScore - (dte - 50) * 0.5);
    } else if (dte >= 30 && dte <= 45) {
      // Optimal range - full score with slight variation
      return maxScore - Math.abs(dte - 37.5) * 0.2;
    } else {
      // Transition zones - linear interpolation
      if (dte < 30) {
        return maxScore - (30 - dte) * 0.8;
      } else {
        return maxScore - (dte - 45) * 0.8;
      }
    }
  }

  /**
   * Evaluates the implied volatility (IV)
   * Higher IV leads to higher premiums, which is favorable for sellers
   * Max score for IV >= 60% with diminishing returns
   */
  private static calculateIvScore(iv: number): number {
    // Cap IV at 100% to prevent unrealistic scores
    const cappedIv = Math.min(iv, 100);
    // Use square root for diminishing returns, max at 60% IV
    return Math.min(SCORE_WEIGHT.IV, (cappedIv / 60) * SCORE_WEIGHT.IV);
  }

  /**
   * Evaluates liquidity based on volume and open interest
   * Uses a logarithmic scale with proper bounds
   */
  private static calculateLiquidityScore(volume?: number, openInterest?: number): number {
    const vol = volume || 0;
    const oi = openInterest || 0;
    
    // Combine volume and open interest with more weight on open interest
    const liquidityMetric = Math.log1p(oi * 0.8 + vol * 0.2);
    
    // Scale to max score with proper bounds
    // Cap at reasonable liquidity levels to prevent excessive scoring
    const maxLiquidity = Math.log1p(10000); // Cap at 10k contracts
    const normalizedLiquidity = Math.min(liquidityMetric, maxLiquidity);
    
    return Math.min(SCORE_WEIGHT.LIQUIDITY, (normalizedLiquidity / maxLiquidity) * SCORE_WEIGHT.LIQUIDITY);
  }

  /**
   * Penalizes options with a wide bid-ask spread
   * A spread wider than 8% of the ask price will receive a penalty
   * Penalty is capped to prevent excessive score reduction
   */
  private static calculateSpreadPenalty(bid: number, ask: number): number {
    if (ask === 0) return 0;
    
    const spread = ask - bid;
    const spreadPct = spread / ask;
    
    // Penalty starts at 8% spread, max penalty of 15 points
    if (spreadPct <= 0.08) return 0;
    
    const penalty = Math.min(15, (spreadPct - 0.08) * 200);
    return penalty;
  }

  static calculateScore(option: {
    bid: number;
    ask: number;
    strike: number;
    theta?: number;
    expirationDate: string;
    impliedVolatility: number;
    volume?: number;
    openInterest?: number;
  }, currentPrice: number): OptionScore {
    const dte = Math.ceil(
      (new Date(option.expirationDate).getTime() - new Date().getTime()) /
      (1000 * 60 * 60 * 24)
    );

    const premiumPct = (option.bid / option.strike) * 100;
    const strikeDistance = Math.abs(1 - (option.strike / currentPrice));

    const premiumScore = this.calculatePremiumScore(premiumPct);
    const thetaScore = this.calculateThetaScore(option.theta);
    const strikeScore = this.calculateStrikeScore(strikeDistance);
    const dteScore = this.calculateDteScore(dte);
    const ivScore = this.calculateIvScore(option.impliedVolatility);
    const liquidityScore = this.calculateLiquidityScore(option.volume, option.openInterest);
    const spreadPenalty = this.calculateSpreadPenalty(option.bid, option.ask);

    // Calculate total score with proper bounds
    const rawTotal = premiumScore + thetaScore + strikeScore + dteScore + ivScore + liquidityScore - spreadPenalty;
    const total = Math.max(0, Math.min(100, rawTotal));

    return {
      total: Math.round(total * 100) / 100, // Round to 2 decimal places
      premiumScore: Math.round(premiumScore * 100) / 100,
      thetaScore: Math.round(thetaScore * 100) / 100,
      strikeScore: Math.round(strikeScore * 100) / 100,
      dteScore: Math.round(dteScore * 100) / 100,
      ivScore: Math.round(ivScore * 100) / 100,
      liquidityScore: Math.round(liquidityScore * 100) / 100,
      spreadPenalty: Math.round(spreadPenalty * 100) / 100,
    };
  }

  static getScoreClass(score: number): ScoreClass {
    if (score >= 80) return 'score-excellent';
    if (score >= 65) return 'score-good';
    if (score >= 50) return 'score-moderate';
    if (score >= 35) return 'score-weak';
    return 'score-poor';
  }
}
