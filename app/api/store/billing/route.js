// app/api/store/billing/route.js
import prisma from '@/lib/prisma';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import authSeller from '@/middlewares/authSeller';
import { verifyEmployeeToken } from '@/middlewares/authEmployee';

/**
 * Resolves storeId for both Clerk (owner) and Employee JWT sessions.
 */
async function resolveStoreId(request) {
  // 1. Clerk Owner session
  try {
    const { userId } = getAuth(request);
    if (userId) {
      const storeId = await authSeller(userId);
      if (storeId) return storeId;
    }
  } catch (_) {}

  // 2. Employee JWT session
  try {
    const employee = verifyEmployeeToken(request);
    if (employee?.storeId) return employee.storeId;
  } catch (_) {}

  return null;
}

// POST — sync bills to database
export async function POST(request) {
  try {
    const storeId = await resolveStoreId(request);
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const bills = Array.isArray(body) ? body : [body];

    const saved = [];
    const failed = [];

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

        // Check duplicate
        const existing = await prisma.bill.findFirst({
          where: { billNumber, storeId },
        });
        if (existing) {
          saved.push({ localId, billId: existing.id, duplicate: true });
          continue;
        }

        // Save in transaction
        const created = await prisma.$transaction(async (tx) => {
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
        console.error('Bill sync error for localId', bill?.localId, err);
        failed.push({ localId: bill?.localId, reason: err.message });
      }
    }

    return NextResponse.json({ message: 'Sync complete', saved, failed });
  } catch (error) {
    console.error('POST /api/store/billing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET — fetch bill history
export async function GET(request) {
  try {
    const storeId = await resolveStoreId(request);
    if (!storeId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'));
    const skip = (page - 1) * limit;

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where: { storeId },
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bill.count({ where: { storeId } }),
    ]);

    return NextResponse.json({ bills, total, page, limit });
  } catch (error) {
    console.error('GET /api/store/billing error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
