// app/api/store/orders/route.js
import prisma from '@/lib/prisma';
import authSeller from '@/middlewares/authSeller';
import { verifyEmployeeToken } from '@/middlewares/authEmployee';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// ── Status transition rules ───────────────────────────────────────
const STORE_ALLOWED_TRANSITIONS = {
  ORDER_PLACED:     ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:        ['PROCESSING', 'CANCELLED'],
  PROCESSING:       ['SHIPPED', 'CANCELLED'],
  SHIPPED:          ['DELIVERED'],
  DELIVERED:        ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED'],
  RETURNED:         ['REFUNDED'],
  CANCELLED:        [],
  REFUNDED:         [],
};

const PRE_SHIPPED_STATUSES = new Set(['ORDER_PLACED', 'CONFIRMED', 'PROCESSING']);

// ── Helper: resolve storeId from employee JWT or Clerk ────────────
async function resolveStoreId(request) {
  // Priority 1: Employee JWT
  const emp = verifyEmployeeToken(request);
  if (emp?.storeId) return emp.storeId;

  // Priority 2: Clerk store owner
  const { userId } = getAuth(request);
  if (!userId) return null;
  return authSeller(userId);
}

// ── Helper: restore inventory on cancel/return ────────────────────
async function restoreInventory(tx, orderId) {
  const orderItems = await tx.orderItem.findMany({
    where: { orderId },
    select: { productId: true, quantity: true },
  });

  for (const item of orderItems) {
    const product = await tx.product.findUnique({
      where: { id: item.productId },
      select: { quantity: true },
    });
    if (product) {
      const newQty = product.quantity + item.quantity;
      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: newQty, inStock: newQty > 0 },
      });
    }
  }
}

// ── POST: update order status ─────────────────────────────────────
export async function POST(request) {
  try {
    const storeId = await resolveStoreId(request);

    if (!storeId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { orderId, status, note } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'orderId and status are required' },
        { status: 400 }
      );
    }

    // Verify order belongs to this store
    const order = await prisma.order.findFirst({
      where: { id: orderId, storeId },
      select: { id: true, status: true, storeId: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or not authorized' },
        { status: 404 }
      );
    }

    const currentStatus = order.status;
    const allowed = STORE_ALLOWED_TRANSITIONS[currentStatus] || [];

    if (!allowed.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${currentStatus} to ${status}. Allowed: ${
            allowed.join(', ') || 'none'
          }`,
        },
        { status: 400 }
      );
    }

    // Cancel guard
    if (status === 'CANCELLED' && !PRE_SHIPPED_STATUSES.has(currentStatus)) {
      return NextResponse.json(
        { error: 'Orders can only be cancelled before they are shipped' },
        { status: 400 }
      );
    }

    // Transaction: update + timeline + inventory restore
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status },
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          status,
          changedBy: 'STORE',
          note: note || null,
        },
      });

      if (status === 'CANCELLED' || status === 'RETURNED') {
        await restoreInventory(tx, orderId);
      }
    });

    return NextResponse.json({
      message: 'Order status updated',
      inventoryRestored: ['CANCELLED', 'RETURNED'].includes(status),
    });
  } catch (error) {
    console.error('POST /api/store/orders error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// ── GET: fetch all orders for this store ──────────────────────────
export async function GET(request) {
  try {
    const storeId = await resolveStoreId(request);

    if (!storeId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');
    const dateFrom     = searchParams.get('dateFrom');
    const dateTo       = searchParams.get('dateTo');
    const page         = parseInt(searchParams.get('page')  || '1',  10);
    const limit        = parseInt(searchParams.get('limit') || '50', 10);

    // Build where clause
    const where = { storeId };

    if (statusFilter && statusFilter !== 'all') {
      where.status = statusFilter;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo)   where.createdAt.lte = new Date(dateTo);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user:       true,
          address:    true,
          orderItems: { include: { product: true } },
          timeline:   { orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({ orders, total, page, limit });
  } catch (error) {
    console.error('GET /api/store/orders error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}