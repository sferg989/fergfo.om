import { ReturnCalculator } from './returnCalculator';
import { putDelta } from './blackScholes';
import type { OptionData, GroupedOption } from '../types/option';
import { DTE_ZERO_UPPER } from './optionScorer';

/**
 * Put delta band kept in the table. The 5-delta floor drops untradeable lottery tickets;
 * the 50-delta ceiling stops at the money. Delta, unlike a fixed % of spot, tracks the
 * strike a seller actually wants whatever the IV (20-delta sits >10% below spot at IV >= 0.6).
 */
export const MIN_PUT_DELTA = 0.05;
export const MAX_PUT_DELTA = 0.5;
/** Fallback strike range (fraction of spot) when delta can't be computed (missing/zero IV) */
const FALLBACK_STRIKE_RANGE = 0.1;

/** Ticker shape: 1-5 letters with an optional share-class suffix (BRK.B, BF-B). Keeps junk like `1'--` out of tracking. */
export const isValidSymbol = (symbol: string): boolean => /^[A-Z]{1,5}([.-][A-Z]{1,2})?$/.test(symbol.toUpperCase());

export const formatContractName = (contractName: string): string => {
  // Ensure the contract name is in the expected format (e.g., 'NET250131P00135000' or 'AAPL250131P00320000')
  if (!contractName || contractName.length < 15) {
    return 'Invalid Contract';
  }

  try {
    // Find the position of 'P' to determine where the date part starts
    const pPosition = contractName.indexOf('P');
    if (pPosition === -1) {
      throw new Error('Invalid contract format');
    }

    // Extract date components - date part starts 6 characters before 'P'
    const datePart = contractName.substring(pPosition - 6, pPosition);
    const year = datePart.slice(0, 2);
    const month = datePart.slice(2, 4);
    const day = datePart.slice(4, 6);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthStr = months[parseInt(month, 10) - 1];

    if (!monthStr) {
      throw new Error('Invalid month');
    }

    return `${monthStr} ${parseInt(day, 10)} '${year}`;
  } catch (error) {
    console.error('Error formatting contract name:', error, 'for contract:', contractName);
    return 'Invalid Contract';
  }
};

export const getStrikeClass = (strike: number, currentPrice: number): string => {
  return strike < currentPrice ? 'in-the-money' : 'out-of-the-money';
};

export const calculateAnnualizedPremium = (option: OptionData): number => {
  const daysToExpiry = Math.ceil(
    (new Date(option.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return ReturnCalculator.calculateAnnualizedReturn({
    premium: option.bid,
    strike: option.strike,
    daysToExpiry,
    marginRate: 0.20
  });
};

export const getPremiumClass = (option: OptionData): string => {
  const annualizedPremiumPct = calculateAnnualizedPremium(option);
  return ReturnCalculator.getReturnClass(annualizedPremiumPct);
};

export const calculateSimpleReturn = (option: OptionData): number => {
  return ReturnCalculator.calculateSimpleReturn({
    premium: option.bid,
    strike: option.strike,
    marginRate: 0.20
  });
};

export const groupOptionsByExpiry = (options: OptionData[]) => {
  
  const groups = options.reduce((acc, option) => {
    const date = new Date(option.expirationDate);
    const today = new Date();
    const daysToExpiry = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const expiryDate = formatContractName(option.contractName);
    const key = option.expirationDate;

    if (!acc[key]) {
      acc[key] = {
        expiryDate,
        rawExpiryDate: option.expirationDate,
        daysToExpiry,
        options: []
      };
    }
    acc[key].options.push(option);
    return acc;
  }, {} as Record<string, GroupedOption>);

  return Object.values(groups).sort((a, b) =>
    new Date(a.rawExpiryDate).getTime() - new Date(b.rawExpiryDate).getTime()
  );
};

export const getThetaClass = (theta: number | undefined): string => {
  if (!theta) return '';
  
  // From a seller's perspective:
  // More negative theta is better (faster time decay)
  if (theta <= -0.03) return 'theta-excellent';     // Very favorable decay
  if (theta <= -0.02) return 'theta-good';          // Good decay
  if (theta <= -0.01) return 'theta-moderate';      // Moderate decay
  if (theta < 0) return 'theta-weak';               // Weak decay
  return 'theta-unfavorable';                       // No decay or positive theta
};

/** True when the put's |delta| lies within [MIN_PUT_DELTA, MAX_PUT_DELTA], or within the fallback range of spot when delta is unavailable */
export const isStrikeInDeltaBand = (currentPrice: number, strike: number, dte: number, iv: number | undefined): boolean => {
  const delta = putDelta(currentPrice, strike, dte, iv ?? 0);
  if (delta === undefined) {
    return Math.abs(strike - currentPrice) <= currentPrice * FALLBACK_STRIKE_RANGE;
  }
  const magnitude = Math.abs(delta);
  return magnitude >= MIN_PUT_DELTA && magnitude <= MAX_PUT_DELTA;
};

/** True when the expiration still has a chance of a non-zero DTE score, so it is worth fetching and storing */
export const isExpirationScorable = (expirationDate: Date, now = Date.now()): boolean => {
  const dte = (expirationDate.getTime() - now) / (24 * 60 * 60 * 1000);
  return dte > 0 && dte < DTE_ZERO_UPPER;
};
