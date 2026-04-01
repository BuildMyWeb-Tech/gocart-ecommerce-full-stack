// lib/reportUtils.js
// ─────────────────────────────────────────────────────────────────────────────
// Shared utilities for the Sales Reporting System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a { gte, lte } date range object from a period string or custom dates.
 * All times are anchored to UTC midnight so PostgreSQL index scans are tight.
 *
 * @param {string} period  'today'|'yesterday'|'week'|'month'|'year'|'custom'
 * @param {string} [from]  ISO date string  (required when period='custom')
 * @param {string} [to]    ISO date string  (required when period='custom')
 * @param {string} [tz]    IANA timezone string, e.g. 'Asia/Kolkata' (optional)
 */
export function buildDateRange(period, from, to, tz = 'Asia/Kolkata') {
  const now = new Date();

  // Helper: start of a calendar day in given timezone → UTC Date
  const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  };
  const endOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  switch (period) {
    case 'today':
      return { gte: startOfDay(now), lte: endOfDay(now) };

    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { gte: startOfDay(y), lte: endOfDay(y) };
    }

    case 'week': {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Sunday
      return { gte: startOfDay(weekStart), lte: endOfDay(now) };
    }

    case 'month': {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { gte: startOfDay(monthStart), lte: endOfDay(now) };
    }

    case 'year': {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return { gte: startOfDay(yearStart), lte: endOfDay(now) };
    }

    case 'custom': {
      if (!from || !to) throw new Error('from and to are required for custom range');
      return { gte: startOfDay(new Date(from)), lte: endOfDay(new Date(to)) };
    }

    default:
      return { gte: startOfDay(now), lte: endOfDay(now) };
  }
}

/**
 * Build the previous-period range for comparison reports.
 * Returns { current, previous } date ranges.
 */
export function buildComparisonRanges(comparisonType) {
  const now = new Date();
  const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
  const endOfDay   = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };

  switch (comparisonType) {
    case 'today_vs_yesterday': {
      const today = new Date(now);
      const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
      return {
        current:  { gte: startOfDay(today),     lte: endOfDay(today) },
        previous: { gte: startOfDay(yesterday),  lte: endOfDay(yesterday) },
        labels: ['Today', 'Yesterday'],
      };
    }
    case 'month_vs_last_month': {
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        current:  { gte: startOfDay(thisMonthStart), lte: endOfDay(now) },
        previous: { gte: startOfDay(lastMonthStart),  lte: endOfDay(lastMonthEnd) },
        labels: ['This Month', 'Last Month'],
      };
    }
    case 'year_vs_last_year': {
      const thisYearStart = new Date(now.getFullYear(), 0, 1);
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const lastYearEnd   = new Date(now.getFullYear() - 1, 11, 31);
      return {
        current:  { gte: startOfDay(thisYearStart), lte: endOfDay(now) },
        previous: { gte: startOfDay(lastYearStart),  lte: endOfDay(lastYearEnd) },
        labels: ['This Year', 'Last Year'],
      };
    }
    default:
      return null;
  }
}

/** Calculate percentage growth between two numbers. Returns null if previous = 0. */
export function calcGrowth(current, previous) {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

/** Round float to 2 decimal places */
export const round2 = (n) => Math.round(n * 100) / 100;

/** Format a Date → 'MMM D' label for charts */
export function fmtDay(date) {
  return new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

/** Fill gaps in daily data so charts are continuous */
export function fillDailyGaps(data, dateRange) {
  const map = Object.fromEntries(data.map((d) => [d.date, d]));
  const result = [];
  const cursor = new Date(dateRange.gte);
  const end = new Date(dateRange.lte);
  while (cursor <= end) {
    const key = cursor.toISOString().split('T')[0];
    result.push(
      map[key] || { date: key, label: fmtDay(cursor), revenue: 0, count: 0 }
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}