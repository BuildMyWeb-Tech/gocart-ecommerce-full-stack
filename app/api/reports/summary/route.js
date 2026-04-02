// app/api/reports/summary/route.js
// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/summary
//
// ✅ TC-10 FIX: Returns 400 (not 500) when custom range missing from/to
// ✅ TC-13 FIX: Returns { growth, note } for zero-division comparison cases
// ─────────────────────────────────────────────────────────────────────────────
import prisma from '@/lib/prisma';
import authAdmin from '@/middlewares/authAdmin';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { buildDateRange, buildComparisonRanges, calcGrowth, round2 } from '@/lib/reportUtils';

async function resolveRole(request) {
  const { userId } = getAuth(request);
  if (!userId) return { userId: null, role: null, storeId: null };
  const isAdmin = await authAdmin(userId);
  if (isAdmin) return { userId, role: 'ADMIN', storeId: null };
  const storeId = await authSeller(userId);
  if (storeId) return { userId, role: 'STORE', storeId };
  return { userId, role: null, storeId: null };
}

export async function GET(request) {
  try {
    const { role, storeId: myStoreId } = await resolveRole(request);
    if (!role) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const filterStore = searchParams.get('storeId');
    const comparison = searchParams.get('comparison');

    // ✅ TC-10 FIX: buildDateRange returns null for invalid custom range
    const dateRange = buildDateRange(period, from, to);
    if (!dateRange) {
      return NextResponse.json(
        { error: 'Custom period requires valid "from" and "to" dates' },
        { status: 400 }
      );
    }

    // Store role always scoped to own store; admin can filter or see all
    const scopedStoreId = role === 'ADMIN' ? filterStore || undefined : myStoreId;

    const where = {
      createdAt: dateRange,
      ...(scopedStoreId ? { storeId: scopedStoreId } : {}),
    };

    // ── Current period aggregation ────────────────────────────────
    const agg = await prisma.sale.aggregate({
      where,
      _sum: { amount: true },
      _count: { id: true },
      _avg: { amount: true },
    });

    const revenue = round2(agg._sum.amount || 0);
    const orders = agg._count.id || 0;
    const aov = round2(agg._avg.amount || 0);

    // ── Top performing store (admin only) ─────────────────────────
    let topStore = null;
    if (role === 'ADMIN' && !filterStore) {
      const topStoreRaw = await prisma.sale.groupBy({
        by: ['storeId'],
        where: { createdAt: dateRange },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 1,
      });
      if (topStoreRaw.length > 0) {
        const storeData = await prisma.store.findUnique({
          where: { id: topStoreRaw[0].storeId },
          select: { id: true, name: true, logo: true, username: true },
        });
        topStore = {
          ...storeData,
          revenue: round2(topStoreRaw[0]._sum.amount || 0),
        };
      }
    }

    // ── Comparison report ─────────────────────────────────────────
    let comparisonData = null;
    if (comparison) {
      const ranges = buildComparisonRanges(comparison);
      if (ranges) {
        const storeFilter = scopedStoreId ? { storeId: scopedStoreId } : {};

        const [curr, prev] = await Promise.all([
          prisma.sale.aggregate({
            where: { createdAt: ranges.current, ...storeFilter },
            _sum: { amount: true },
            _count: { id: true },
          }),
          prisma.sale.aggregate({
            where: { createdAt: ranges.previous, ...storeFilter },
            _sum: { amount: true },
            _count: { id: true },
          }),
        ]);

        const currRev = round2(curr._sum.amount || 0);
        const prevRev = round2(prev._sum.amount || 0);
        const currOrds = curr._count.id || 0;
        const prevOrds = prev._count.id || 0;

        // ✅ TC-13 FIX: calcGrowth now returns { growth, note }
        // note = "No previous data" when previous period had 0 sales
        const revGrowth = calcGrowth(currRev, prevRev);
        const ordGrowth = calcGrowth(currOrds, prevOrds);

        comparisonData = {
          labels: ranges.labels,
          revenue: {
            current: currRev,
            previous: prevRev,
            growth: revGrowth.growth,
            note: revGrowth.note, // ✅ "No previous data" or null
          },
          orders: {
            current: currOrds,
            previous: prevOrds,
            growth: ordGrowth.growth,
            note: ordGrowth.note, // ✅ "No previous data" or null
          },
        };
      }
    }

    return NextResponse.json({
      summary: {
        revenue,
        orders,
        aov,
        topStore,
        period,
        dateRange: { from: dateRange.gte, to: dateRange.lte },
        comparison: comparisonData,
      },
    });
  } catch (error) {
    console.error('GET /api/reports/summary error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
