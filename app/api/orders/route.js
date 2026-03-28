// C:\Users\Siddharathan\Desktop\gocart-ecommerce-full-stack\app\api\orders\route.js
import prisma from '@/lib/prisma';
import { clerkClient, getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─── Inline helper: create DB user from Clerk if not exists ───
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

// GET — fetch all orders for the logged-in user
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
              select: {
                id: true,
                name: true,
                images: true,
                price: true,
                category: true,
              },
            },
          },
        },
        address: true,
        store: {
          select: { name: true, username: true, logo: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('GET /api/orders error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// POST — create a new order
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureUserExists(userId);

    const body = await request.json();
    // ✅ OrderSummary sends: { items, addressId, paymentMethod, couponCode? }
    // storeId is NOT sent from frontend — we extract it from the first item
    const { items, addressId, paymentMethod, couponCode } = body;

    // ✅ Validate required fields (storeId comes from items)
    if (!items || items.length === 0 || !addressId || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required order fields' }, { status: 400 });
    }

    // ✅ Extract storeId from the first cart item
    const storeId = items[0]?.storeId;
    if (!storeId) {
      return NextResponse.json({ error: 'Store ID missing from cart items' }, { status: 400 });
    }

    // ✅ Resolve coupon if a couponCode was provided
    let couponData = {};
    let isCouponUsed = false;
    let discount = 0;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });
      if (coupon && new Date(coupon.expiresAt) > new Date()) {
        couponData = coupon;
        isCouponUsed = true;
        discount = coupon.discount; // percentage
      }
    }

    // ✅ Calculate total with optional coupon discount
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = isCouponUsed ? subtotal - (subtotal * discount) / 100 : subtotal;

    const order = await prisma.order.create({
      data: {
        userId,
        storeId,
        addressId,
        total,
        paymentMethod,
        isPaid: false, // Stripe webhook will update this
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

    // ✅ Handle Stripe checkout session
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
