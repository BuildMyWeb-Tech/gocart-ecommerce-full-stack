// C:\Users\Siddharathan\Desktop\gocart-ecommerce-full-stack\app\api\store\dashboard\route.js
import prisma from '@/lib/prisma';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const storeId = await authSeller(userId);

    if (!storeId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    // ── Parallel queries for performance ─────────────────────────
    const [products, orders, ratings, categories] = await Promise.all([
      prisma.product.findMany({ where: { storeId }, select: { id: true } }),

      prisma.order.findMany({
        where: { storeId },
        select: {
          id: true,
          total: true,
          status: true,
          isPaid: true,
          createdAt: true,
          userId: true,
        },
      }),

      prisma.rating.findMany({
        where: { product: { storeId } },
        select: {
          id: true,
          rating: true,
          review: true,
          createdAt: true,
          user: { select: { name: true, image: true } },
          product: { select: { id: true, name: true, category: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),

      prisma.category.findMany({ select: { id: true } }),
    ]);

    // ── Order status counts ───────────────────────────────────────
    const statusCounts = orders.reduce(
      (acc, o) => {
        const s = o.status;
        if (s === 'ORDER_PLACED') acc.pending++;
        else if (s === 'PROCESSING') acc.processing++;
        else if (s === 'SHIPPED') acc.shipped++;
        else if (s === 'DELIVERED') acc.delivered++;
        else if (s === 'CANCELLED') acc.cancelled++;
        return acc;
      },
      { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 }
    );

    // ── Revenue = sum of all paid delivered orders ────────────────
    const revenue = orders
      .filter((o) => o.status === 'DELIVERED' && o.isPaid)
      .reduce((sum, o) => sum + o.total, 0);

    // ── Total earnings (all orders regardless of status) ─────────
    const totalEarnings = orders.reduce((sum, o) => sum + o.total, 0);

    // ── Unique customers ──────────────────────────────────────────
    const uniqueCustomers = new Set(orders.map((o) => o.userId)).size;

    // ── Revenue over last 30 days (daily) ────────────────────────
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenueByDay = {};
    const ordersByDay = {};

    orders.forEach((o) => {
      const date = new Date(o.createdAt);
      if (date >= thirtyDaysAgo) {
        const key = date.toISOString().split('T')[0];
        revenueByDay[key] = (revenueByDay[key] || 0) + o.total;
        ordersByDay[key] = (ordersByDay[key] || 0) + 1;
      }
    });

    // Fill missing days with 0 so chart is continuous
    const dailyData = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      dailyData.push({
        date: label,
        revenue: Math.round((revenueByDay[key] || 0) * 100) / 100,
        orders: ordersByDay[key] || 0,
      });
    }

    return NextResponse.json({
      dashboardData: {
        // Summary counts
        totalProducts: products.length,
        totalOrders: orders.length,
        totalCategories: categories.length,
        totalCustomers: uniqueCustomers,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,

        // Order status breakdown
        pending: statusCounts.pending,
        processing: statusCounts.processing,
        shipped: statusCounts.shipped,
        delivered: statusCounts.delivered,
        cancelled: statusCounts.cancelled,

        // Charts data
        dailyData, // for Line chart (revenue) and Bar chart (orders)

        // Reviews
        ratings,
      },
    });
  } catch (error) {
    console.error('GET /api/store/dashboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
