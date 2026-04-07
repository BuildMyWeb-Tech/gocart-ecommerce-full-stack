// app/api/inventory/deduct/route.js
// POST /api/inventory/deduct
// ─────────────────────────────────────────────────────────────────────────────
// Atomic stock deduction — supports:
//   • Clerk store owner session
//   • Employee JWT session (with billing permission)
//   • billId deduplication — prevents double-deduction on retry/re-sync
// ─────────────────────────────────────────────────────────────────────────────
import prisma from '@/lib/prisma';
import authSeller from '@/middlewares/authSeller';
import { verifyEmployeeToken, hasPermission } from '@/middlewares/authEmployee';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

/**
 * Resolve storeId from either Clerk owner or Employee JWT.
 * Returns { storeId, source } or { error }
 */
async function resolveStoreId(request) {
  // ── 1. Employee JWT (highest priority) ───────────────────────
  const empPayload = verifyEmployeeToken(request);
  if (empPayload) {
    if (!hasPermission(empPayload, 'billing')) {
      return { error: 'No billing permission', status: 403 };
    }
    return { storeId: empPayload.storeId, source: 'employee' };
  }

  // ── 2. Clerk store owner ──────────────────────────────────────
  try {
    const { userId } = getAuth(request);
    if (userId) {
      const storeId = await authSeller(userId);
      if (storeId) return { storeId, source: 'owner' };
    }
  } catch (_) {}

  return { error: 'Unauthorized', status: 401 };
}

export async function POST(request) {
  try {
    const { storeId, error, status } = await resolveStoreId(request);
    if (!storeId) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });
    }

    const body = await request.json();

    // items = [{ productId, quantity }]
    // billId = unique bill ID for deduplication (optional but recommended)
    const { items, billId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 });
    }

    // ── Duplicate deduction guard ─────────────────────────────────
    // If billId is provided and we've already deducted for this bill, skip.
    if (billId) {
      const alreadyDeducted = await prisma.bill.findFirst({
        where: { billNumber: billId, storeId, stockDeducted: true },
        select: { id: true },
      });
      if (alreadyDeducted) {
        return NextResponse.json({
          message: 'Already deducted (duplicate skipped)',
          skipped: true,
        });
      }
    }

    const results = [];

    await prisma.$transaction(async (tx) => {
      for (const { productId, quantity } of items) {
        const deductQty = Number(quantity);
        if (!productId || deductQty <= 0) continue;

        // ── Fetch current inventory ─────────────────────────────
        const inv = await tx.inventory.findUnique({
          where: { productId_storeId: { productId, storeId } },
        });

        // ── Verify product belongs to this store ────────────────
        const product = await tx.product.findFirst({
          where: { id: productId, storeId },
          select: { id: true, name: true, quantity: true },
        });

        if (!product) {
          throw new Error(`Product ${productId} not found in store ${storeId}`);
        }

        // ── Stock sufficiency check ─────────────────────────────
        const currentQty = inv?.quantity ?? product.quantity ?? 0;
        if (currentQty < deductQty) {
          throw new Error(
            `Insufficient stock for "${product.name}". ` +
              `Available: ${currentQty}, Requested: ${deductQty}`
          );
        }

        const newQty = currentQty - deductQty;

        // ── Atomic inventory update ─────────────────────────────
        if (inv) {
          await tx.inventory.update({
            where: { productId_storeId: { productId, storeId } },
            data: { quantity: newQty },
          });
        } else {
          // No inventory record yet — create it
          await tx.inventory.create({
            data: { productId, storeId, quantity: newQty, lowStock: 10 },
          });
        }

        // ── Keep product.quantity in sync ───────────────────────
        await tx.product.update({
          where: { id: productId },
          data: { quantity: newQty, inStock: newQty > 0 },
        });

        results.push({
          productId,
          name: product.name,
          previous: currentQty,
          current: newQty,
          inStock: newQty > 0,
        });
      }
    });

    return NextResponse.json({
      message: 'Stock deducted successfully',
      results,
      deductedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('POST /api/inventory/deduct error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
