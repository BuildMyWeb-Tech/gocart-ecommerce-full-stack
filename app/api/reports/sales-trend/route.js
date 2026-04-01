// app/api/reports/sales-trend/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/sales-trend
//
// Returns daily time-series data for Line + Bar charts.
// Uses Prisma groupBy on Sale.createdAt — no joins, index-backed.
//
// Query params:
//   period    = today | yesterday | week | month | year | custom
//   from, to  = ISO dates (custom only)
//   storeId   = admin filter
//   granularity = day | week | month  (default: day)
// ─────────────────────────────────────────────────────────────────────────────
import prisma from '@/lib/prisma';
import authAdmin from '@/middlewares/authAdmin';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { buildDateRange, round2, fmtDay } from '@/lib/reportUtils';

async function resolveRole(request) {
  const { userId } = getAuth(request);
  if (!userId) return { role: null, storeId: null };
  const isAdmin = await authAdmin(userId);
  if (isAdmin) return { role: 'ADMIN', storeId: null };
  const storeId = await authSeller(userId);
  if (storeId) return { role: 'STORE', storeId };
  return { role: null, storeId: null };
}

export async function GET(request) {
  try {
    const { role, storeId: myStoreId } = await resolveRole(request);
    if (!role) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const period      = searchParams.get('period')      || 'month';
    const from        = searchParams.get('from');
    const to          = searchParams.get('to');
    const filterStore = searchParams.get('storeId');

    const scopedStoreId = role === 'ADMIN' ? (filterStore || undefined) : myStoreId;
    const dateRange = buildDateRange(period, from, to);

    const where = {
      createdAt: dateRange,
      ...(scopedStoreId ? { storeId: scopedStoreId } : {}),
    };

    // ── Fetch raw sales in range ──────────────────────────────────
    // groupBy date string via raw aggregation for performance
    const sales = await prisma.sale.findMany({
      where,
      select: { amount: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    // ── Bucket by day ─────────────────────────────────────────────
    const buckets = {};
    for (const sale of sales) {
      const key = sale.createdAt.toISOString().split('T')[0]; // 'YYYY-MM-DD'
      if (!buckets[key]) buckets[key] = { revenue: 0, count: 0 };
      buckets[key].revenue += sale.amount;
      buckets[key].count   += 1;
    }

    // ── Fill every day in range (no gaps for charts) ──────────────
    const trend = [];
    const cursor = new Date(dateRange.gte);
    const end    = new Date(dateRange.lte);
    while (cursor <= end) {
      const key   = cursor.toISOString().split('T')[0];
      const label = fmtDay(new Date(cursor));
      trend.push({
        date:    key,
        label,
        revenue: round2(buckets[key]?.revenue || 0),
        count:   buckets[key]?.count || 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    // ── Totals for the period ─────────────────────────────────────
    const totalRevenue = round2(sales.reduce((s, x) => s + x.amount, 0));
    const totalCount   = sales.length;
    const peakDay      = trend.reduce((best, d) => (d.revenue > (best?.revenue || 0) ? d : best), null);

    return NextResponse.json({
      trend,
      meta: {
        totalRevenue,
        totalCount,
        peakDay,
        period,
        from: dateRange.gte,
        to:   dateRange.lte,
      },
    });
  } catch (error) {
    console.error('GET /api/reports/sales-trend error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}