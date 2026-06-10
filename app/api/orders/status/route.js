// app/api/orders/status/route.js
import prisma from '@/lib/prisma';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import authSeller from '@/middlewares/authSeller';
import authAdmin from '@/middlewares/authAdmin';
import verifyEmployeeToken, { hasPermission, PERMISSIONS } from '@/middlewares/authEmployee';

// ── New order status flow ─────────────────────────────────────────
// PENDING → CONFIRMED → PACKED → SHIPPED → OUT_FOR_DELIVERY → DELIVERED
//                    ↘ CANCELLED (before SHIPPED)
//                                              ↘ RETURNED (after DELIVERED)

const STORE_TRANSITIONS = {
  PENDING:          ['CONFIRMED', 'CANCELLED'],
  CONFIRMED:        ['PACKED', 'CANCELLED'],
  PACKED:           ['SHIPPED', 'CANCELLED'],
  SHIPPED:          ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED:        ['RETURNED'],
  CANCELLED:        [],
  RETURNED:         [],
};

const ADMIN_TRANSITIONS = {
  PENDING:          ['CONFIRMED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  CONFIRMED:        ['PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
  PACKED:           ['SHIPPED', 'DELIVERED', 'CANCELLED'],
  SHIPPED:          ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
  DELIVERED:        ['RETURNED'],
  CANCELLED:        ['PENDING'],
  RETURNED:         [],
};

const PRE_SHIPPED = new Set(['PENDING', 'CONFIRMED', 'PACKED']);

// ── Restore variant stock on cancel/return ────────────────────────
async function restoreInventory(tx, orderId) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      storeId: true,
      orderItems: { select: { variantId: true, quantity: true } },
    },
  });

  if (!order) return;

  for (const item of order.orderItems) {
    const variant = await tx.productVariant.findUnique({
      where: { id: item.variantId },
      select: { stock: true },
    });
    if (!variant) continue;

    const newStock = variant.stock + item.quantity;

    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stock: newStock },
    });

    await tx.inventory.upsert({
      where: { variantId: item.variantId },
      update: { quantity: newStock },
      create: {
        variantId: item.variantId,
        storeId: order.storeId,
        quantity: newStock,
        lowStock: 10,
      },
    });
  }
}

// PUT /api/orders/status — Update order status
export async function PUT(request) {
  try {
    const { userId } = getAuth(request);

    // Also allow employees with UPDATE_ORDER_STATUS
    const employee = verifyEmployeeToken(request);

    let role     = null;
    let storeId  = null;

    if (employee) {
      if (!hasPermission(employee, PERMISSIONS.UPDATE_ORDER_STATUS)) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
      role    = 'STORE';
      storeId = employee.storeId;
    } else if (userId) {
      const isAdminUser = await authAdmin(userId);
      if (isAdminUser) {
        role = 'ADMIN';
      } else {
        storeId = await authSeller(userId);
        if (storeId) role = 'STORE';
      }
    }

    if (!role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, newStatus, note } = await request.json();

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'orderId and newStatus are required' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, storeId: true },
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Store can only update its own orders
    if (role === 'STORE' && order.storeId !== storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transitionMap = role === 'ADMIN' ? ADMIN_TRANSITIONS : STORE_TRANSITIONS;
    const allowed = transitionMap[order.status] || [];

    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${order.status} to ${newStatus}. Allowed: ${
            allowed.join(', ') || 'none'
          }`,
        },
        { status: 400 }
      );
    }

    // Can only cancel before shipped
    if (newStatus === 'CANCELLED' && !PRE_SHIPPED.has(order.status)) {
      return NextResponse.json(
        { error: 'Orders can only be cancelled before they are shipped' },
        { status: 400 }
      );
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      await tx.orderTimeline.create({
        data: {
          orderId,
          status: newStatus,
          changedBy: role,
          note: note || null,
        },
      });

      if (newStatus === 'CANCELLED' || newStatus === 'RETURNED') {
        await restoreInventory(tx, orderId);
      }

      return updated;
    });

    return NextResponse.json({
      message: `Order status updated to ${newStatus}`,
      order: updatedOrder,
      inventoryRestored: ['CANCELLED', 'RETURNED'].includes(newStatus),
    });
  } catch (error) {
    console.error('PUT /api/orders/status error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// GET /api/orders/status?orderId=xxx — Get allowed transitions
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const employee = verifyEmployeeToken(request);

    let role = null;
    let storeId = null;

    if (employee) {
      role    = 'STORE';
      storeId = employee.storeId;
    } else if (userId) {
      const isAdminUser = await authAdmin(userId);
      if (isAdminUser) {
        role = 'ADMIN';
      } else {
        storeId = await authSeller(userId);
        if (storeId) role = 'STORE';
      }
    }

    if (!role) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true, storeId: true },
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    if (role === 'STORE' && order.storeId !== storeId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transitionMap = role === 'ADMIN' ? ADMIN_TRANSITIONS : STORE_TRANSITIONS;
    const allowed = transitionMap[order.status] || [];

    return NextResponse.json({ currentStatus: order.status, allowedTransitions: allowed });
  } catch (error) {
    console.error('GET /api/orders/status error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}