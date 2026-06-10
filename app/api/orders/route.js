// app/api/orders/route.js
import prisma from '@/lib/prisma';
import { clerkClient, getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

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

// GET /api/orders — Fetch all orders for the logged-in buyer
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
            variant: {
              select: {
                id: true,
                color: true,
                size: true,
                price: true,
                sku: true,
                product: {
                  select: { id: true, name: true, images: true, slug: true },
                },
              },
            },
          },
        },
        address: true,
        store: { select: { id: true, name: true, username: true, logo: true } },
        timeline: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// POST /api/orders — Create orders (auto-split by store)
// Body: {
//   items: [{ variantId, quantity, price, storeId }],
//   addressId,
//   paymentMethod: 'COD' | 'STRIPE',
//   couponCode?: string
// }
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureUserExists(userId);

    const body = await request.json();
    const { items, addressId, paymentMethod, couponCode } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }
    if (!addressId) {
      return NextResponse.json({ error: 'Delivery address is required' }, { status: 400 });
    }
    if (!['COD', 'STRIPE'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    // ── Validate address belongs to this user ─────────────────────
    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) {
      return NextResponse.json({ error: 'Address not found' }, { status: 400 });
    }

    // ── Fetch all variants with product + store info ───────────────
    const variantIds = items.map((i) => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            storeId: true,
            status: true,
            store: {
              select: { id: true, name: true, isActive: true, status: true },
            },
          },
        },
      },
    });

    // Build a map for quick lookup
    const variantMap = {};
    variants.forEach((v) => { variantMap[v.id] = v; });

    // ── Validate all variants exist and stores are active ─────────
    const stockErrors = [];
    for (const item of items) {
      const variant = variantMap[item.variantId];
      if (!variant) {
        stockErrors.push(`Variant ${item.variantId} not found`);
        continue;
      }
      if (variant.product.status !== 'ACTIVE') {
        stockErrors.push(`"${variant.product.name}" is not available`);
        continue;
      }
      if (!variant.product.store.isActive || variant.product.store.status !== 'ACTIVE') {
        stockErrors.push(`Store for "${variant.product.name}" is not active`);
        continue;
      }
      if (variant.stock < item.quantity) {
        if (variant.stock === 0) {
          stockErrors.push(`"${variant.product.name}" (${variant.color}/${variant.size}) is out of stock`);
        } else {
          stockErrors.push(
            `"${variant.product.name}" (${variant.color}/${variant.size}) only has ${variant.stock} in stock`
          );
        }
      }
    }

    if (stockErrors.length > 0) {
      return NextResponse.json({ error: stockErrors.join('. ') }, { status: 400 });
    }

    // ── Resolve coupon ────────────────────────────────────────────
    let coupon = null;
    let discountPct = 0;
    if (couponCode) {
      coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (coupon && new Date(coupon.expiresAt) > new Date()) {
        discountPct = coupon.discount;
      } else {
        coupon = null;
      }
    }

    // ── GROUP items by storeId ────────────────────────────────────
    const storeGroups = {};
    for (const item of items) {
      const variant = variantMap[item.variantId];
      const storeId = variant.product.storeId;
      if (!storeGroups[storeId]) storeGroups[storeId] = [];
      storeGroups[storeId].push({ ...item, variant });
    }

    // ── Fetch commissions for all involved stores ─────────────────
    const storeIds = Object.keys(storeGroups);
    const commissions = await prisma.commission.findMany({
      where: { storeId: { in: storeIds } },
    });
    const commissionMap = {};
    commissions.forEach((c) => { commissionMap[c.storeId] = c.percentage; });

    // ── Create one order per store in a single transaction ────────
    const createdOrders = await prisma.$transaction(async (tx) => {
      const orders = [];

      for (const [storeId, storeItems] of Object.entries(storeGroups)) {
        // Calculate subtotal for this store's items
        const subtotal = storeItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        // Apply coupon discount (split proportionally across stores)
        const discountAmt = discountPct > 0 ? (subtotal * discountPct) / 100 : 0;

        // Calculate commission
        const commissionPct = commissionMap[storeId] ?? 0;
        const commissionAmt = (subtotal * commissionPct) / 100;

        const total = subtotal - discountAmt;

        // Create order
        const order = await tx.order.create({
          data: {
            userId,
            storeId,
            addressId,
            subtotal,
            shippingCost: 0,
            commissionAmt,
            total,
            status: 'PENDING',
            isPaid: false,
            paymentMethod,
            isCouponUsed: !!coupon,
            couponCode: coupon?.code || null,
            couponDiscount: discountAmt,
            orderItems: {
              create: storeItems.map((item) => ({
                variantId: item.variantId,
                productId: item.variant.product.id,
                quantity: item.quantity,
                price: item.price,
              })),
            },
          },
        });

        // Initial timeline entry
        await tx.orderTimeline.create({
          data: {
            orderId: order.id,
            status: 'PENDING',
            changedBy: 'SYSTEM',
            note: 'Order placed successfully',
          },
        });

        // Deduct variant stock (re-check inside transaction)
        for (const item of storeItems) {
          const freshVariant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { stock: true },
          });

          if (!freshVariant || freshVariant.stock < item.quantity) {
            throw new Error(
              `Insufficient stock for "${item.variant.product.name}" (${item.variant.color}/${item.variant.size})`
            );
          }

          const newStock = freshVariant.stock - item.quantity;

          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: newStock },
          });

          // Sync inventory record
          await tx.inventory.upsert({
            where: { variantId: item.variantId },
            update: { quantity: newStock },
            create: {
              variantId: item.variantId,
              storeId,
              quantity: newStock,
              lowStock: 10,
            },
          });
        }

        orders.push(order);
      }

      return orders;
    });

    // ── Stripe: create session for all orders combined ────────────
    if (paymentMethod === 'STRIPE') {
      const lineItems = items.map((item) => {
        const variant = variantMap[item.variantId];
        return {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `${variant.product.name} (${variant.color}/${variant.size})`,
            },
            unit_amount: Math.round(item.price * 100),
          },
          quantity: item.quantity,
        };
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart`,
        metadata: { orderIds: createdOrders.map((o) => o.id).join(',') },
      });

      return NextResponse.json({
        message: `${createdOrders.length} order(s) placed successfully`,
        orders: createdOrders,
        session,
      });
    }

    return NextResponse.json({
      message: `${createdOrders.length} order(s) placed successfully`,
      orders: createdOrders,
    });
  } catch (error) {
    console.error('POST /api/orders error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}