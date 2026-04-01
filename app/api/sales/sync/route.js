// app/api/sales/sync/route.js
// ─────────────────────────────────────────────────────────────────────────────
// SALES SYNC ENDPOINT
// Call this after every order is placed/paid to write a Sale record.
// The reporting system queries Sale — NOT Order — for all analytics.
//
// Usage: POST /api/sales/sync  { orderId }
// Called from: your order creation / payment webhook handler
// ─────────────────────────────────────────────────────────────────────────────
import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { orderId } = await request.json();
    if (!orderId) return NextResponse.json({ error: 'orderId required' }, { status: 400 });

    // Avoid duplicate Sale records
    const existing = await prisma.sale.findFirst({ where: { referenceId: orderId } });
    if (existing) return NextResponse.json({ message: 'already synced', sale: existing });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, storeId: true, total: true, createdAt: true },
    });
    if (!order) return NextResponse.json({ error: 'order not found' }, { status: 404 });

    const sale = await prisma.sale.create({
      data: {
        storeId: order.storeId,
        amount: order.total,
        source: 'ORDER',
        referenceId: order.id,
        createdAt: order.createdAt, // preserve original order timestamp
      },
    });

    return NextResponse.json({ message: 'synced', sale });
  } catch (error) {
    console.error('POST /api/sales/sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BULK BACKFILL — call once to populate Sale from all existing Orders
// GET /api/sales/sync
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request) {
  try {
    // Admin only check via query param secret (simple guard for one-time use)
    const { searchParams } = new URL(request.url);
    if (searchParams.get('secret') !== process.env.SYNC_SECRET) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const orders = await prisma.order.findMany({
      select: { id: true, storeId: true, total: true, createdAt: true },
    });

    // Find already-synced referenceIds to skip
    const existingRefs = await prisma.sale
      .findMany({ select: { referenceId: true } })
      .then((s) => new Set(s.map((x) => x.referenceId)));

    const toCreate = orders
      .filter((o) => !existingRefs.has(o.id))
      .map((o) => ({
        storeId: o.storeId,
        amount: o.total,
        source: 'ORDER',
        referenceId: o.id,
        createdAt: o.createdAt,
      }));

    if (toCreate.length === 0) {
      return NextResponse.json({ message: 'all orders already synced', created: 0 });
    }

    const result = await prisma.sale.createMany({ data: toCreate, skipDuplicates: true });
    return NextResponse.json({ message: 'backfill complete', created: result.count });
  } catch (error) {
    console.error('GET /api/sales/sync error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}