/** One long-dated call as quoted by Yahoo, before any checks */
export interface CallQuote {
  contractName: string;
  strike: number;
  expirationDate: string;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
}

/** A call quote that passed the quote gates */
export interface GatedCall extends CallQuote {
  /** Solved from the bid-ask midpoint; Yahoo's own figure is unreliable on thin contracts */
  impliedVol: number;
  /** At the forecast volatility */
  delta: number;
}

export type CallVerdict = 'Cheap' | 'In range' | 'Rich';

/** What a call is worth against what it costs, per share */
export interface CallScore {
  /** Black-Scholes at the forecast volatility */
  fairValue: number;
  /** Fair value with the forecast volatility lowered and raised by its typical error */
  fairLow: number;
  fairHigh: number;
  /** Excess cost of holding, as a fraction of stock exposure per year (0.021 = 2.1%) */
  excessCost: number;
  /** 0 to 100, unrounded */
  score: number;
  verdict: CallVerdict;
}

/** One scored call on one day, as stored and as shown on /calls */
export interface CallQuoteRow extends GatedCall, CallScore {
  symbol: string;
  /** Eastern calendar day of the refresh, YYYY-MM-DD */
  day: string;
  spot: number;
  /** Fraction per year */
  dividendYield: number;
  forecastVol: number;
  scorerVersion: string;
}

export type CallRefreshStatus = 'ok' | 'provider_error' | 'failed';

/** How one symbol's call refresh went on one day */
export interface CallRefreshLogRow {
  symbol: string;
  day: string;
  attempts: number;
  status: CallRefreshStatus;
  error: string | null;
  /** Contracts stored */
  scored: number;
  /** In-band contracts rejected by the quote gates */
  dropped: number;
  fetchedAt: string;
}
