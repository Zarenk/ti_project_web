import { isPeruvianHoliday } from './peruvian-holidays';

/**
 * Checks if a date is a business day (not weekend, not Peruvian holiday).
 */
export function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  if (day === 0 || day === 6) return false; // Sunday or Saturday
  return !isPeruvianHoliday(date);
}

/**
 * Adds N business days to a start date.
 * Used to calculate the 15-business-day deadline per DS 101-2022-PCM.
 */
export function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let added = 0;

  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (isBusinessDay(result)) {
      added++;
    }
  }

  return result;
}

/**
 * Counts business days between two dates (exclusive of start, inclusive of end).
 */
export function countBusinessDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;

  const current = new Date(start);
  while (current < end) {
    current.setDate(current.getDate() + 1);
    if (isBusinessDay(current)) {
      count++;
    }
  }

  return count;
}

/**
 * Calculates remaining business days from today until the deadline.
 * Returns negative if past deadline.
 */
export function getRemainingBusinessDays(deadlineDate: Date): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const deadline = new Date(deadlineDate);
  deadline.setHours(0, 0, 0, 0);

  if (today >= deadline) {
    // Past deadline: return negative count
    return -countBusinessDays(deadline, today);
  }

  return countBusinessDays(today, deadline);
}
