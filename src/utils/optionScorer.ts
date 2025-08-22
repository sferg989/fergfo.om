import type { OptionScore } from '../types/option';

// Prefer const objects over enums for TS best practices in this project
const SCORE_WEIGHT = {
  PREMIUM: 40, // Premium has highest weight as it directly impacts returns
  THETA: 30,   // Theta is second most important for consistent time decay
  STRIKE: 15,  // Strike distance affects probability of assignment
  DTE: 15      // Days till expiration impacts time management
} as const;

export type ScoreClass = 'score-excellent' | 'score-good' | 'score-moderate' | 'score-weak' | 'score-poor';

export class OptionScorer {
  /**
   * Evaluates the premium as a percentage of strike price
   * Uses a logarithmic function to prevent excessive scaling from high IV options.
   * The max score is reached around 6.67% premium, but with diminishing returns beyond.
   */
  private static calculatePremiumScore(premiumPct: number): number {
    return Math.min(SCORE_WEIGHT.PREMIUM, Math.log1p(premiumPct) * 18);
  }

  /**
   * Evaluates the rate of time decay (theta)
   * More negative theta = better score (faster time decay)
   * Multiplied by 800 to make max score harder to achieve
   * Typical theta values would need to be around -0.0375 for max score
   */
  private static calculateThetaScore(theta?: number): number {
    return theta ? 
      Math.min(SCORE_WEIGHT.THETA, Math.abs(theta) * 800) : 
      0;
  }

  /**
   * Evaluates how far the strike price is from current price
   * Closer to current price = better score
   * Each 0.8% away from current price reduces score by 1 point
   * More punishing than previous 1% reduction
   */
  private static calculateStrikeScore(strikeDistance: number): number {
    return Math.max(0, SCORE_WEIGHT.STRIKE - (strikeDistance * 125));
  }

  /**
   * Evaluates the days till expiration (DTE)
   * Introduces a gradual decay within the optimal 30-40 DTE range:
   * - Peak score (15) at 35 DTE
   * - Decreases linearly between 30-40 instead of flat scoring
   * - Faster decay outside 30-40 DTE
   */
  private static calculateDteScore(dte: number): number {
    const maxScore = SCORE_WEIGHT.DTE;
    
    if (dte < 30) {
      return Math.max(0, maxScore - (30 - dte) * 0.8);
    } else if (dte > 40) {
      return Math.max(0, maxScore - (dte - 40) * 0.7);
    } else {
      // Linear scaling between 30-40 DTE, peak at 35
      return maxScore - Math.abs(dte - 35);
    }
  }

  static calculateScore(option: {
    bid: number;
    strike: number;
    theta?: number;
    expirationDate: string;
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

    const total = premiumScore + thetaScore + strikeScore + dteScore;

    return {
      total,
      premiumScore,
      thetaScore,
      strikeScore,
      dteScore
    };
  }

  static getScoreClass(score: number): string {
    if (score >= 80) return 'score-excellent';
    if (score >= 65) return 'score-good';
    if (score >= 50) return 'score-moderate';
    if (score >= 35) return 'score-weak';
    return 'score-poor';
  }
}
