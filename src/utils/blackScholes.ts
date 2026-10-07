/**
 * Yahoo returns implied volatility but no Greeks, so theta is derived here with
 * Black-Scholes. Rates move slowly and only nudge theta, so one is hard-coded.
 */
const RISK_FREE_RATE = 0.04;
const DAYS_PER_YEAR = 365;

const normalPdf = (x: number): number => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

/** Abramowitz & Stegun 7.1.26 erf approximation, accurate to ~1.5e-7 */
const normalCdf = (x: number): number => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const tail = normalPdf(x) * poly;
  return x >= 0 ? 1 - tail : tail;
};

/**
 * Daily theta of a European put, in dollars per share per calendar day.
 * Negative means the option loses value as time passes.
 */
export const putThetaPerDay = (
  spot: number,
  strike: number,
  daysToExpiry: number,
  impliedVolatility: number
): number | undefined => {
  if (spot <= 0 || strike <= 0 || daysToExpiry <= 0 || impliedVolatility <= 0) return undefined;

  const t = daysToExpiry / DAYS_PER_YEAR;
  const volSqrtT = impliedVolatility * Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (RISK_FREE_RATE + (impliedVolatility ** 2) / 2) * t) / volSqrtT;
  const d2 = d1 - volSqrtT;

  const annualTheta =
    -(spot * normalPdf(d1) * impliedVolatility) / (2 * Math.sqrt(t)) +
    RISK_FREE_RATE * strike * Math.exp(-RISK_FREE_RATE * t) * normalCdf(-d2);

  return annualTheta / DAYS_PER_YEAR;
};
