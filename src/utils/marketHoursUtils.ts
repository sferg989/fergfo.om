import { ALL_MARKET_HOLIDAYS } from '../enums/marketHolidays';

/**
 * DST (Daylight Saving Time) transition dates
 * DST starts: Second Sunday in March at 2:00 AM
 * DST ends: First Sunday in November at 2:00 AM
 */
interface DSTTransition {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

const DST_TRANSITIONS: { [year: number]: DSTTransition } = {
  2025: {
    start: '2025-03-09', // Second Sunday in March
    end: '2025-11-02'    // First Sunday in November
  },
  2026: {
    start: '2026-03-08',
    end: '2026-11-01'
  },
  2027: {
    start: '2027-03-14',
    end: '2027-11-07'
  }
};

/**
 * Determine if a date falls within DST (Eastern Daylight Time)
 * Returns true if EDT (UTC-4), false if EST (UTC-5)
 */
export function isDaylightSavingTime(date: Date): boolean {
  const year = date.getFullYear();
  const transition = DST_TRANSITIONS[year];

  if (!transition) {
    // If year not in our table, use a simple heuristic:
    // DST typically runs from mid-March to early November
    const month = date.getMonth(); // 0-11
    return month >= 2 && month < 10; // March through October
  }

  const dateString = date.toISOString().split('T')[0];
  return dateString >= transition.start && dateString < transition.end;
}

/**
 * Check if a given date is a US stock market holiday
 */
export function isMarketHoliday(date: Date): boolean {
  const dateString = date.toISOString().split('T')[0];
  return ALL_MARKET_HOLIDAYS.includes(dateString);
}

/**
 * Get Eastern Time components from a UTC date
 * Returns the date/time as it would appear in Eastern Time
 */
export function getEasternTimeComponents(date: Date): {
  day: number;
  hour: number;
  minute: number;
  dateString: string
} {
  const isDST = isDaylightSavingTime(date);
  const offsetHours = isDST ? 4 : 5; // EDT is UTC-4, EST is UTC-5

  // Get UTC components
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  const utcDay = date.getUTCDay();
  const utcDate = date.getUTCDate();

  // Calculate ET hours (can be negative or > 24, we'll adjust)
  let etHours = utcHours - offsetHours;
  let etDay = utcDay;
  let etDate = utcDate;

  // Adjust for day boundary crossing
  if (etHours < 0) {
    etHours += 24;
    etDay = (etDay - 1 + 7) % 7; // Wrap around for day of week
    etDate -= 1; // Previous calendar date
  } else if (etHours >= 24) {
    etHours -= 24;
    etDay = (etDay + 1) % 7; // Wrap around for day of week
    etDate += 1; // Next calendar date
  }

  // Create date string for holiday checking
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const adjustedDate = new Date(Date.UTC(year, month, etDate));
  const dateString = adjustedDate.toISOString().split('T')[0];

  return {
    day: etDay,
    hour: etHours,
    minute: utcMinutes,
    dateString
  };
}

/**
 * Convert current time to Eastern Time (ET)
 * @deprecated Use getEasternTimeComponents instead for accurate time zone handling
 */
export function toEasternTime(date: Date): Date {
  const isDST = isDaylightSavingTime(date);
  const offsetHours = isDST ? 4 : 5; // EDT is UTC-4, EST is UTC-5
  return new Date(date.getTime() - (offsetHours * 60 * 60 * 1000));
}

/**
 * Check if it's during market hours (9:30 AM - 4:00 PM ET, Monday-Friday, excluding holidays)
 */
export function isMarketHours(date: Date = new Date()): boolean {
  // Get Eastern Time components
  const et = getEasternTimeComponents(date);

  // Check if it's a market holiday (using ET date)
  if (ALL_MARKET_HOLIDAYS.includes(et.dateString)) {
    return false;
  }

  // Check if it's Monday (1) through Friday (5)
  if (et.day < 1 || et.day > 5) {
    return false;
  }

  // Check if it's between 9:30 AM and 4:00 PM ET
  const currentTimeMinutes = et.hour * 60 + et.minute;
  const marketOpenMinutes = 9 * 60 + 30; // 9:30 AM
  const marketCloseMinutes = 16 * 60; // 4:00 PM

  return currentTimeMinutes >= marketOpenMinutes && currentTimeMinutes < marketCloseMinutes;
}
