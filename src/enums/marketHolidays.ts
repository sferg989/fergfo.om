/**
 * US Stock Market Holidays
 * Markets are closed on these dates
 * Source: NYSE Holiday Schedule
 */

/**
 * Market holidays for 2025
 */
export const MARKET_HOLIDAYS_2025 = [
  '2025-01-01', // New Year's Day
  '2025-01-20', // Martin Luther King Jr. Day
  '2025-02-17', // Presidents' Day
  '2025-04-18', // Good Friday
  '2025-05-26', // Memorial Day
  '2025-06-19', // Juneteenth
  '2025-07-04', // Independence Day
  '2025-09-01', // Labor Day
  '2025-11-27', // Thanksgiving Day
  '2025-12-25'  // Christmas Day
];

/**
 * Market holidays for 2026
 */
export const MARKET_HOLIDAYS_2026 = [
  '2026-01-01', // New Year's Day
  '2026-01-19', // Martin Luther King Jr. Day
  '2026-02-16', // Presidents' Day
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day
  '2026-06-19', // Juneteenth
  '2026-07-03', // Independence Day (observed - July 4th is Saturday)
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving Day
  '2026-12-25'  // Christmas Day
];

/**
 * All market holidays
 */
export const ALL_MARKET_HOLIDAYS = [
  ...MARKET_HOLIDAYS_2025,
  ...MARKET_HOLIDAYS_2026
];
