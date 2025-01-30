import { ReturnCalculator } from './returnCalculator';

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
  console.log('options', options);
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

export interface GroupedOption {
  expiryDate: string;
  rawExpiryDate: string;
  daysToExpiry: number;
  options: OptionData[];
}

export interface OptionData {
  contractName: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  openInterest: number;
  expirationDate: string;
  impliedVolatility: number;
  delta?: number;
  gamma?: number;
  theta?: number;
}

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