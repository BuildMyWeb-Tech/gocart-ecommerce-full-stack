// app/api/store/billing/route.js
// ─────────────────────────────────────────────────────────────────────────────
// Billing sync API — supports Clerk owner + Employee JWT
//
// POST /api/store/billing  → sync offline bills + deduct stock atomically
// GET  /api/store/billing  → paginated bill history with stats
// ─────────────────────────────────────────────────────────────────────────────
import prisma from '@/lib/prisma';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import authSeller from '@/middlewares/authSeller';
import { verifyEmployeeToken, hasPermission } from '@/middlewares/authEmployee';

/**
 * Resolves storeId for both Clerk (owner) and Employee JWT sessions.
 */
async function resolveStoreId(request) {
  // ── 1. Employee JWT ───────────────────────────────────────────
  try {
    const employee = verifyEmployeeToken(request);
    if (employee?.storeId) {
      if (!hasPermission(employee, 'billing')) {
        return { error: 'No billing permission', status: 403 };
      }
      return { storeId: employee.storeId, source: 'employee', employeeId: employee.id };
    }
  } catch (_) {}

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

// ─────────────────────────────────────────────────────────────────────────────
// POST — sync bills + deduct stock atomically
// Body: array of bill objects from IndexedDB queue
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request) {
  try {
    const { storeId, error, status, source } = await resolveStoreId(request);
    if (!storeId) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });
    }

    const body = await request.json();
    const bills = Array.isArray(body) ? body : [body];

    const saved = [];
    const failed = [];
    const skipped = [];

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

        // ── Deduplication by billNumber ─────────────────────────
        // Also check localId stored in bill.localId field to prevent
        // re-processing the same offline bill even if billNumber differs
        const existing = await prisma.bill.findFirst({
          where: {
            storeId,
            OR: [
              { billNumber },
              // Store localId in note or a dedicated field if needed
              // Using billNumber as primary dedup key is sufficient
            ],
          },
          select: { id: true, billNumber: true },
        });

        if (existing) {
          skipped.push({ localId, billId: existing.id, reason: 'duplicate' });
          continue;
        }

        // ── Atomic: save bill + deduct stock + record sale ──────
        const created = await prisma.$transaction(async (tx) => {
          // 1. Create the Bill record
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
                  name: item.name,
                  price: Number(item.price),
                  quantity: Number(item.quantity),
                  discount: Number(item.discount || 0),
                  total: Number(item.total),
                })),
              },
            },
          });

          // 2. Deduct stock for each item — atomic, safe, no duplicates
          for (const item of items) {
            const productId = item.productId;
            const deductQty = Number(item.quantity);
            if (!productId || deductQty <= 0) continue;

            // Get current inventory
            const inv = await tx.inventory.findUnique({
              where: { productId_storeId: { productId, storeId } },
            });

            // Fallback to product.quantity if no inventory record
            const product = await tx.product.findFirst({
              where: { id: productId, storeId },
              select: { id: true, quantity: true },
            });

            if (!product) continue; // Product not found — skip silently

            const currentQty = inv?.quantity ?? product.quantity ?? 0;
            const newQty = Math.max(0, currentQty - deductQty);

            if (inv) {
              await tx.inventory.update({
                where: { productId_storeId: { productId, storeId } },
                data: { quantity: newQty },
              });
            } else {
              await tx.inventory.create({
                data: { productId, storeId, quantity: newQty, lowStock: 10 },
              });
            }

            await tx.product.update({
              where: { id: productId },
              data: { quantity: newQty, inStock: newQty > 0 },
            });
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
        console.error(`Bill sync error for localId=${bill?.localId}:`, err.message);
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
// GET — paginated bill history + summary stats
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    const { storeId, error, status } = await resolveStoreId(request);
    if (!storeId) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: status || 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '50'));
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const paymentMode = searchParams.get('paymentMode') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';

    // Build where clause
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
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bill.count({ where }),
      // Today's summary stats
      prisma.bill.aggregate({
        where: {
          storeId,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
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
      todayStats: {
        count: stats._count.id,
        revenue: stats._sum.total || 0,
      },
    });
  } catch (error) {
    console.error('GET /api/store/billing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
