// app/api/store/dashboard/route.js
import prisma from '@/lib/prisma';
import authSeller from '@/middlewares/authSeller';
import { verifyEmployeeToken } from '@/middlewares/authEmployee';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    let storeId = null;

    // ── Check employee JWT first ───────────────────────────────
    const employee = verifyEmployeeToken(request);
    if (employee?.storeId) {
      storeId = employee.storeId;
    }

    // ── Fall back to Clerk ─────────────────────────────────────
    if (!storeId) {
      const { userId } = getAuth(request);
      storeId = await authSeller(userId);
    }

    if (!storeId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

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

    const statusCounts = orders.reduce(
      (acc, o) => {
        if (o.status === 'ORDER_PLACED') acc.pending++;
        else if (o.status === 'PROCESSING') acc.processing++;
        else if (o.status === 'SHIPPED') acc.shipped++;
        else if (o.status === 'DELIVERED') acc.delivered++;
        else if (o.status === 'CANCELLED') acc.cancelled++;
        return acc;
      },
      { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 }
    );

    const revenue = orders
      .filter((o) => o.status === 'DELIVERED' && o.isPaid)
      .reduce((sum, o) => sum + o.total, 0);

    const totalEarnings = orders.reduce((sum, o) => sum + o.total, 0);
    const uniqueCustomers = new Set(orders.map((o) => o.userId)).size;

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
        totalProducts: products.length,
        totalOrders: orders.length,
        totalCategories: categories.length,
        totalCustomers: uniqueCustomers,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        revenue: Math.round(revenue * 100) / 100,
        ...statusCounts,
        dailyData,
        ratings,
      },
    });
  } catch (error) {
    console.error('GET /api/store/dashboard error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
