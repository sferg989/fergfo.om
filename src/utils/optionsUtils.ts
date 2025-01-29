import { ReturnCalculator } from './returnCalculator';

export const formatContractName = (contractName: string): string => {
  const year = contractName.slice(4, 6);
  const month = contractName.slice(6, 8);
  const day = contractName.slice(8, 10);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthStr = months[parseInt(month) - 1];

  return `${monthStr} ${parseInt(day)} '${year} P`;
};

export const getStrikeClass = (strike: number, currentPrice: number): string => {
  return strike < currentPrice ? 'in-the-money' : 'out-of-the-money';
};

export const calculateAnnualizedPremium = (option: OptionData, currentPrice: number): number => {
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

export const getPremiumClass = (option: OptionData, currentPrice: number): string => {
  const annualizedPremiumPct = calculateAnnualizedPremium(option, currentPrice);
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

    const expiryDate = formatContractName(option.contractName).split(' P')[0];
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