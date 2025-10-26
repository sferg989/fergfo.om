/**
 * Utility functions for time formatting and calculations
 */

/**
 * Get a human-readable relative time string
 */
export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return past.toLocaleDateString();
}

/**
 * Calculate price change between two values
 */
export function calculatePriceChange(current: number, previous: number): {
  change: number;
  changePercent: number;
} {
  const change = current - previous;
  const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
  
  return { change, changePercent };
}

/**
 * Format price change for display with proper styling class
 */
export function formatPriceChange(change: number, changePercent: number): {
  text: string;
  className: string;
} {
  const sign = change > 0 ? '+' : '';
  const text = `${sign}${change.toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  const className = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-600';
  
  return { text, className };
}