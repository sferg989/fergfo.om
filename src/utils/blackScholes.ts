/**
 * Yahoo returns implied volatility but no Greeks, so theta and delta are derived
 * here with Black-Scholes. Rates move slowly and only nudge the Greeks, so one is hard-coded.
 */
export const RISK_FREE_RATE = 0.04;
/**
 * Rate for pricing calls a year or more out, where it matters far more than for a five-week put:
 * about the 1-year Treasury yield (4.4% in November 2026). Half a point here moves a deep
 * in-the-money call's cost of holding by about 0.3% a year.
 */
export const CALL_RISK_FREE_RATE = 0.044;
const DAYS_PER_YEAR = 365;

const normalPdf = (x: number): number => Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);

/** Abramowitz & Stegun 7.1.26 erf approximation, accurate to ~1.5e-7 */
const normalCdf = (x: number): number => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const tail = normalPdf(x) * poly;
  return x >= 0 ? 1 - tail : tail;
};

interface BsTerms {
  t: number;
  d1: number;
  d2: number;
}

/** Shared Black-Scholes terms; undefined when any input makes the model undefined */
const bsTerms = (
  spot: number,
  strike: number,
  daysToExpiry: number,
  impliedVolatility: number,
  dividendYield = 0,
  rate = RISK_FREE_RATE
): BsTerms | undefined => {
  if (spot <= 0 || strike <= 0 || daysToExpiry <= 0 || impliedVolatility <= 0) return undefined;

  const t = daysToExpiry / DAYS_PER_YEAR;
  const volSqrtT = impliedVolatility * Math.sqrt(t);
  const d1 = (Math.log(spot / strike) + (rate - dividendYield + (impliedVolatility ** 2) / 2) * t) / volSqrtT;
  return { t, d1, d2: d1 - volSqrtT };
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
  const terms = bsTerms(spot, strike, daysToExpiry, impliedVolatility);
  if (!terms) return undefined;
  const { t, d1, d2 } = terms;

  const annualTheta =
    -(spot * normalPdf(d1) * impliedVolatility) / (2 * Math.sqrt(t)) +
    RISK_FREE_RATE * strike * Math.exp(-RISK_FREE_RATE * t) * normalCdf(-d2);

  return annualTheta / DAYS_PER_YEAR;
};

/**
 * Delta of a European put, in [-1, 0]. Its magnitude is the usual put-seller
 * proxy for the probability of finishing in the money.
 */
export const putDelta = (
  spot: number,
  strike: number,
  daysToExpiry: number,
  impliedVolatility: number
): number | undefined => {
  const terms = bsTerms(spot, strike, daysToExpiry, impliedVolatility);
  if (!terms) return undefined;
  return normalCdf(terms.d1) - 1;
};

/**
 * Risk-neutral expected intrinsic value of a put at expiry, E[max(K - S_T, 0)], per share.
 * Undiscounted, since the premium is received up front and the loss lands at expiry.
 * Evaluated at `volatility`, which need not be the option's own implied volatility:
 * at the option's IV this equals its fair price and says nothing about edge.
 */
export const putExpectedAssignmentLoss = (
  spot: number,
  strike: number,
  daysToExpiry: number,
  volatility: number
): number | undefined => {
  const terms = bsTerms(spot, strike, daysToExpiry, volatility);
  if (!terms) return undefined;
  const { t, d1, d2 } = terms;
  return strike * normalCdf(-d2) - spot * Math.exp(RISK_FREE_RATE * t) * normalCdf(-d1);
};

/**
 * Fair price of a European call, per share, with a continuous dividend yield. Early exercise is
 * ignored: for the low-yield names tracked here it adds little to a call.
 */
export const callPrice = (
  spot: number,
  strike: number,
  daysToExpiry: number,
  volatility: number,
  dividendYield = 0,
  rate = RISK_FREE_RATE
): number | undefined => {
  const terms = bsTerms(spot, strike, daysToExpiry, volatility, dividendYield, rate);
  if (!terms) return undefined;
  const { t, d1, d2 } = terms;
  return spot * Math.exp(-dividendYield * t) * normalCdf(d1) - strike * Math.exp(-rate * t) * normalCdf(d2);
};

/** Delta of a European call, in [0, 1]: shares of stock exposure per share of the contract */
export const callDelta = (
  spot: number,
  strike: number,
  daysToExpiry: number,
  volatility: number,
  dividendYield = 0,
  rate = RISK_FREE_RATE
): number | undefined => {
  const terms = bsTerms(spot, strike, daysToExpiry, volatility, dividendYield, rate);
  if (!terms) return undefined;
  return Math.exp(-dividendYield * terms.t) * normalCdf(terms.d1);
};

const IMPLIED_VOL_MIN = 0.01;
const IMPLIED_VOL_MAX = 5;
const IMPLIED_VOL_ITERATIONS = 60;

/**
 * Volatility at which callPrice returns `price`, by bisection. Undefined when no volatility in
 * [1%, 500%] produces it, which is how a quote below intrinsic value shows up.
 */
export const impliedVolFromCallPrice = (
  price: number,
  spot: number,
  strike: number,
  daysToExpiry: number,
  dividendYield = 0,
  rate = RISK_FREE_RATE
): number | undefined => {
  const priceAt = (vol: number) => callPrice(spot, strike, daysToExpiry, vol, dividendYield, rate);
  const floor = priceAt(IMPLIED_VOL_MIN);
  const ceiling = priceAt(IMPLIED_VOL_MAX);
  if (floor === undefined || ceiling === undefined || price <= floor || price >= ceiling) return undefined;

  let low = IMPLIED_VOL_MIN;
  let high = IMPLIED_VOL_MAX;
  for (let i = 0; i < IMPLIED_VOL_ITERATIONS; i++) {
    const mid = (low + high) / 2;
    if (priceAt(mid)! > price) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
};
