// app/api/employee/list/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuth } from '@clerk/nextjs/server';
import authSeller from '@/middlewares/authSeller';

// GET /api/employee/list — Store owner only
export async function GET(request) {
  try {
    const { userId } = getAuth(request);
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const storeId = await authSeller(userId);
    if (!storeId) {
      return NextResponse.json(
        { error: 'Only store owners can view employees' },
        { status: 403 }
      );
    }

    const employees = await prisma.employee.findMany({
      where: { storeId },
      select: {
        id: true,
        name: true,
        email: true,
        permissions: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('GET /api/employee/list error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}