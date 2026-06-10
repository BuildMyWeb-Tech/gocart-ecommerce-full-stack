// app/api/admin/dashboard/route.js
import prisma from '@/lib/prisma';
import authAdmin from '@/middlewares/authAdmin';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { round2, EXCLUDED_STATUSES } from '@/lib/reportUtils';

// GET /api/admin/dashboard
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const isAdminUser = await authAdmin(userId);
    if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      totalStores,
      activeStores,
      pendingStores,
      totalProducts,
      totalCustomers,

      // Revenue aggregation
      revenueAgg,
      todayRevenueAgg,

      // Order status counts
      pendingOrders,
      confirmedOrders,
      packedOrders,
      shippedOrders,
      outForDeliveryOrders,
      deliveredOrders,
      cancelledOrders,
      returnedOrders,

      // Top stores by revenue (this month)
      topStoresRaw,

      // Recent orders
      recentOrders,

      // Low stock alert
      lowStockVariants,

      // Daily revenue last 30 days
      last30DaysOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.store.count(),
      prisma.store.count({ where: { status: 'ACTIVE', isActive: true } }),
      prisma.store.count({ where: { status: 'PENDING' } }),
      prisma.product.count(),
      prisma.user.count({ where: { store: null } }),

      // All time revenue
      prisma.order.aggregate({
        where: { status: { notIn: EXCLUDED_STATUSES } },
        _sum: { total: true, commissionAmt: true },
      }),

      // Today's revenue
      prisma.order.aggregate({
        where: {
          createdAt: { gte: todayStart },
          status: { notIn: EXCLUDED_STATUSES },
        },
        _sum: { total: true, commissionAmt: true },
        _count: { id: true },
      }),

      // Order status counts
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.order.count({ where: { status: 'CONFIRMED' } }),
      prisma.order.count({ where: { status: 'PACKED' } }),
      prisma.order.count({ where: { status: 'SHIPPED' } }),
      prisma.order.count({ where: { status: 'OUT_FOR_DELIVERY' } }),
      prisma.order.count({ where: { status: 'DELIVERED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.count({ where: { status: 'RETURNED' } }),

      // Top 5 stores this month
      prisma.order.groupBy({
        by: ['storeId'],
        where: {
          status: { notIn: EXCLUDED_STATUSES },
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { total: true, commissionAmt: true },
        _count: { id: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),

      // Recent 10 orders
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user:  { select: { name: true, email: true } },
          store: { select: { name: true, username: true } },
        },
      }),

      // Low stock: variants with stock <= 5
      prisma.productVariant.findMany({
        where: { stock: { lte: 5 } },
        include: {
          product: {
            select: {
              id: true, name: true,
              store: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { stock: 'asc' },
        take: 20,
      }),

      // Last 30 days orders for chart
      prisma.order.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
          status: { notIn: EXCLUDED_STATUSES },
        },
        select: { total: true, commissionAmt: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Hydrate top stores
    const topStoreIds = topStoresRaw.map((g) => g.storeId);
    const topStoreDetails = await prisma.store.findMany({
      where: { id: { in: topStoreIds } },
      select: { id: true, name: true, logo: true, username: true },
    });
    const storeDetailMap = Object.fromEntries(topStoreDetails.map((s) => [s.id, s]));

    const topStores = topStoresRaw.map((g, idx) => {
      const s = storeDetailMap[g.storeId] || {};
      return {
        rank: idx + 1,
        storeId: g.storeId,
        name: s.name || 'Unknown',
        logo: s.logo || null,
        username: s.username || '',
        revenue: round2(g._sum.total || 0),
        commission: round2(g._sum.commissionAmt || 0),
        orders: g._count.id,
      };
    });

    // Build daily chart data
    const buckets = {};
    for (const o of last30DaysOrders) {
      const key = o.createdAt.toISOString().split('T')[0];
      if (!buckets[key]) buckets[key] = { revenue: 0, commission: 0, count: 0 };
      buckets[key].revenue    += o.total;
      buckets[key].commission += o.commissionAmt;
      buckets[key].count      += 1;
    }
    const dailyData = Object.entries(buckets).map(([date, data]) => ({
      date,
      revenue:    round2(data.revenue),
      commission: round2(data.commission),
      count:      data.count,
    }));

    const totalRevenue    = round2(revenueAgg._sum.total || 0);
    const totalCommission = round2(revenueAgg._sum.commissionAmt || 0);

    return NextResponse.json({
      dashboardData: {
        // Counts
        totalOrders,
        totalStores,
        activeStores,
        pendingStores,
        totalProducts,
        totalCustomers,

        // Revenue
        totalRevenue,
        totalCommission,
        platformRevenue: totalCommission,
        storeRevenue: round2(totalRevenue - totalCommission),

        // Today
        todayOrders:    todayRevenueAgg._count.id || 0,
        todayRevenue:   round2(todayRevenueAgg._sum.total || 0),
        todayCommission: round2(todayRevenueAgg._sum.commissionAmt || 0),

        // Order pipeline
        orderStatus: {
          pending:         pendingOrders,
          confirmed:       confirmedOrders,
          packed:          packedOrders,
          shipped:         shippedOrders,
          outForDelivery:  outForDeliveryOrders,
          delivered:       deliveredOrders,
          cancelled:       cancelledOrders,
          returned:        returnedOrders,
        },

        topStores,
        recentOrders,
        dailyData,

        // Low stock alerts
        lowStockAlerts: lowStockVariants.map((v) => ({
          variantId:   v.id,
          color:       v.color,
          size:        v.size,
          sku:         v.sku,
          stock:       v.stock,
          productId:   v.productId,
          productName: v.product.name,
          storeName:   v.product.store?.name || '',
          storeId:     v.product.store?.id || '',
        })),
      },
    });
  } catch (error) {
    console.error('GET /api/admin/dashboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}