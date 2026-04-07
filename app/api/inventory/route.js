// app/api/inventory/route.js
import prisma from '@/lib/prisma';
import authSeller from '@/middlewares/authSeller';
import authAdmin from '@/middlewares/authAdmin';
import { verifyEmployeeToken, hasPermission } from '@/middlewares/authEmployee';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// ── Resolve storeId from any auth source ─────────────────────────
async function resolveStoreId(request) {
  // 1. Try employee JWT first
  const empPayload = verifyEmployeeToken(request);
  if (empPayload) {
    if (!hasPermission(empPayload, 'inventory'))
      return { storeId: null, error: 'No inventory permission' };
    return { storeId: empPayload.storeId, isEmployee: true };
  }

  // 2. Fall back to Clerk
  const { userId } = getAuth(request);
  if (!userId) return { storeId: null, error: 'Unauthorized' };

  const storeId = await authSeller(userId);
  if (!storeId) return { storeId: null, error: 'Not authorized' };

  return { storeId, userId };
}

// ── GET /api/inventory ────────────────────────────────────────────
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    if (all) {
      // Admin only
      const { userId } = getAuth(request);
      if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

      const isAdmin = await authAdmin(userId);
      if (!isAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

      const storeFilter = searchParams.get('storeId');
      const inventory = await prisma.inventory.findMany({
        where: storeFilter ? { storeId: storeFilter } : {},
        include: {
          product: { select: { id: true, name: true, images: true, price: true, inStock: true } },
          store: { select: { id: true, name: true, username: true } },
        },
        orderBy: { quantity: 'asc' },
      });
      return NextResponse.json({ inventory });
    }

    // Store / Employee path
    const { storeId, error } = await resolveStoreId(request);
    if (!storeId) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

    const inventory = await prisma.inventory.findMany({
      where: { storeId },
      include: {
        product: { select: { id: true, name: true, images: true, price: true, inStock: true } },
      },
      orderBy: { quantity: 'asc' },
    });

    return NextResponse.json({ inventory });
  } catch (error) {
    console.error('GET /api/inventory error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// ── POST /api/inventory ───────────────────────────────────────────
// Upsert inventory record + sync product fields
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

    const { productId, quantity, lowStock } = await request.json();
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

    const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const newQty = Math.max(0, Number(quantity) || 0);

    const [inv] = await prisma.$transaction([
      prisma.inventory.upsert({
        where: { productId_storeId: { productId, storeId } },
        update: {
          quantity: newQty,
          ...(lowStock !== undefined && { lowStock: Number(lowStock) }),
        },
        create: { productId, storeId, quantity: newQty, lowStock: Number(lowStock) || 10 },
      }),
      // Keep product table in sync
      prisma.product.update({
        where: { id: productId },
        data: { quantity: newQty, inStock: newQty > 0 },
      }),
    ]);

    return NextResponse.json({ message: 'Inventory saved', inventory: inv });
  } catch (error) {
    console.error('POST /api/inventory error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
