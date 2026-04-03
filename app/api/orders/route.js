// app/api/orders/route.js
import prisma from '@/lib/prisma';
import { clerkClient, getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { inngest } from '@/inngest/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function ensureUserExists(userId) {
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      image: clerkUser.imageUrl || '',
    },
  });
}

// ── GET: fetch all orders for the logged-in user ──────────────────
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureUserExists(userId);

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: {
          include: {
            product: {
              select: { id: true, name: true, images: true, price: true, category: true },
            },
          },
        },
        address: true,
        store: { select: { name: true, username: true, logo: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// ── POST: create a new order ──────────────────────────────────────
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureUserExists(userId);

    const body = await request.json();
    const { items, addressId, paymentMethod, couponCode } = body;

    if (!items || items.length === 0)
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    if (!addressId)
      return NextResponse.json({ error: 'Delivery address is required' }, { status: 400 });
    if (!paymentMethod)
      return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });

    // ── Resolve storeId ───────────────────────────────────────────
    let storeId = items[0]?.storeId ?? null;
    if (!storeId) {
      const firstProduct = await prisma.product.findUnique({
        where: { id: items[0]?.id },
        select: { storeId: true },
      });
      storeId = firstProduct?.storeId ?? null;
    }
    if (!storeId) {
      return NextResponse.json(
        {
          error:
            'This product is a global catalogue item and cannot be purchased through a store checkout.',
        },
        { status: 400 }
      );
    }

    // ── Validate same store ───────────────────────────────────────
    for (const item of items) {
      const itemStoreId = item.storeId ?? null;
      if (itemStoreId && itemStoreId !== storeId) {
        return NextResponse.json(
          {
            error:
              'Your cart contains products from multiple stores. Please purchase from one store at a time.',
          },
          { status: 400 }
        );
      }
    }

    // ── Validate store exists and is active ───────────────────────
    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { id: true, isActive: true },
    });
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 400 });
    if (!store.isActive)
      return NextResponse.json({ error: 'This store is currently inactive' }, { status: 400 });

    // ── ✅ Check inventory availability before placing order ───────
    for (const item of items) {
      const inv = await prisma.inventory.findUnique({
        where: { productId_storeId: { productId: item.id, storeId } },
        select: { quantity: true },
      });
      // If inventory record exists, enforce stock check
      if (inv !== null && inv.quantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for "${item.name}". Available: ${inv.quantity}` },
          { status: 400 }
        );
      }
    }

    // ── Resolve coupon ────────────────────────────────────────────
    let couponData = {};
    let isCouponUsed = false;
    let discount = 0;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (coupon && new Date(coupon.expiresAt) > new Date()) {
        couponData = coupon;
        isCouponUsed = true;
        discount = coupon.discount;
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = isCouponUsed ? subtotal - (subtotal * discount) / 100 : subtotal;

    // ── Create order + deduct inventory atomically ────────────────
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId,
          storeId,
          addressId,
          total,
          paymentMethod,
          isPaid: false,
          isCouponUsed,
          coupon: couponData,
          orderItems: {
            create: items.map((item) => ({
              productId: item.id,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: { orderItems: true },
      });

      // ── Deduct inventory for each ordered item ────────────────
      for (const item of items) {
        const inv = await tx.inventory.findUnique({
          where: { productId_storeId: { productId: item.id, storeId } },
        });

        if (inv) {
          const newQty = Math.max(0, inv.quantity - item.quantity);

          await tx.inventory.update({
            where: { productId_storeId: { productId: item.id, storeId } },
            data: { quantity: newQty },
          });

          // Sync product.quantity and inStock flag
          await tx.product.update({
            where: { id: item.id },
            data: {
              quantity: newQty,
              inStock: newQty > 0,
            },
          });
        }
      }

      return created;
    });

    // ── Trigger Inngest sale event ────────────────────────────────
    await inngest.send({ name: 'app/order.created', data: { orderId: order.id } });

    // ── Stripe checkout ───────────────────────────────────────────
    if (paymentMethod === 'STRIPE') {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: items.map((item) => ({
          price_data: {
            currency: 'inr',
            product_data: { name: item.name },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        })),
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
        metadata: { orderId: order.id },
      });
      return NextResponse.json({ message: 'Order placed successfully', order, session });
    }

    return NextResponse.json({ message: 'Order placed successfully', order });
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
