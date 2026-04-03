// app/api/inventory/update/route.js
// PUT /api/inventory/update — manual stock adjustment by store owner
import prisma from '@/lib/prisma';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function PUT(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

    const { productId, quantity, lowStock } = await request.json();
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });
    if (quantity === undefined)
      return NextResponse.json({ error: 'quantity required' }, { status: 400 });

    const newQty = Math.max(0, Number(quantity));

    // Verify ownership
    const product = await prisma.product.findFirst({ where: { id: productId, storeId } });
    if (!product) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    // Upsert inventory + sync product fields
    const [inv] = await prisma.$transaction([
      prisma.inventory.upsert({
        where: { productId_storeId: { productId, storeId } },
        update: {
          quantity: newQty,
          ...(lowStock !== undefined && { lowStock: Number(lowStock) }),
        },
        create: { productId, storeId, quantity: newQty, lowStock: Number(lowStock) || 10 },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { quantity: newQty, inStock: newQty > 0 },
      }),
    ]);

    return NextResponse.json({
      message: 'Stock updated',
      inventory: inv,
      quantity: newQty,
      inStock: newQty > 0,
    });
  } catch (error) {
    console.error('PUT /api/inventory/update error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
