interface ReturnCalculatorParams {
  premium: number;      // The bid price
  strike: number;       // Strike price
  daysToExpiry: number;
  marginRate: number;   // Default to 20% (0.20)
}

export class ReturnCalculator {
  static calculateSimpleReturn({
    premium,
    strike,
    marginRate = 0.20
  }: Omit<ReturnCalculatorParams, 'daysToExpiry'>): number {
    // Input validation
    if (strike <= 0 || premium <= 0) return 0;
    if (marginRate <= 0 || marginRate > 1) return 0;

    // Calculate required collateral based on margin rate
    const requiredCollateral = strike * marginRate;

    // Calculate simple return (premium / required collateral) as percentage
    return (premium / requiredCollateral) * 100;
  }

  static calculateAnnualizedReturn({
    premium,
    strike,
    daysToExpiry,
    marginRate = 0.20
  }: ReturnCalculatorParams): number {
    // Input validation
    if (daysToExpiry <= 0 || strike <= 0 || premium <= 0) return 0;
    if (marginRate <= 0 || marginRate > 1) return 0;

    // Calculate required collateral based on margin rate
    const requiredCollateral = strike * marginRate;

    // Calculate simple return as decimal
    const simpleReturn = premium / requiredCollateral;

    // Annualize using (simple return × 365 / days to expiry)
    const annualizedReturn = simpleReturn * (365 / daysToExpiry) * 100;

    // Round to 2 decimal places
    return Math.round(annualizedReturn * 100) / 100;
  }

  static getReturnClass(annualizedReturn: number): string {
    if (annualizedReturn >= 15) {
      return 'premium-high';
    } else if (annualizedReturn >= 8) {
      return 'premium-medium';
    }
    return 'premium-low';
  }
} 