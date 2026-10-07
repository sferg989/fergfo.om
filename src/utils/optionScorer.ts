import type { OptionScore } from '../types/option';
import { ReturnCalculator } from './returnCalculator';
import { putDelta } from './blackScholes';

// Weights sum to 100. The spread penalty is subtracted separately.
const SCORE_WEIGHT = {
  YIELD: 45,      // Annualized return on collateral from extrinsic premium
  RISK: 30,       // Assignment risk, via Black-Scholes put delta
  DTE: 15,        // Days till expiration
  LIQUIDITY: 10,  // Volume and open interest
} as const;

/** Matches the margin basis the UI uses in optionsUtils, so both show the same yield */
const MARGIN_RATE = 0.20;
/** Annualized return (%) on that margin basis that earns the full yield score */
const YIELD_CAP_PCT = 200;
/** |delta| at or above which a put earns no risk score (at the money and beyond) */
const RISK_DELTA_CAP = 0.5;
/** DTE earning the full score; the score falls linearly to zero at 0 and at DTE_ZERO_UPPER */
const DTE_PEAK = 38;
const DTE_ZERO_UPPER = 90;
/** Open interest + volume mix that earns the full liquidity score */
const LIQUIDITY_CAP = 10000;

const round2 = (n: number): number => Math.round(n * 100) / 100;

export type ScoreClass = 'score-excellent' | 'score-good' | 'score-moderate' | 'score-weak' | 'score-poor';

export class OptionScorer {
  /**
   * Annualized return on collateral, counting only extrinsic premium: an in-the-money
   * bid is mostly intrinsic value the seller hands back on assignment.
   * Log-scaled so the first few percent matter most.
   */
  private static calculateYieldScore(extrinsicPremium: number, strike: number, dte: number): number {
    const annualizedPct = ReturnCalculator.calculateAnnualizedReturn({
      premium: extrinsicPremium,
      strike,
      daysToExpiry: dte,
      marginRate: MARGIN_RATE,
    });
    const scaled = Math.log1p(Math.min(annualizedPct, YIELD_CAP_PCT)) / Math.log1p(YIELD_CAP_PCT);
    return SCORE_WEIGHT.YIELD * scaled;
  }

  /**
   * Assignment risk from put delta: full score as |delta| approaches 0,
   * nothing at the money or in the money.
   */
  private static calculateRiskScore(delta: number | undefined): number {
    if (delta === undefined) return 0;
    const assignmentRisk = Math.min(Math.abs(delta), RISK_DELTA_CAP) / RISK_DELTA_CAP;
    return SCORE_WEIGHT.RISK * (1 - assignmentRisk);
  }

  /** Single triangle: zero at expiry, full at DTE_PEAK, zero again at DTE_ZERO_UPPER */
  private static calculateDteScore(dte: number): number {
    if (dte <= 0) return 0;
    const fraction = dte <= DTE_PEAK
      ? dte / DTE_PEAK
      : Math.max(0, (DTE_ZERO_UPPER - dte) / (DTE_ZERO_UPPER - DTE_PEAK));
    return SCORE_WEIGHT.DTE * fraction;
  }

  /** Log-scaled open interest and volume, weighted toward open interest */
  private static calculateLiquidityScore(volume?: number, openInterest?: number): number {
    const liquidity = Math.log1p((openInterest ?? 0) * 0.8 + (volume ?? 0) * 0.2);
    const scaled = Math.min(liquidity, Math.log1p(LIQUIDITY_CAP)) / Math.log1p(LIQUIDITY_CAP);
    return SCORE_WEIGHT.LIQUIDITY * scaled;
  }

  /** Spread wider than 8% of the ask is penalised, up to 15 points */
  private static calculateSpreadPenalty(bid: number, ask: number): number {
    if (ask === 0) return 0;
    const spreadPct = (ask - bid) / ask;
    if (spreadPct <= 0.08) return 0;
    return Math.min(15, (spreadPct - 0.08) * 200);
  }

  static calculateScore(option: {
    bid: number;
    ask: number;
    strike: number;
    expirationDate: string;
    impliedVolatility: number;
    volume?: number;
    openInterest?: number;
  }, currentPrice: number): OptionScore {
    const dte = Math.ceil(
      (new Date(option.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const intrinsic = Math.max(0, option.strike - currentPrice);
    const extrinsicPremium = Math.max(0, option.bid - intrinsic);
    const delta = putDelta(currentPrice, option.strike, dte, option.impliedVolatility);

    const yieldScore = this.calculateYieldScore(extrinsicPremium, option.strike, dte);
    const riskScore = this.calculateRiskScore(delta);
    const dteScore = this.calculateDteScore(dte);
    const liquidityScore = this.calculateLiquidityScore(option.volume, option.openInterest);
    const spreadPenalty = this.calculateSpreadPenalty(option.bid, option.ask);

    const rawTotal = yieldScore + riskScore + dteScore + liquidityScore - spreadPenalty;

    return {
      total: round2(Math.max(0, Math.min(100, rawTotal))),
      yieldScore: round2(yieldScore),
      riskScore: round2(riskScore),
      dteScore: round2(dteScore),
      liquidityScore: round2(liquidityScore),
      spreadPenalty: round2(spreadPenalty),
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
