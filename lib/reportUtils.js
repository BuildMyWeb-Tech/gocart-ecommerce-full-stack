// lib/reportUtils.js
// ─────────────────────────────────────────────────────────────────────────────
// Shared utilities for the Sales Reporting System
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a { gte, lte } date range object from a period string or custom dates.
 *
 * ✅ TC-10 FIX: Instead of throwing an Error (which causes 500),
 * we return null so the caller can return a proper 400 response.
 */
export function buildDateRange(period, from, to) {
  const now = new Date();

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
      // ✅ TC-10 FIX: Return null instead of throwing — callers check for null
      // and return 400 Bad Request instead of letting it bubble as 500
      if (!from || !to) return null;
      const fromDate = new Date(from);
      const toDate = new Date(to);
      // Guard against invalid dates
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return null;
      return { gte: startOfDay(fromDate), lte: endOfDay(toDate) };
    }

    default:
      // Unknown period → default to today
      return { gte: startOfDay(now), lte: endOfDay(now) };
  }
}

/**
 * Build the previous-period range for comparison reports.
 * Returns { current, previous, labels } or null for unknown type.
 */
export function buildComparisonRanges(comparisonType) {
  const now = new Date();
  const startOfDay = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  switch (comparisonType) {
    case 'today_vs_yesterday': {
      const today = new Date(now);
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return {
        current: { gte: startOfDay(today), lte: endOfDay(today) },
        previous: { gte: startOfDay(yesterday), lte: endOfDay(yesterday) },
        labels: ['Today', 'Yesterday'],
      };
    }

    case 'month_vs_last_month': {
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        current: { gte: startOfDay(thisMonthStart), lte: endOfDay(now) },
        previous: { gte: startOfDay(lastMonthStart), lte: endOfDay(lastMonthEnd) },
        labels: ['This Month', 'Last Month'],
      };
    }

    case 'year_vs_last_year': {
      const thisYearStart = new Date(now.getFullYear(), 0, 1);
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
      const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
      return {
        current: { gte: startOfDay(thisYearStart), lte: endOfDay(now) },
        previous: { gte: startOfDay(lastYearStart), lte: endOfDay(lastYearEnd) },
        labels: ['This Year', 'Last Year'],
      };
    }

    default:
      return null;
  }
}

/**
 * Calculate percentage growth between two numbers.
 *
 * ✅ TC-13 FIX: Returns { growth, note } object instead of bare number.
 * - previous = 0, current > 0  → growth: 100, note: "No previous data"
 * - previous = 0, current = 0  → growth: 0,   note: "No previous data"
 * - normal case                → growth: X%,  note: null
 *
 * All callers updated to use .growth and .note fields.
 */
export function calcGrowth(current, previous) {
  if (previous === 0) {
    return {
      growth: current > 0 ? 100 : 0,
      note: 'No previous data',
    };
  }
  return {
    growth: Math.round(((current - previous) / previous) * 100 * 10) / 10,
    note: null,
  };
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
    result.push(map[key] || { date: key, label: fmtDay(cursor), revenue: 0, count: 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}
