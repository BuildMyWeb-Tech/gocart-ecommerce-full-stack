// C:\Users\Siddharathan\Desktop\gocart-ecommerce-full-stack\app\api\store\is-seller\route.js
import prisma from '@/lib/prisma';
import authSeller from '@/middlewares/authSeller';
import { getAuth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { userId } = getAuth(request);

    if (!userId) {
      return NextResponse.json({ isSeller: false }, { status: 401 });
    }

    const storeId = await authSeller(userId);

    if (!storeId) {
      return NextResponse.json({ isSeller: false });
    }

    const store = await prisma.store.findUnique({ where: { id: storeId } });

    return NextResponse.json({ isSeller: true, store });
  } catch (error) {
    console.error('GET /api/store/is-seller error:', error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
