export enum ScoreWeight {
  PREMIUM = 40,  // Premium has highest weight as it directly impacts returns
  THETA = 30,    // Theta is second most important for consistent time decay
  STRIKE = 15,   // Strike distance affects probability of assignment
  DTE = 15      // Days till expiration impacts time management
}

export interface OptionScore {
  total: number;
  premiumScore: number;
  thetaScore: number;
  strikeScore: number;
  dteScore: number;
}

export class OptionScorer {
  /**
   * Evaluates the premium as a percentage of strike price
   * Higher premium % = better score
   * Multiplier of 8 means 5% premium would give max score (40 points)
   */
  private static calculatePremiumScore(premiumPct: number): number {
    return Math.min(ScoreWeight.PREMIUM, premiumPct * 8);
  }

  /**
   * Evaluates the rate of time decay (theta)
   * More negative theta = better score (faster time decay)
   * Multiplied by 1000 to normalize typical theta values (-0.01 to -0.03)
   */
  private static calculateThetaScore(theta?: number): number {
    return theta ? 
      Math.min(ScoreWeight.THETA, Math.abs(theta) * 1000) : 
      0;
  }

  /**
   * Evaluates how far the strike price is from current price
   * Closer to current price = better score
   * Each 1% away from current price reduces score by 1 point
   */
  private static calculateStrikeScore(strikeDistance: number): number {
    return Math.max(0, ScoreWeight.STRIKE - (strikeDistance * 100));
  }

  /**
   * Evaluates the days till expiration (DTE)
   * Optimal range is 25-45 DTE for maximum score
   * Score decreases faster for shorter DTEs (<25) than longer ones (>45)
   * - Under 25 DTE: -0.6 points per day below 25
   * - Over 45 DTE: -0.5 points per day above 45
   */
  private static calculateDteScore(dte: number): number {
    const maxScore = ScoreWeight.DTE;
    return dte >= 25 && dte <= 45 ? maxScore :
      dte > 45 ? Math.max(0, maxScore - (dte - 45) * 0.5) :
      Math.max(0, maxScore - (25 - dte) * 0.6);
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
    if (score >= 75) return 'score-excellent';
    if (score >= 60) return 'score-good';
    if (score >= 45) return 'score-moderate';
    if (score >= 30) return 'score-weak';
    return 'score-poor';
  }
} 