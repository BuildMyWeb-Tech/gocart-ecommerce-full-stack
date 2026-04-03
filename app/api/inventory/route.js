// app/api/inventory/route.js
import prisma from '@/lib/prisma';
import authSeller from '@/middlewares/authSeller';
import authAdmin from '@/middlewares/authAdmin';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// ── GET /api/inventory ────────────────────────────────────────────
// Store → their inventory only
// Admin → all stores (pass ?all=true, must be admin)
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const all = searchParams.get('all') === 'true';

    if (all) {
      // Admin path
      const isAdmin = await authAdmin(userId);
      if (!isAdmin) return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

      const storeFilter = searchParams.get('storeId');
      const inventory = await prisma.inventory.findMany({
        where: storeFilter ? { storeId: storeFilter } : {},
        include: {
          product: { select: { id: true, name: true, images: true, price: true, inStock: true } },
          store: { select: { id: true, name: true, username: true } },
        },
        orderBy: { quantity: 'asc' }, // low stock first
      });
      return NextResponse.json({ inventory });
    }

    // Store path
    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

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
// Manually create or upsert an inventory record (store or admin)
export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

    const { productId, quantity, lowStock } = await request.json();
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

    // Verify product belongs to this store
    const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    const inv = await prisma.inventory.upsert({
      where: { productId_storeId: { productId, storeId } },
      update: {
        quantity: Math.max(0, Number(quantity) || 0),
        ...(lowStock !== undefined && { lowStock: Number(lowStock) }),
      },
      create: {
        productId,
        storeId,
        quantity: Math.max(0, Number(quantity) || 0),
        lowStock: Number(lowStock) || 10,
      },
    });

    return NextResponse.json({ message: 'Inventory saved', inventory: inv });
  } catch (error) {
    console.error('POST /api/inventory error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
