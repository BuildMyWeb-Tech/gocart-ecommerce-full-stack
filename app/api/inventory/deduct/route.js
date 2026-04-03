// app/api/inventory/deduct/route.js
// POST /api/inventory/deduct — reusable deduction (POS / billing ready)
import prisma from '@/lib/prisma';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const storeId = await authSeller(userId);
    if (!storeId) return NextResponse.json({ error: 'Not authorized' }, { status: 401 });

    // items = [{ productId, quantity }]
    const { items } = await request.json();
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 });
    }

    const results = [];

    await prisma.$transaction(async (tx) => {
      for (const { productId, quantity } of items) {
        const deductQty = Number(quantity);
        if (!productId || deductQty <= 0) continue;

        const inv = await tx.inventory.findUnique({
          where: { productId_storeId: { productId, storeId } },
        });

        // ── Zero-stock protection ─────────────────────────────────
        if (!inv || inv.quantity < deductQty) {
          throw new Error(
            `Insufficient stock for product ${productId}. Available: ${inv?.quantity ?? 0}`
          );
        }

        const newQty = inv.quantity - deductQty;

        await tx.inventory.update({
          where: { productId_storeId: { productId, storeId } },
          data: { quantity: newQty },
        });

        await tx.product.update({
          where: { id: productId },
          data: { quantity: newQty, inStock: newQty > 0 },
        });

        results.push({ productId, previous: inv.quantity, current: newQty, inStock: newQty > 0 });
      }
    });

    return NextResponse.json({ message: 'Stock deducted', results });
  } catch (error) {
    console.error('POST /api/inventory/deduct error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
