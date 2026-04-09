// app/api/store/billing/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Feature 10 update:
//   - BillItem now stores variantId + size
//   - Stock deducted from ProductVariant.stock (per-variant)
//   - Product.quantity + Inventory.quantity kept in sync (aggregate)
// ─────────────────────────────────────────────────────────────────────────────
import prisma from '@/lib/prisma';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import authSeller from '@/middlewares/authSeller';
import { verifyEmployeeToken, hasPermission } from '@/middlewares/authEmployee';

async function resolveStoreId(request) {
  try {
    const employee = verifyEmployeeToken(request);
    if (employee?.storeId) {
      if (!hasPermission(employee, 'billing'))
        return { error: 'No billing permission', status: 403 };
      return { storeId: employee.storeId, source: 'employee' };
    }
  } catch (_) {}
  try {
    const { userId } = getAuth(request);
    if (userId) {
      const storeId = await authSeller(userId);
      if (storeId) return { storeId, source: 'owner' };
    }
  } catch (_) {}
  return { error: 'Unauthorized', status: 401 };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — sync bills array from IndexedDB queue
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { storeId, error, status } = await resolveStoreId(request);
    if (!storeId)
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });

    const body = await request.json();
    const bills = Array.isArray(body) ? body : [body];

    const saved = [],
      failed = [],
      skipped = [];

    for (const bill of bills) {
      try {
        const {
          localId,
          billNumber,
          subtotal,
          discount = 0,
          taxAmount = 0,
          total,
          paymentMode = 'CASH',
          note,
          items = [],
          createdAt,
        } = bill;

        if (!billNumber || !total || !items.length) {
          failed.push({ localId, reason: 'Missing required fields' });
          continue;
        }

        // Dedup by billNumber
        const existing = await prisma.bill.findFirst({
          where: { storeId, billNumber },
          select: { id: true },
        });
        if (existing) {
          skipped.push({ localId, billId: existing.id, reason: 'duplicate' });
          continue;
        }

        const created = await prisma.$transaction(async (tx) => {
          // 1. Create Bill with BillItems (include variantId + size)
          const newBill = await tx.bill.create({
            data: {
              billNumber,
              storeId,
              subtotal: Number(subtotal),
              discount: Number(discount),
              taxAmount: Number(taxAmount),
              total: Number(total),
              paymentMode,
              note: note || null,
              createdAt: createdAt ? new Date(createdAt) : new Date(),
              items: {
                create: items.map((item) => ({
                  productId: item.productId,
                  variantId: item.variantId || null, // ← Feature 10
                  name: item.name,
                  size: item.size || null, // ← Feature 10
                  price: Number(item.price),
                  quantity: Number(item.quantity),
                  discount: Number(item.discount || 0),
                  total: Number(item.total),
                })),
              },
            },
          });

          // 2. Deduct stock per item
          for (const item of items) {
            const deductQty = Number(item.quantity);
            if (deductQty <= 0) continue;

            if (item.variantId) {
              // ── Variant-level stock deduction ──────────────────────────────
              const cleanVariantId =
                item.variantId.includes('_') && item.variantId.length > 30
                  ? item.variantId.split('_')[0] // strip "_duplicate" suffix
                  : item.variantId;

              const variant = await tx.productVariant.findUnique({
                where: { id: cleanVariantId },
                select: { id: true, stock: true, productId: true },
              });
              if (!variant) continue;

              const newVariantStock = Math.max(0, variant.stock - deductQty);
              await tx.productVariant.update({
                where: { id: cleanVariantId },
                data: { stock: newVariantStock },
              });

              // Re-aggregate product.quantity from all variants
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
            } else {
              // ── Legacy fallback: no variantId → deduct from product/inventory ─
              const product = await tx.product.findFirst({
                where: { id: item.productId, storeId },
                select: { id: true, quantity: true },
              });
              if (!product) continue;

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
            }
          }

          // 3. Record sale
          await tx.sale.create({
            data: {
              storeId,
              amount: Number(total),
              source: 'BILLING',
              referenceId: newBill.id,
              createdAt: createdAt ? new Date(createdAt) : new Date(),
            },
          });

          return newBill;
        });

        saved.push({ localId, billId: created.id });
      } catch (err) {
        console.error(`Bill sync error localId=${bill?.localId}:`, err.message);
        failed.push({ localId: bill?.localId, reason: err.message });
      }
    }

    return NextResponse.json({
      message: 'Sync complete',
      saved,
      failed,
      skipped,
      summary: {
        total: bills.length,
        saved: saved.length,
        failed: failed.length,
        skipped: skipped.length,
      },
    });
  } catch (error) {
    console.error('POST /api/store/billing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — paginated bill history + today stats
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { storeId, error, status } = await resolveStoreId(request);
    if (!storeId)
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'));
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const paymentMode = searchParams.get('paymentMode') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    const where = {
      storeId,
      ...(search && {
        OR: [
          { billNumber: { contains: search, mode: 'insensitive' } },
          { note: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(paymentMode && { paymentMode }),
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom && { gte: new Date(dateFrom) }),
              ...(dateTo && { lte: new Date(dateTo + 'T23:59:59.999Z') }),
            },
          }
        : {}),
    };

    const [bills, total, stats] = await Promise.all([
      prisma.bill.findMany({
        where,
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, images: true } },
              variant: { select: { id: true, size: true, price: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bill.count({ where }),
      prisma.bill.aggregate({
        where: { storeId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
        _sum: { total: true },
        _count: { id: true },
      }),
    ]);

    return NextResponse.json({
      bills,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      todayStats: { count: stats._count.id, revenue: stats._sum.total || 0 },
    });
  } catch (error) {
    console.error('GET /api/store/billing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
