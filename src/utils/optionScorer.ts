import type { OptionScore } from '../types/option';
import { DEFAULT_MARGIN_RATE, ReturnCalculator } from './returnCalculator';
import { putExpectedAssignmentLoss } from './blackScholes';

/** Stored on option outcomes; bump when the scoring logic changes */
export const SCORER_VERSION = '2026-11-04-earnings-span';

// Weights sum to 100. The spread penalty is subtracted separately.
const SCORE_WEIGHT = {
  EXPECTED_RETURN: 60,  // Premium kept minus expected assignment loss, annualized on collateral
  DTE: 20,              // Days till expiration
  LIQUIDITY: 10,        // Volume and open interest
} as const;

/**
 * Annualized expected return (%) on the margin basis that earns the full score; the score is
 * linear up to it. 60% on 20% margin is 12% on cash collateral net of expected assignment loss.
 * A 35-day 20-delta put with a typical IV-over-realized gap of ~10 vol points lands around 40%
 * and scores "good"; a weekly's annualized edge saturates here and the DTE factor sorts it below
 * the 38-day sweet spot.
 */
const EXPECTED_RETURN_CAP_PCT = 60;
/** DTE earning the full score; the score falls linearly to zero at 0 and at DTE_ZERO_UPPER */
const DTE_PEAK = 38;
const DTE_ZERO_UPPER = 90;
/** Open interest + volume mix that earns the full liquidity score */
const LIQUIDITY_CAP = 10000;

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** True when an earnings report falls after `now` and on or before the option's expiration day */
export const spansEarnings = (expirationDate: string, earningsDates: string[], now = Date.now()): boolean => {
  const expiryEnd = new Date(expirationDate).getTime() + 24 * 60 * 60 * 1000;
  return earningsDates.some(d => {
    const t = new Date(d).getTime();
    return t > now && t <= expiryEnd;
  });
};

export type ScoreClass = 'score-excellent' | 'score-good' | 'score-moderate' | 'score-weak' | 'score-poor';

export class OptionScorer {
  /**
   * Expected return on collateral: extrinsic premium kept (an in-the-money bid is mostly
   * intrinsic value the seller hands back on assignment) minus the expected assignment loss,
   * priced at the stock's realized volatility rather than the option's own IV. At the option's
   * IV premium and expected loss cancel for any fairly priced put, so IV alone cannot score.
   * Annualized on the margin basis the UI uses and scaled linearly, so twice the edge scores twice.
   */
  private static calculateExpectedReturnScore(
    extrinsicPremium: number,
    strike: number,
    dte: number,
    expectedLoss: number | undefined
  ): number {
    if (expectedLoss === undefined) return 0;
    const annualizedPct = ReturnCalculator.calculateAnnualizedReturn({
      premium: extrinsicPremium - expectedLoss,
      strike,
      daysToExpiry: dte,
      marginRate: DEFAULT_MARGIN_RATE,
    });
    return SCORE_WEIGHT.EXPECTED_RETURN * Math.min(annualizedPct, EXPECTED_RETURN_CAP_PCT) / EXPECTED_RETURN_CAP_PCT;
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

  /**
   * @param realizedVol Annualized realized volatility of the underlying, used to price the
   *   expected assignment loss. Omitted, no edge can be measured and the expected-return
   *   factor scores zero: a haircut of the option's own IV only rewarded the highest-IV puts.
   * @param earningsDates Known earnings report times. A put whose life spans one earns no
   *   expected-return credit: its IV premium over realized vol is the event, not mispricing.
   */
  static calculateScore(option: {
    bid: number;
    ask: number;
    strike: number;
    expirationDate: string;
    impliedVolatility: number;
    volume?: number;
    openInterest?: number;
  }, currentPrice: number, realizedVol?: number, earningsDates: string[] = []): OptionScore {
    const dte = Math.ceil(
      (new Date(option.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const intrinsic = Math.max(0, option.strike - currentPrice);
    const extrinsicPremium = Math.max(0, option.bid - intrinsic);
    const expectedLoss = realizedVol === undefined || spansEarnings(option.expirationDate, earningsDates)
      ? undefined
      : putExpectedAssignmentLoss(currentPrice, option.strike, dte, realizedVol);

    const expectedReturnScore = this.calculateExpectedReturnScore(extrinsicPremium, option.strike, dte, expectedLoss);
    const dteScore = this.calculateDteScore(dte);
    const liquidityScore = this.calculateLiquidityScore(option.volume, option.openInterest);
    const spreadPenalty = this.calculateSpreadPenalty(option.bid, option.ask);

    const rawTotal = expectedReturnScore + dteScore + liquidityScore - spreadPenalty;

    return {
      total: round2(Math.max(0, Math.min(100, rawTotal))),
      expectedReturnScore: round2(expectedReturnScore),
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
