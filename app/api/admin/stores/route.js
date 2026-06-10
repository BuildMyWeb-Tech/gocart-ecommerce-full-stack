// C:\Users\Siddharathan\Desktop\gocart-ecommerce-full-stack\app\api\admin\stores\route.js
import prisma from '@/lib/prisma';
import authAdmin from '@/middlewares/authAdmin';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// GET /api/admin/stores — Get all stores with optional status filter
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    const isAdminUser = await authAdmin(userId);
    if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status'); // PENDING | ACTIVE | INACTIVE | REJECTED | ALL

    const whereClause = statusFilter && statusFilter !== 'ALL'
      ? { status: statusFilter }
      : {};

    const stores = await prisma.store.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        commission: { select: { percentage: true } },
        _count: {
          select: {
            products: true,
            orders: true,
            employees: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ stores });
  } catch (error) {
    console.error('GET /api/admin/stores error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

// PATCH /api/admin/stores — Update commission for a store
export async function PATCH(request) {
  try {
    const { userId } = getAuth(request);
    const isAdminUser = await authAdmin(userId);
    if (!isAdminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { storeId, commissionPercentage } = await request.json();

    if (!storeId) return NextResponse.json({ error: 'storeId is required' }, { status: 400 });
    if (commissionPercentage === undefined || isNaN(Number(commissionPercentage))) {
      return NextResponse.json({ error: 'Valid commissionPercentage is required' }, { status: 400 });
    }
    if (Number(commissionPercentage) < 0 || Number(commissionPercentage) > 100) {
      return NextResponse.json({ error: 'Commission must be between 0 and 100' }, { status: 400 });
    }

    const commission = await prisma.commission.upsert({
      where: { storeId },
      update: { percentage: Number(commissionPercentage) },
      create: { storeId, percentage: Number(commissionPercentage) },
    });

    return NextResponse.json({ message: 'Commission updated successfully', commission });
  } catch (error) {
    console.error('PATCH /api/admin/stores error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}