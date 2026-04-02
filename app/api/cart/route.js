// C:\Users\Siddharathan\Desktop\gocart-ecommerce-full-stack\app\api\cart\route.js
import prisma from '@/lib/prisma';
import { clerkClient, getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

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

// POST — save cart to DB
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureUserExists(userId);

    const body = await request.json();
    // Support both { cart: [...] } and { items: [...] } shapes from cartSlice
    const cart = body.cart ?? body.items ?? [];

    await prisma.user.update({
      where: { id: userId },
      data: { cart },
    });

    return NextResponse.json({ message: 'Cart saved' });
  } catch (error) {
    console.error('POST /api/cart error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// GET — fetch cart from DB
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await ensureUserExists(userId);

    const user = await prisma.user.findUnique({ where: { id: userId } });

    const cartData = user?.cart ?? [];
    const items = Array.isArray(cartData) ? cartData : (cartData.items ?? []);
    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return NextResponse.json({ items, totalPrice });
  } catch (error) {
    console.error('GET /api/cart error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
