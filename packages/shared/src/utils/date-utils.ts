/**
 * Date Utilities
 */

/**
 * Get the start of a day in a specific timezone
 */
export function startOfDay(date: Date, timezone: string = 'UTC'): Date {
  const d = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the end of a day in a specific timezone
 */
export function endOfDay(date: Date, timezone: string = 'UTC'): Date {
  const d = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add weeks to a date
 */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Get the difference in days between two dates
 */
export function diffInDays(date1: Date, date2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((date1.getTime() - date2.getTime()) / msPerDay);
}

/**
 * Get the difference in hours between two dates
 */
export function diffInHours(date1: Date, date2: Date): number {
  const msPerHour = 60 * 60 * 1000;
  return Math.round((date1.getTime() - date2.getTime()) / msPerHour);
}

/**
 * Get the difference in minutes between two dates
 */
export function diffInMinutes(date1: Date, date2: Date): number {
  const msPerMinute = 60 * 1000;
  return Math.round((date1.getTime() - date2.getTime()) / msPerMinute);
}

/**
 * Check if a date is in the past
 */
export function isPast(date: Date): boolean {
  return date < new Date();
}

/**
 * Check if a date is in the future
 */
export function isFuture(date: Date): boolean {
  return date > new Date();
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Get the day of week (0 = Sunday, 6 = Saturday)
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay();
}

/**
 * Check if a date is a weekend
 */
export function isWeekend(date: Date): boolean {
  const day = getDayOfWeek(date);
  return day === 0 || day === 6;
}

/**
 * Get the next occurrence of a specific day of week
 */
export function nextDayOfWeek(date: Date, targetDay: number): Date {
  const result = new Date(date);
  const currentDay = getDayOfWeek(result);
  const daysUntilTarget = (targetDay - currentDay + 7) % 7 || 7;
  result.setDate(result.getDate() + daysUntilTarget);
  return result;
}

/**
 * Format a date as ISO string (date only)
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format a time string (HH:MM)
 */
export function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

/**
 * Parse a time string (HH:MM) and apply to a date
 */
export function parseTime(date: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Get the age from a date of birth
 */
export function getAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Get the Australian school year level from date of birth
 * Assumes cutoff of July 31st
 */
export function getAustralianYearLevel(dateOfBirth: Date): string {
  const age = getAge(dateOfBirth);
  const currentMonth = new Date().getMonth();

  // Adjust for school year (starts late January in Australia)
  let effectiveAge = age;
  if (currentMonth < 7 && dateOfBirth.getMonth() >= 7) {
    effectiveAge--;
  }

  if (effectiveAge < 5) return 'Pre-school';
  if (effectiveAge === 5) return 'Kindergarten';
  if (effectiveAge <= 16) return `Year ${effectiveAge - 5}`;
  return 'Year 12+';
}

/**
 * Get the UK school year level from date of birth
 * Assumes September 1st cutoff
 */
export function getUKYearLevel(dateOfBirth: Date): string {
  const age = getAge(dateOfBirth);

  if (age < 5) return 'Reception';
  if (age <= 10) return `Year ${age - 4}`;
  if (age <= 15) return `Year ${age - 4}`;
  return 'Year 13+';
}

/**
 * Create a date range array
 */
export function dateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  let current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }
  return dates;
}

/**
 * Check if two date ranges overlap
 */
export function rangesOverlap(
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): boolean {
  return start1 < end2 && start2 < end1;
}
