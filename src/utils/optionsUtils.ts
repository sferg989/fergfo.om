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

export const calculateAnnualizedPremium = (option: OptionData): number => {
  const daysToExpiry = Math.ceil(
    (new Date(option.expirationDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  return (option.bid / option.strike) * (365 / daysToExpiry) * 100;
};

export const getPremiumClass = (option: OptionData, currentPrice: number): string => {
  const annualizedPremiumPct = calculateAnnualizedPremium(option);

  // Thresholds for premium classification
  if (annualizedPremiumPct >= 15) {
    return 'premium-high';
  } else if (annualizedPremiumPct >= 8) {
    return 'premium-medium';
  }
  return 'premium-low';
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