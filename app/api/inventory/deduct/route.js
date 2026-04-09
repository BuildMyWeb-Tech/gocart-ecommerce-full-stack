// app/api/inventory/deduct/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Feature 10: Deducts stock from ProductVariant when variantId is provided.
// Falls back to product/inventory deduction if no variantId.
// Called immediately after bill save (background, before sync).
// ─────────────────────────────────────────────────────────────────────────────
import prisma from '@/lib/prisma';
import authSeller from '@/middlewares/authSeller';
import { verifyEmployeeToken, hasPermission } from '@/middlewares/authEmployee';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

async function resolveStoreId(request) {
  const emp = verifyEmployeeToken(request);
  if (emp?.storeId) {
    if (!hasPermission(emp, 'billing')) return { storeId: null, error: 'No billing permission' };
    return { storeId: emp.storeId };
  }
  const { userId } = getAuth(request);
  if (!userId) return { storeId: null, error: 'Unauthorized' };
  const storeId = await authSeller(userId);
  if (!storeId) return { storeId: null, error: 'Not authorized' };
  return { storeId };
}

export async function POST(request) {
  try {
    const { storeId, error } = await resolveStoreId(request);
    if (!storeId) return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });

    const { items = [] } = await request.json();
    if (!items.length) return NextResponse.json({ message: 'No items to deduct', deducted: [] });

    const deducted = [];
    const errors = [];

    for (const item of items) {
      const deductQty = Number(item.quantity);
      if (!deductQty || deductQty <= 0) continue;

      try {
        if (item.variantId) {
          // ── Variant-level deduction ──────────────────────────────────────
          const cleanId =
            item.variantId.includes('_') && item.variantId.length > 30
              ? item.variantId.split('_')[0]
              : item.variantId;

          await prisma.$transaction(async (tx) => {
            const variant = await tx.productVariant.findUnique({
              where: { id: cleanId },
              select: { id: true, stock: true, productId: true },
            });
            if (!variant) return;

            const newStock = Math.max(0, variant.stock - deductQty);
            await tx.productVariant.update({ where: { id: cleanId }, data: { stock: newStock } });

            // Aggregate product.quantity from all variants
            const allVariants = await tx.productVariant.findMany({
              where: { productId: variant.productId },
              select: { stock: true },
            });
            const totalStock = allVariants.reduce((s, v) => s + v.stock, 0);

            await tx.product.update({
              where: { id: variant.productId },
              data: { quantity: totalStock, inStock: totalStock > 0 },
            });
            await tx.inventory.updateMany({
              where: { productId: variant.productId, storeId },
              data: { quantity: totalStock },
            });

            deducted.push({
              variantId: cleanId,
              productId: variant.productId,
              deducted: deductQty,
              newStock,
              newProductStock: totalStock,
            });
          });
        } else if (item.productId) {
          // ── Product-level fallback (legacy) ──────────────────────────────
          await prisma.$transaction(async (tx) => {
            const product = await tx.product.findFirst({
              where: { id: item.productId, storeId },
              select: { id: true, quantity: true },
            });
            if (!product) return;

            const inv = await tx.inventory.findUnique({
              where: { productId_storeId: { productId: item.productId, storeId } },
            });
            const currentQty = inv?.quantity ?? product.quantity ?? 0;
            const newQty = Math.max(0, currentQty - deductQty);

            if (inv) {
              await tx.inventory.update({
                where: { productId_storeId: { productId: item.productId, storeId } },
                data: { quantity: newQty },
              });
            } else {
              await tx.inventory.create({
                data: { productId: item.productId, storeId, quantity: newQty, lowStock: 10 },
              });
            }
            await tx.product.update({
              where: { id: item.productId },
              data: { quantity: newQty, inStock: newQty > 0 },
            });
            deducted.push({ productId: item.productId, deducted: deductQty, newQty });
          });
        }
      } catch (err) {
        console.error('Deduct error for item:', item, err.message);
        errors.push({ item, reason: err.message });
      }
    }

    return NextResponse.json({ message: 'Deduction complete', deducted, errors });
  } catch (error) {
    console.error('POST /api/inventory/deduct error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
